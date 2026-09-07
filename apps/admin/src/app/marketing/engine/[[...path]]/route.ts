import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Лимит размера тела запроса (поддержка загрузки видео до 1024 МБ)
export const maxDuration = 600;

const MARKETING_ENGINE_URL = (process.env.MARKETING_ENGINE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const API_BASE = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/v1\/?$/, '');

// Тот же потолок, что и в nginx (client_max_body_size) и в php-ini/uploads.ini движка —
// не технический лимит самого движка (у него 1024M), а измеренный безопасный потолок
// буферизации тела запроса целиком в памяти этого хендлера (req.arrayBuffer(), см. ниже):
// на проде 50/100/200 МБ дали пик памяти контейнера админки 223/371/668 МиБ (линейно,
// ~2.8× от размера файла) — 300M оставляет большой запас от доступной памяти хоста.
const MAX_BUFFERED_BODY_BYTES = 300 * 1024 * 1024;

async function getOperator(token: string) {
  try {
    const res = await fetch(`${API_BASE}/v1/auth/me`, {
      headers: {
        Cookie: `access_token=${token}`,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to verify operator in admin auth API:', err);
    return null;
  }
}

function render403Html(): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>403 — Доступ запрещён | MedSoft</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #090d16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 40px;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 12px 0;
      color: #f1f5f9;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .btn {
      display: inline-block;
      background: #0284c7;
      color: #ffffff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 20px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #0369a1;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🛡️</div>
    <h1>403 — Доступ запрещён</h1>
    <p>У вас нет права доступа к разделу «Маркетинг» → «Движок». Обратитесь к главному администратору клиники для назначения прав.</p>
    <a href="/dashboard" class="btn">Вернуться в Панель управления</a>
  </div>
</body>
</html>`;
}

// Относительный Location, не new URL('/auth/login', req.url): за nginx (прод) этот Route
// Handler видит req.url через собственный адрес контейнера (например
// https://<container-id>:3000/...), а не публичный домен — nginx пробрасывает Host корректно,
// но Next.js в Node.js-рантайме его не использует при сборке req.url. middleware.ts этой
// проблемы не имеет (Edge-рантайм строит редирект иначе) — относительный Location у него уже
// работает, здесь тот же приём.
function redirectToLogin(from: string): Response {
  return new Response(null, {
    status: 307,
    headers: { Location: `/auth/login?from=${encodeURIComponent(from)}` },
  });
}

async function handleProxy(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname; // e.g. /marketing/engine or /marketing/engine/campaigns or /marketing/engine/public-media/...
  const search = url.search || '';
  const method = req.method;

  // ─── 1. Исключение: Публичные медиафайлы (/marketing/engine/public-media/*) ─
  // Доступны без сессии роботам соцсетей (Meta facebookexternalhit) строго для GET и HEAD
  const isPublicMedia = pathname.startsWith('/marketing/engine/public-media/') && (method === 'GET' || method === 'HEAD');

  if (isPublicMedia) {
    const targetUrl = `${MARKETING_ENGINE_URL}${pathname}${search}`;
    const fwdHeaders: HeadersInit = {};

    const accept = req.headers.get('accept');
    if (accept) fwdHeaders['Accept'] = accept;

    const range = req.headers.get('range');
    if (range) fwdHeaders['Range'] = range;

    const userAgent = req.headers.get('user-agent');
    if (userAgent) fwdHeaders['User-Agent'] = userAgent;

    try {
      const engineRes = await fetch(targetUrl, {
        method,
        headers: fwdHeaders,
        cache: 'no-store',
      });

      const resHeaders = new Headers();
      const headersToCopy = [
        'content-type',
        'content-length',
        'accept-ranges',
        'content-range',
        'cache-control',
        'last-modified',
        'etag',
        'access-control-allow-origin',
      ];

      for (const h of headersToCopy) {
        const val = engineRes.headers.get(h);
        if (val) resHeaders.set(h, val);
      }

      return new Response(engineRes.body, {
        status: engineRes.status,
        statusText: engineRes.statusText,
        headers: resHeaders,
      });
    } catch (err) {
      console.error('Public media proxy error:', err);
      return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }
  }

  // ─── 2. Проверка сессии и прав оператора для всех остальных путей ───────────
  const token = req.cookies.get('access_token')?.value || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const isHtmlRequest = req.headers.get('accept')?.includes('text/html');

  if (!token) {
    return redirectToLogin(pathname + search);
  }

  const operator = await getOperator(token);
  if (!operator || operator.isActive === false) {
    return redirectToLogin(pathname + search);
  }

  // Движок публикует наружу — это управление, не чтение. Единственное право
  // в словаре, которое сюда пускает: 'marketing:manage' (см. apps/api/src/lib/rbac.ts).
  const isSuperadmin = operator.role === 'superadmin';
  const hasEngineRight = isSuperadmin || operator.rights?.includes('marketing:manage');

  if (!hasEngineRight) {
    if (isHtmlRequest) {
      return new Response(render403Html(), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ─── 3. Проксирование к маркетинговому движку ──────────────────────────────
  const targetUrl = `${MARKETING_ENGINE_URL}${pathname}${search}`;
  // Значение X-Operator-Name может содержать кириллицу (ФИО оператора) — HTTP-заголовки
  // требуют ByteString (0-255), поэтому percent-encode перед отправкой, engine делает urldecode().
  const fwdHeaders: Record<string, string> = {
    'X-Operator-Id': String(operator.id),
    'X-Operator-Name': encodeURIComponent(String(operator.fullName || operator.name || 'Оператор MedSoft')),
    'X-Operator-Role': String(operator.role || 'operator'),
  };

  const passThroughHeaders = [
    'accept',
    'accept-language',
    'content-type',
    'range',
    'user-agent',
    'x-forwarded-for',
    'x-forwarded-proto',
    'x-forwarded-host',
  ];

  for (const h of passThroughHeaders) {
    const val = req.headers.get(h);
    if (val) fwdHeaders[h] = val;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: fwdHeaders,
    cache: 'no-store',
  };

  // Буферизуем тело запроса вместо потоковой передачи (req.body + duplex:'half'):
  // для входящих multipart-загрузок больше ~25-30 МБ такое потоковое проксирование
  // молча обрывается — апстрим (движок) получает и обрабатывает файл корректно
  // (проверено отдельным Node-скриптом и прямым curl к движку в обход этого хендлера),
  // но fetch() здесь резолвится с пустым телом ответа вместо JSON с карточкой материала.
  // Буферизация обходит эту потоковую особенность ценой памяти на время запроса —
  // приемлемо для единичных загрузок медиафайлов админ-панели, но только до
  // MAX_BUFFERED_BODY_BYTES (см. константу выше) — выше не идём даже если nginx
  // почему-то пропустил (client_max_body_size там тот же потолок, это подстраховка
  // на случай рассинхронизации конфигов, а не единственная линия обороны).
  if (method !== 'GET' && method !== 'HEAD') {
    const declaredLength = Number(req.headers.get('content-length') || 0);
    if (declaredLength > MAX_BUFFERED_BODY_BYTES) {
      return NextResponse.json(
        { status: 'error', message: `Файл больше ${MAX_BUFFERED_BODY_BYTES / (1024 * 1024)} МБ — сожмите или укоротите его.` },
        { status: 413 },
      );
    }

    const bodyBytes = await req.arrayBuffer();
    if (bodyBytes.byteLength > MAX_BUFFERED_BODY_BYTES) {
      return NextResponse.json(
        { status: 'error', message: `Файл больше ${MAX_BUFFERED_BODY_BYTES / (1024 * 1024)} МБ — сожмите или укоротите его.` },
        { status: 413 },
      );
    }
    if (bodyBytes.byteLength > 0) {
      fetchOptions.body = bodyBytes;
    }
  }

  try {
    const engineRes = await fetch(targetUrl, fetchOptions);

    const resHeaders = new Headers();
    const headersToCopy = [
      'content-type',
      'content-length',
      'accept-ranges',
      'content-range',
      'cache-control',
      'last-modified',
      'etag',
      'location',
    ];

    for (const h of headersToCopy) {
      const val = engineRes.headers.get(h);
      if (val) resHeaders.set(h, val);
    }

    return new Response(engineRes.body, {
      status: engineRes.status,
      statusText: engineRes.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    console.error('Marketing engine proxy error:', err);
    return new Response(
      `<html><body style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:40px; text-align:center;">
        <h2>Маркетинговый движок временно недоступен</h2>
        <p style="color:#94a3b8;">Не удалось связаться с внутренним сервисом маркетинга (${MARKETING_ENGINE_URL}).</p>
      </body></html>`,
      {
        status: 502,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }
}

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}

export async function PUT(req: NextRequest) {
  return handleProxy(req);
}

export async function DELETE(req: NextRequest) {
  return handleProxy(req);
}

export async function PATCH(req: NextRequest) {
  return handleProxy(req);
}

export async function HEAD(req: NextRequest) {
  return handleProxy(req);
}

export async function OPTIONS(req: NextRequest) {
  return handleProxy(req);
}
