/**
 * scripts/test_block_b2.ts — Валидация интеграции Маркетинга в админку (Блок Б2)
 *
 * Раздел «Маркетинг» живёт под одним префиксом /marketing/* — движок теперь на
 * /marketing/engine/*, остальные инструменты (email/push/referrals/analytics)
 * на своих /marketing/<имя>. Этот скрипт проверяет именно движок (проверки 1, 3-6
 * бьют по /marketing/engine — единственный кусок раздела, что идёт через прокси
 * и внешний PHP-процесс; email/push/referrals/analytics — обычные React-страницы
 * админки поверх apps/api/src/routes/admin/marketing.ts, у них нет отдельного
 * прокси-слоя для проверки этим скриптом).
 *
 * ВНИМАНИЕ: предыдущая версия этого скрипта вызывала middleware()/route-хендлеры
 * напрямую и подменяла global.fetch — это ничего не гоняло по сети и подделывало
 * сессии литеральными cookie-строками. Такой прогон не мог поймать ни одну из
 * двух реальных проблем, которые вскрылись при живой проверке:
 *   1. X-Operator-Name с кириллицей падал в фейковом fetch() без ByteString-валидации
 *      (реальный fetch/undici её проверяет) — proxy отдавал 502 на любого оператора
 *      с русским ФИО.
 *   2. BASE_PATH/TRUSTED_PROXIES читались движком через $_ENV, который PHP built-in
 *      сервер не заполняет из окружения ОС при стандартном variables_order=GPCS —
 *      прокси на /marketing/engine/* тихо проваливался в дефолтную страницу движка.
 *
 * Этот скрипт делает реальные HTTP-запросы к уже поднятым сервисам:
 *   - Admin (Next.js)     — http://localhost:3000
 *   - API (Hono)          — http://localhost:3001
 *   - Marketing engine    — http://127.0.0.1:8080, ОБЯЗАТЕЛЬНО с BASE_PATH=/marketing/engine
 *
 * Перед прогоном:
 *   cd apps/api && npx tsx --env-file .env src/index.ts        (порт 3001)
 *   cd apps/admin && pnpm dev                                   (порт 3000)
 *   cd ../marketing-engine-php && BASE_PATH=/marketing/engine php -S 127.0.0.1:8080 -t public public/index.php
 *
 * Нужны два реальных аккаунта в admin_users (см. B2TEST_* переменные ниже) —
 * один с marketing:manage (role=marketer — «Движок» требует именно manage,
 * публикация наружу это не чтение), один без вообще каких-либо marketing:*
 * прав (role=accountant).
 * Создать их (пароли задаются локально, не для прода):
 *   INSERT INTO admin_users (email, full_name, role, is_active, password_hash) VALUES (...);
 *   INSERT INTO admin_user_roles (user_id, role_id) VALUES (...);  -- id из admin_roles
 *
 * Запуск: npx tsx scripts/test_block_b2.ts
 */

const ADMIN_BASE = process.env.B2TEST_ADMIN_URL || 'http://localhost:3000';
const API_BASE = process.env.B2TEST_API_URL || 'http://localhost:3001';

const MARKETER_EMAIL = process.env.B2TEST_MARKETER_EMAIL || 'b2test.marketer@local.dev';
const MARKETER_PASSWORD = process.env.B2TEST_MARKETER_PASSWORD || 'B2test-Marketer-9f13';
const NOACCESS_EMAIL = process.env.B2TEST_NOACCESS_EMAIL || 'b2test.noaccess@local.dev';
const NOACCESS_PASSWORD = process.env.B2TEST_NOACCESS_PASSWORD || 'B2test-NoAccess-9f13';

// Реальный опубликованный видео-файл из очереди движка (marketing_publications.status='published').
const PUBLISHED_FILE = process.env.B2TEST_PUBLISHED_FILE || 'media_master_intro_1080x1920.mp4';
// Файл, физически лежащий в storage/media, но не привязанный ни к одной публикации/пакету.
const UNPUBLISHED_FILE = process.env.B2TEST_UNPUBLISHED_FILE || 'media_ver_0b0005dd29.mp4';

let passed = 0;
let total = 0;

function check(name: string, ok: boolean, detail: string) {
  total++;
  if (ok) {
    passed++;
    console.log(`  [OK] ${name}`);
    console.log(`       -> ${detail}`);
  } else {
    console.log(`  [FAIL] ${name}`);
    console.log(`       -> ${detail}`);
  }
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status} ${await res.text()}`);
  }
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/access_token=([^;]+)/);
  if (!match) throw new Error(`No access_token cookie in login response for ${email}`);
  return match[1];
}

async function main() {
  console.log('========================================================================');
  console.log('🔍 ТЕСТИРОВАНИЕ БЛОКА Б2: РАЗДЕЛ «МАРКЕТИНГ» В АДМИНКЕ (живые HTTP-запросы)');
  console.log('========================================================================\n');

  console.log(`Admin: ${ADMIN_BASE}  |  API: ${API_BASE}\n`);

  // ---------------------------------------------------------------------------
  // 1. Без сессии на /marketing/engine — редирект на вход админки
  // ---------------------------------------------------------------------------
  console.log('--- 1. Без сессии на /marketing/engine ---');
  const res1 = await fetch(`${ADMIN_BASE}/marketing/engine`, {
    headers: { Accept: 'text/html' },
    redirect: 'manual',
  });
  const loc1 = res1.headers.get('location') || '';
  check(
    'Редирект на /auth/login',
    res1.status >= 300 && res1.status < 400 && loc1.includes('/auth/login'),
    `HTTP ${res1.status} Location: ${loc1}`,
  );

  // ---------------------------------------------------------------------------
  // Реальный логин двух аккаунтов
  // ---------------------------------------------------------------------------
  console.log('\n--- Логин: аккаунт без права marketing и с правом marketing ---');
  const noAccessToken = await login(NOACCESS_EMAIL, NOACCESS_PASSWORD);
  const marketerToken = await login(MARKETER_EMAIL, MARKETER_PASSWORD);
  console.log(`  [OK] Оба логина прошли через реальный /v1/auth/login (реальный ES256 JWT)`);

  // ---------------------------------------------------------------------------
  // 2. С сессией без права — 403 экраном админки
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. С сессией без marketing:manage на /marketing/engine ---');
  const res2 = await fetch(`${ADMIN_BASE}/marketing/engine`, {
    headers: { Accept: 'text/html', Cookie: `access_token=${noAccessToken}` },
  });
  const body2 = await res2.text();
  check(
    'HTTP 403 с защитным экраном админки',
    res2.status === 403 && body2.includes('Доступ запрещён'),
    `HTTP ${res2.status}`,
  );

  // ---------------------------------------------------------------------------
  // 3. С marketing:manage — открывается движок, реальный оператор в разметке
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. С marketing:manage (marketer) на /marketing/engine ---');
  const res3 = await fetch(`${ADMIN_BASE}/marketing/engine`, {
    headers: { Accept: 'text/html', Cookie: `access_token=${marketerToken}` },
  });
  const body3 = await res3.text();
  check(
    'HTTP 200, движок отрисован, CURRENT_OPERATOR проброшен',
    res3.status === 200 && body3.includes('window.CURRENT_OPERATOR'),
    `HTTP ${res3.status}, CURRENT_OPERATOR присутствует: ${body3.includes('window.CURRENT_OPERATOR')}`,
  );

  // ---------------------------------------------------------------------------
  // 4. Без сессии на /marketing/engine/public-media/<опубликованный> — файл отдаётся
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Без сессии на /marketing/engine/public-media/<опубликованный> ---');
  const res4 = await fetch(`${ADMIN_BASE}/marketing/engine/public-media/${PUBLISHED_FILE}`);
  check(
    'HTTP 200, video/mp4, Accept-Ranges: bytes',
    res4.status === 200 &&
      (res4.headers.get('content-type') || '').includes('video/mp4') &&
      res4.headers.get('accept-ranges') === 'bytes',
    `HTTP ${res4.status}, Content-Type: ${res4.headers.get('content-type')}, Accept-Ranges: ${res4.headers.get('accept-ranges')}, Content-Length: ${res4.headers.get('content-length')}`,
  );
  await res4.body?.cancel();

  // ---------------------------------------------------------------------------
  // 5. Без сессии на /marketing/engine/public-media/<не из очереди> — 404
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Без сессии на /marketing/engine/public-media/<не из очереди> ---');
  const res5 = await fetch(`${ADMIN_BASE}/marketing/engine/public-media/${UNPUBLISHED_FILE}`);
  check('HTTP 404 Not Found', res5.status === 404, `HTTP ${res5.status}`);

  // ---------------------------------------------------------------------------
  // 6. Без сессии на /marketing/engine/api/... — редирект на вход, не данные
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Без сессии на /marketing/engine/api/... ---');
  const res6 = await fetch(`${ADMIN_BASE}/marketing/engine/api/reaction/snapshots`, { redirect: 'manual' });
  const loc6 = res6.headers.get('location') || '';
  check(
    'Редирект на /auth/login (не отдаёт данные)',
    res6.status >= 300 && res6.status < 400 && loc6.includes('/auth/login'),
    `HTTP ${res6.status} Location: ${loc6}`,
  );

  console.log('\n========================================================================');
  if (passed === total) {
    console.log(`🎉 ВСЕ ${passed} ИЗ ${total} ПРОВЕРОК БЛОКА Б2 ПРОЙДЕНЫ НА ЖИВЫХ СЕРВИСАХ`);
  } else {
    console.log(`❌ ${passed} ИЗ ${total} ПРОВЕРОК ПРОЙДЕНО — ЕСТЬ ПРОВАЛЫ, СМ. ВЫШЕ`);
  }
  console.log('========================================================================');

  if (passed !== total) process.exit(1);
}

main().catch((err) => {
  console.error('\n❌ Ошибка прогона Блока Б2:', err);
  process.exit(1);
});
