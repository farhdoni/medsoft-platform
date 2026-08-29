import { test as base, expect, type BrowserContext, type Page, type APIRequestContext, request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Аккаунты из scripts/seed-av-chat.ts.
export const FARHOD = { identifier: 'farhodni@local.dev', password: 'fara2122', nickname: 'farhodni' };
export const DAVE = { identifier: 'dave_av@local.dev', password: 'dave2122', nickname: 'dave_av' };
export const ALICE = { identifier: 'alice_av@local.dev', password: 'alice2122', nickname: 'alice_av' };

export const API = 'http://localhost:3001';
export const LOCALE = 'ru';

const SHOTS_DIR = path.join(__dirname, 'screenshots');
const REPORT_DIR = path.join(__dirname, 'report');
const COUNTER_FILE = path.join(REPORT_DIR, '.shot-counters.json');
const FINDINGS_FILE = path.join(REPORT_DIR, 'findings.jsonl');

// Playwright гасит воркер после упавшего теста и поднимает новый, поэтому
// счётчики и накопленный отчёт живут в файлах, а не в памяти модуля —
// иначе перезапуск стирал бы всё, что собрано до падения.

function readCounters(): Record<string, number> {
  try {
    return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8')) as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * Скриншот шага. Имя вида `A-hub` превращается в `A-01-hub.png`: первая буква
 * задаёт шаг, номер — порядок внутри шага, так что папка читается сверху вниз
 * ровно в том порядке, в каком шли действия.
 */
export async function shot(page: Page, name: string): Promise<string> {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const step = name.split('-')[0];
  const rest = name.slice(step.length + 1) || 'shot';
  const counters = readCounters();
  counters[step] = (counters[step] ?? 0) + 1;
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(counters), 'utf8');

  const file = `${step}-${String(counters[step]).padStart(2, '0')}-${rest}.png`;
  await page.screenshot({ path: path.join(SHOTS_DIR, file) });
  return file;
}

// ─── Отчёт ────────────────────────────────────────────────────────────────────

export type Finding = { step: string; ok: boolean; note: string; shots: string[] };

/**
 * Мягкая проверка: фиксирует результат и НЕ роняет шаг.
 *
 * Прогон должен доходить до конца даже когда половина пунктов красная —
 * иначе один сломанный шаг прячет все остальные. Пишется дозаписью в JSONL,
 * чтобы пережить перезапуск воркера.
 */
export function check(step: string, note: string, ok: boolean, shots: string[] = []) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.appendFileSync(FINDINGS_FILE, JSON.stringify({ step, ok, note, shots }) + '\n', 'utf8');
  console.log(`  ${ok ? '✓' : '✗'} [${step}] ${note}`);
  return ok;
}

export function getFindings(): Finding[] {
  try {
    return fs
      .readFileSync(FINDINGS_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Finding);
  } catch {
    return [];
  }
}

/** Чистит скриншоты и отчёт. Вызывается один раз из globalSetup. */
export function resetRun() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  for (const f of fs.readdirSync(SHOTS_DIR)) {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(SHOTS_DIR, f));
  }
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  for (const f of [COUNTER_FILE, FINDINGS_FILE]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

// ─── API-клиент ───────────────────────────────────────────────────────────────

/** Логин напрямую в API: нужен там, где действие второго участника нельзя
 *  выполнить через браузер (сообщение от Алисы, попытка Дейва написать). */
export async function apiLogin(
  ctx: APIRequestContext,
  who: { identifier: string; password: string },
): Promise<{ token: string; userId: string }> {
  const res = await ctx.post(`${API}/v1/aivita/auth/login`, {
    data: { identifier: who.identifier, password: who.password },
  });
  if (!res.ok()) throw new Error(`login ${who.identifier} failed: ${res.status()} ${await res.text()}`);
  const json = (await res.json()) as { data: { apiToken: string; session: { userId: string } } };
  return { token: json.data.apiToken, userId: json.data.session.userId };
}

export function authHeaders(token: string) {
  return { 'X-Aivita-Session': token, 'Content-Type': 'application/json' };
}

// ─── Фикстуры ─────────────────────────────────────────────────────────────────

type Shared = {
  ctx: BrowserContext;
  app: Page;
  api: APIRequestContext;
  ids: {
    farhodId: string;
    aliceId: string;
    daveId: string;
    convId: string;
    farhodToken: string;
    aliceToken: string;
    daveToken: string;
  };
};

/**
 * Контекст, страница и идентификаторы живут на весь воркер: шаги A…R —
 * это одна непрерывная сессия пользователя, а не восемнадцать независимых.
 */
/** Своих тест-скоупных фикстур нет — всё живёт на воркере. */
type NoTestFixtures = Record<never, never>;

export const test = base.extend<NoTestFixtures, Shared>({
  ctx: [
    async ({ browser }, use) => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        permissions: ['microphone', 'geolocation'],
        geolocation: { latitude: 41.31, longitude: 69.28 },
        locale: 'ru-RU',
        timezoneId: 'Asia/Tashkent',
      });
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  api: [
    async ({}, use) => {
      const ctx = await request.newContext();
      await use(ctx);
      await ctx.dispose();
    },
    { scope: 'worker' },
  ],

  app: [
    async ({ ctx }, use) => {
      const page = await ctx.newPage();
      // Индикатор дев-сборки Next висит в левом нижнем углу — ровно поверх
      // скрепки и кнопки эмодзи — и перехватывает клики. В проде его нет,
      // так что для прогона он просто убирается.
      await page.addInitScript(() => {
        const css = 'nextjs-portal{display:none!important;pointer-events:none!important}';
        const apply = () => {
          const style = document.createElement('style');
          style.textContent = css;
          document.head?.appendChild(style);
        };
        if (document.head) apply();
        else document.addEventListener('DOMContentLoaded', apply);
      });

      // Вход через настоящую форму, а не подсовыванием куки: сессия и её
      // куки должны появиться тем же путём, что у живого пользователя.
      await page.goto(`/${LOCALE}/sign-in`);
      await page.fill('#identifier', FARHOD.identifier);
      await page.fill('#password', FARHOD.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(home|onboarding)/, { timeout: 30_000 });
      await use(page);
      await page.close();
    },
    { scope: 'worker' },
  ],

  ids: [
    async ({ api }, use) => {
      const farhod = await apiLogin(api, FARHOD);
      const dave = await apiLogin(api, DAVE);
      const alice = await apiLogin(api, ALICE);

      const res = await api.get(`${API}/v1/aivita/messaging/conversations`, {
        headers: authHeaders(farhod.token),
      });
      const json = (await res.json()) as { data: { id: string; participant: { id: string } | null }[] };
      const conv = json.data.find((c) => c.participant?.id === alice.userId);
      if (!conv) throw new Error('диалог с alice_av не найден — прогоните seed-av-chat.ts');

      await use({
        farhodId: farhod.userId,
        aliceId: alice.userId,
        daveId: dave.userId,
        convId: conv.id,
        farhodToken: farhod.token,
        aliceToken: alice.token,
        daveToken: dave.token,
      });
    },
    { scope: 'worker' },
  ],
});

export { expect };
