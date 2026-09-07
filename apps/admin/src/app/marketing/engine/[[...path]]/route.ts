import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Лимит размера тела запроса (поддержка загрузки видео до 1024 МБ)
export const maxDuration = 600;

const MARKETING_ENGINE_URL = (process.env.MARKETING_ENGINE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const API_BASE = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/v1\/?$/, '');

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
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('from', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  const operator = await getOperator(token);
  if (!operator || operator.isActive === false) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('from', pathname + search);
    return NextResponse.redirect(loginUrl);
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

  const fetchOptions: RequestInit & { duplex?: string } = {
    method,
    headers: fwdHeaders,
    cache: 'no-store',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = req.body;
    fetchOptions.duplex = 'half';
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
