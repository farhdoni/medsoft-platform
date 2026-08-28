/**
 * Полный прогон AV Chat через браузер: пункты A…R из чек-листа.
 *
 * Каждый пункт — отдельный test(), но все они делят одну сессию (см.
 * fixtures.ts) и идут строго по порядку при workers: 1. Проверки внутри
 * пункта сделаны через check() — мягкие: пункт доходит до конца и попадает в
 * отчёт целиком, а не обрывается на первом несовпадении.
 *
 * Перед прогоном:  cd apps/api && npx tsx --env-file .env scripts/seed-av-chat.ts
 * Запуск:          npx playwright test --config e2e/playwright.config.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import type { Page } from '@playwright/test';
import {
  test,
  expect,
  check,
  shot,
  getFindings,
  authHeaders,
  API,
  LOCALE,
} from './fixtures';

// ─── Мелкие помощники ─────────────────────────────────────────────────────────

const hubUrl = () => `/${LOCALE}/messenger`;
const threadUrl = (id: string) => `/${LOCALE}/messenger/${id}`;
const settingsUrl = () => `/${LOCALE}/messenger/settings`;

/**
 * Ждущая проверка видимости. `locator.isVisible()` отвечает мгновенно и не
 * даёт React дорисовать — для «появилось ли что-то после действия» нужен
 * именно expect с ожиданием.
 */
async function visible(locator: ReturnType<Page['locator']>, ms = 8000): Promise<boolean> {
  try {
    await expect(locator.first()).toBeVisible({ timeout: ms });
    return true;
  } catch {
    return false;
  }
}

/** Долгий тап: и список диалогов, и пузырь открывают меню по 450 мс удержания. */
async function longPress(page: Page, selector: string | { x: number; y: number }, ms = 700) {
  if (typeof selector === 'string') {
    const target = page.locator(selector).first();
    // Без этого мышь уезжает за пределы вьюпорта, если элемент ниже сгиба,
    // и удержание приходится на пустое место.
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error(`нет боксa у ${selector}`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    await page.mouse.move(selector.x, selector.y);
  }
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Пузырь сообщения по его тексту. */
function bubble(page: Page, text: string) {
  return page.locator('div.rounded-2xl').filter({ hasText: text }).last();
}

async function openThread(page: Page, convId: string) {
  await page.goto(threadUrl(convId));
  await page.waitForSelector('textarea[aria-label="Текст сообщения"]');
  // Баннер о приватности перекрывает верх ленты — на прогоне он не нужен.
  const dismiss = page.locator('button[aria-label="Скрыть предупреждение"]');
  if (await dismiss.count()) await dismiss.click();
}

async function sendText(page: Page, text: string) {
  await page.fill('textarea[aria-label="Текст сообщения"]', text);
  await page.click('button[aria-label="Отправить"]');
  await expect(page.getByText(text, { exact: false }).last()).toBeVisible();
}

/** Значение CSS-переменной или свойства на элементе. */
async function cssOf(page: Page, selector: string, prop: string): Promise<string> {
  return page.locator(selector).first().evaluate(
    (el, p) => getComputedStyle(el).getPropertyValue(p).trim(),
    prop,
  );
}

// ─── A. Хаб ───────────────────────────────────────────────────────────────────

test('A — хаб «Центр общения» открывается центральной кнопкой навбара', async ({ app }) => {
  await app.goto(`/${LOCALE}/home`);
  const fab = app.locator('button[aria-label="Центр общения"]');
  await expect(fab).toBeVisible();
  await fab.click();
  await app.waitForURL(/\/messenger$/, { timeout: 20_000 });

  const s = await shot(app, 'A-hub');
  check('A', 'центральная кнопка навбара ведёт на /messenger', /\/messenger$/.test(new URL(app.url()).pathname), [s]);
  check('A', 'заголовок «Центр общения»', await visible(app.getByRole('heading', { name: 'Центр общения' })), [s]);
  check('A', 'пилюля @farhodni', await visible(app.getByText('@farhodni', { exact: true })), [s]);

  for (const label of ['AI', 'Люди', 'Помощь']) {
    check('A', `сегмент «${label}»`, await visible(app.getByRole('tab', { name: label, exact: true })), [s]);
  }
});

// ─── B. Поиск ─────────────────────────────────────────────────────────────────

test('B — поиск находит по точному @нику и молчит на частичном', async ({ app }) => {
  await app.goto(hubUrl());
  const input = app.locator('input[aria-label="Поиск по имени или ID"]');

  await input.fill('@bob_av');
  await input.press('Enter');
  await expect(app.getByRole('button', { name: 'Написать' })).toBeVisible();
  const s1 = await shot(app, 'B-search-found');
  check('B', '@bob_av → карточка с кнопкой «Написать»', true, [s1]);
  check('B', 'в карточке виден ник @bob_av', await visible(app.getByText('@bob_av')), [s1]);

  await input.fill('bob');
  await input.press('Enter');
  await expect(app.getByText('Никого не нашли.')).toBeVisible();
  const s2 = await shot(app, 'B-search-miss');
  check('B', 'частичное «bob» → «Никого не нашли»', true, [s2]);

  await input.fill('');
});

// ─── C. Тред ──────────────────────────────────────────────────────────────────

test('C — тред открывается, лента прижата к низу, unread снимается', async ({ app, ids }) => {
  await app.goto(hubUrl());
  // Бейдж непрочитанного на центральной кнопке — до открытия треда.
  // Бейдж рисуется после ответа /messaging/conversations, поэтому проверка
  // именно ждущая: мгновенный isVisible() успевал бы до отрисовки.
  const badge = app.locator('button[aria-label="Центр общения"] span').filter({ hasText: /^\d\+?$/ });
  const hadBadge = await visible(badge, 15_000);
  const s0 = await shot(app, 'C-unread-badge-before');
  check('C', 'бейдж непрочитанного на FAB до открытия', hadBadge, [s0]);

  await app.locator('button', { hasText: 'Alice' }).first().click();
  await app.waitForURL(/\/messenger\/[0-9a-f-]{36}$/);
  await app.waitForSelector('textarea[aria-label="Текст сообщения"]');
  await app.waitForTimeout(600);

  const s1 = await shot(app, 'C-thread-open');
  check('C', 'открылся тред с Алисой', app.url().includes(ids.convId), [s1]);

  // Лента прижата к низу: последнее сообщение видно, скролл в самом низу.
  const atBottom = await app.evaluate(() => {
    const el = document.querySelector('div.flex-1.overflow-y-auto');
    if (!el) return false;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 8;
  });
  check('C', 'лента прижата к низу / автоскролл к последнему', atBottom, [s1]);
  check(
    'C',
    'последнее сообщение Алисы видно',
    await visible(app.getByText('Кстати, ты уже пробовал стикеры и гифки?')),
    [s1],
  );

  // Возврат в хаб: бейдж должен пропасть.
  await app.locator('button[aria-label="Назад"]').click();
  await app.waitForURL(/\/messenger$/);
  await app.waitForTimeout(1500);
  const badgeAfter = app.locator('button[aria-label="Центр общения"] span').filter({ hasText: /^\d\+?$/ });
  const s2 = await shot(app, 'C-unread-badge-after');
  check('C', 'бейдж исчез после открытия треда', (await badgeAfter.count()) === 0, [s2]);
});

// ─── D. Отправка ──────────────────────────────────────────────────────────────

test('D — отправка кнопкой и Enter-ом, «Enter отправляет» выключается', async ({ app, ids }) => {
  await openThread(app, ids.convId);

  const byButton = `Кнопкой ${Date.now() % 100000}`;
  await sendText(app, byButton);
  const s1 = await shot(app, 'D-send-button');
  check('D', 'отправка кнопкой', await visible(app.getByText(byButton)), [s1]);

  const byEnter = `Энтером ${Date.now() % 100000}`;
  const ta = app.locator('textarea[aria-label="Текст сообщения"]');
  await ta.fill(byEnter);
  await ta.press('Enter');
  await expect(app.getByText(byEnter)).toBeVisible();
  const s2 = await shot(app, 'D-send-enter');
  check('D', 'отправка Enter-ом', true, [s2]);

  // Выключаем «Enter отправляет».
  await app.goto(settingsUrl());
  const sw = app.locator('button[role="switch"][aria-label="Enter отправляет сообщение"]');
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  const s3 = await shot(app, 'D-enter-send-off');

  await openThread(app, ids.convId);
  const before = await app.locator('div.flex.items-end.gap-2').count();
  const ta2 = app.locator('textarea[aria-label="Текст сообщения"]');
  await ta2.fill('строка1');
  await ta2.press('Enter');
  await ta2.type('строка2');
  const value = await ta2.inputValue();
  const after = await app.locator('div.flex.items-end.gap-2').count();
  const s4 = await shot(app, 'D-enter-newline');
  check('D', 'при выключенном переключателе Enter даёт перенос строки', value.includes('\n'), [s4]);
  check('D', 'при выключенном переключателе Enter ничего не отправил', after === before, [s4]);

  await app.click('button[aria-label="Отправить"]');
  await expect(app.getByText('строка1', { exact: false }).last()).toBeVisible();
  const s5 = await shot(app, 'D-button-still-sends');
  check('D', 'кнопка отправляет и при выключенном Enter', true, [s5]);

  // Возвращаем как было.
  await app.goto(settingsUrl());
  await app.locator('button[role="switch"][aria-label="Enter отправляет сообщение"]').click();
  await expect(app.locator('button[role="switch"][aria-label="Enter отправляет сообщение"]'))
    .toHaveAttribute('aria-checked', 'true');
  check('D', '«Enter отправляет» возвращён во включённое состояние', true);
});

// ─── E. Reply ─────────────────────────────────────────────────────────────────

test('E — ответ цитатой на сообщение Алисы', async ({ app, ids }) => {
  await openThread(app, ids.convId);

  const target = 'Кстати, ты уже пробовал стикеры и гифки?';
  await bubble(app, target).scrollIntoViewIfNeeded();
  await longPress(app, `text=${target}`);

  const reply = app.getByRole('button', { name: 'Ответить' });
  const menuShown = await visible(reply, 5000);
  const s1 = await shot(app, 'E-longpress-menu');
  check('E', 'долгий тап открывает меню сообщения', menuShown, [s1]);
  if (!menuShown) return;

  await reply.click();
  const preview = app.getByText('Ответ ·', { exact: false });
  const s2 = await shot(app, 'E-reply-preview');
  check('E', 'превью ответа над композером', await visible(preview, 5000), [s2]);

  const text = `Ответ на цитату ${Date.now() % 100000}`;
  await sendText(app, text);
  await app.waitForTimeout(400);

  const quoted = bubble(app, text);
  const hasQuote = (await quoted.getByText(target.slice(0, 20), { exact: false }).count()) > 0;
  const s3 = await shot(app, 'E-quote-in-bubble');
  check('E', 'цитата отрисована внутри отправленного пузыря', hasQuote, [s3]);
});

// ─── F. Реакции ───────────────────────────────────────────────────────────────

test('F — реакция ставится, меняется и снимается', async ({ app, ids }) => {
  await openThread(app, ids.convId);

  const target = 'Привет! Отвечаю на твоё сообщение';
  await bubble(app, target).scrollIntoViewIfNeeded();

  // Пилюли считаются ТОЛЬКО у этого сообщения: на соседнем висит ❤️ от Алисы
  // из сида, и подсчёт по всей ленте давал бы ложный результат.
  const wrapper = app.locator('div.relative.max-w-\\[78\\%\\]').filter({ hasText: target }).first();
  const pills = wrapper.locator('div.absolute button');
  const pillWith = (emoji: string) => pills.filter({ hasText: emoji });

  async function react(emoji: string) {
    await longPress(app, `text=${target}`);
    const btn = app.locator(`button[aria-label="Реакция ${emoji}"]`);
    await expect(btn).toBeVisible();
    await btn.click();
    await app.waitForTimeout(700);
  }

  // На этом сообщении из сида уже стоит 🔥 от farhodni — снимаем, чтобы
  // шаг стартовал с чистого пузыря.
  if (await pillWith('🔥').count()) {
    await pillWith('🔥').first().click();
    await app.waitForTimeout(700);
  }

  await react('👍');
  const s1 = await shot(app, 'F-reaction-thumbs');
  check('F', 'реакция 👍 поставлена', (await pillWith('👍').count()) > 0, [s1]);

  // Пилюля должна перекрывать пузырь снизу, а не висеть под ним.
  const pill = await pillWith('👍').first().boundingBox().catch(() => null);
  const bub = await wrapper.boundingBox();
  const overlaps = !!pill && !!bub && pill.y < bub.y + bub.height && pill.y + pill.height > bub.y + bub.height - 24;
  check('F', 'пилюля реакции перекрывает нижний край пузыря', overlaps, [s1]);

  await react('❤️');
  const s2 = await shot(app, 'F-reaction-heart');
  check('F', 'реакция сменилась на ❤️', (await pillWith('❤️').count()) > 0, [s2]);
  check('F', 'предыдущая 👍 снята (одна реакция на пользователя)',
    (await pillWith('👍').count()) === 0, [s2]);

  await react('❤️');
  const s3 = await shot(app, 'F-reaction-removed');
  check('F', 'повторный выбор ❤️ снимает реакцию', (await pillWith('❤️').count()) === 0, [s3]);
});

// ─── G. Эмодзи-панель ─────────────────────────────────────────────────────────

test('G — эмодзи вставляются в позицию курсора, поиск работает', async ({ app, ids }) => {
  await openThread(app, ids.convId);

  const ta = app.locator('textarea[aria-label="Текст сообщения"]');
  await ta.click();
  await ta.fill('АБ');
  // Курсор между А и Б.
  await ta.press('End');
  await ta.press('ArrowLeft');

  await app.click('button[aria-label="Эмодзи, стикеры и GIF"]');
  await expect(app.getByRole('tab', { name: /Эмодзи/ })).toBeVisible();
  const s1 = await shot(app, 'G-emoji-panel');
  check('G', 'панель эмодзи открылась', true, [s1]);

  // По символу, а не по индексу: после первого клика сверху вырастает ряд
  // «Часто используемые» и вся сетка съезжает — nth(i) указывает уже не туда.
  for (const emoji of ['😀', '😂', '😍']) {
    await app.locator('div.grid.grid-cols-8 button').filter({ hasText: emoji }).first().click();
    await app.waitForTimeout(300);
  }
  const draft = await ta.inputValue();
  const s2 = await shot(app, 'G-emoji-inserted');
  check('G', '3 эмодзи вставлены', [...draft].length >= 5, [s2]);
  check('G', 'вставка ушла в позицию курсора (между А и Б)',
    draft.startsWith('А') && draft.endsWith('Б') && draft !== 'АБ', [s2]);

  await app.fill('input[aria-label="Поиск эмодзи"]', 'сердце');
  await app.waitForTimeout(400);
  const results = app.locator('div.grid.grid-cols-8 button');
  const found = await results.count();
  const s3 = await shot(app, 'G-emoji-search');
  check('G', 'поиск «сердце» даёт результаты', found > 0, [s3]);
  if (found > 0) await results.first().click();

  await app.click('button[aria-label="Отправить"]');
  await app.waitForTimeout(700);
  const s4 = await shot(app, 'G-emoji-sent');
  check('G', 'сообщение с эмодзи отправлено', (await ta.inputValue()) === '', [s4]);
});

// ─── H. Стикеры ───────────────────────────────────────────────────────────────

test('H — стикер отправляется и рендерится без пузыря', async ({ app, ids }) => {
  await openThread(app, ids.convId);
  await app.click('button[aria-label="Эмодзи, стикеры и GIF"]');
  await app.getByRole('tab', { name: /Стикеры/ }).click();
  await app.waitForTimeout(500);

  const tiles = app.locator('div.grid.grid-cols-4 button');
  const s1 = await shot(app, 'H-sticker-tab');
  check('H', 'вкладка стикеров показывает пак', (await tiles.count()) > 0, [s1]);
  if ((await tiles.count()) === 0) return;

  await tiles.first().click();
  const sent = app.locator('img[alt="Стикер"]').last();
  await expect(sent).toBeVisible({ timeout: 15_000 });
  await app.waitForTimeout(400);

  const box = await sent.boundingBox();
  const s2 = await shot(app, 'H-sticker-sent');
  check('H', 'стикер отправлен и виден в ленте', true, [s2]);
  check('H', 'стикер ~128px', !!box && Math.abs(box.width - 128) < 8 && Math.abs(box.height - 128) < 8, [s2]);

  // Без пузыря: у стикера нет предка с фоном исходящего пузыря.
  const bare = await sent.evaluate((el) => {
    let n: HTMLElement | null = el.parentElement;
    for (let i = 0; i < 4 && n; i++, n = n.parentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return false;
    }
    return true;
  });
  check('H', 'стикер отрисован без пузыря', bare, [s2]);
});

// ─── I. GIF ───────────────────────────────────────────────────────────────────

test('I — GIF: тренды, поиск, отправка, автопроигрывание и автозагрузка', async ({ app, ids }) => {
  await openThread(app, ids.convId);
  await app.click('button[aria-label="Эмодзи, стикеры и GIF"]');
  await app.getByRole('tab', { name: 'GIF', exact: true }).click();

  const gifGrid = app.locator('div.grid.grid-cols-3 button');
  await expect(gifGrid.first()).toBeVisible({ timeout: 30_000 });
  const s1 = await shot(app, 'I-gif-trending');
  check('I', 'тренды GIF пришли (провайдер настроен)', (await gifGrid.count()) > 0, [s1]);
  check('I', 'подпись провайдера на месте', await visible(app.getByText(/Powered by/i)), [s1]);

  await app.fill('input[aria-label="Поиск GIF"]', 'привет');
  await app.waitForTimeout(2000);
  await expect(gifGrid.first()).toBeVisible({ timeout: 30_000 });
  const s2 = await shot(app, 'I-gif-search');
  check('I', 'поиск «привет» вернул результаты', (await gifGrid.count()) > 0, [s2]);

  await gifGrid.first().click();
  const gifBadge = app.getByText('GIF', { exact: true }).last();
  await expect(gifBadge).toBeVisible({ timeout: 25_000 });
  await app.waitForTimeout(1500);
  const s3 = await shot(app, 'I-gif-sent');
  check('I', 'гифка в ленте с бейджем GIF', true, [s3]);

  /** src последней картинки в ленте — по нему видно, играет гифка или стоит. */
  const lastImgSrc = () =>
    app.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img')).filter((i) => i.alt === '');
      return imgs.length ? imgs[imgs.length - 1].getAttribute('src') ?? '' : '';
    });
  const srcPlaying = await lastImgSrc();

  // Автопроигрывание GIF выключено → стоп-кадр с кнопкой play.
  await app.goto(settingsUrl());
  await app.locator('button[role="switch"][aria-label="Автопроигрывание GIF"]').click();
  await expect(app.locator('button[role="switch"][aria-label="Автопроигрывание GIF"]'))
    .toHaveAttribute('aria-checked', 'false');
  await openThread(app, ids.convId);
  await app.waitForTimeout(1200);

  // Кадр статический: src переключился с анимации на превью.
  const srcPaused = await lastImgSrc();
  const playOverlay = await app.locator('span.rounded-full svg path[d^="M7 5.5v13"]').count();
  const s4 = await shot(app, 'I-gif-paused');
  check('I', 'при выключенном автопроигрывании показан стоп-кадр, а не анимация',
    srcPaused !== '' && srcPaused !== srcPlaying, [s4]);
  check('I', 'на стоп-кадре есть кнопка play', playOverlay > 0, [s4]);

  // Автозагрузка медиа выключена → плейсхолдер, грузится по тапу.
  await app.goto(settingsUrl());
  await app.locator('button[role="switch"][aria-label="Автозагрузка медиа"]').click();
  await expect(app.locator('button[role="switch"][aria-label="Автозагрузка медиа"]'))
    .toHaveAttribute('aria-checked', 'false');
  await openThread(app, ids.convId);
  await app.waitForTimeout(1000);

  const placeholderSel = app.locator('button', { hasText: 'Нажмите, чтобы загрузить' });
  const before = await placeholderSel.count();
  const s5 = await shot(app, 'I-media-placeholder');
  check('I', 'при выключенной автозагрузке — плейсхолдер с кнопкой', before > 0, [s5]);
  if (before > 0) {
    const one = placeholderSel.last();
    await one.scrollIntoViewIfNeeded();
    await one.click();
    await app.waitForTimeout(2000);
    const after = await placeholderSel.count();
    const s6 = await shot(app, 'I-media-loaded');
    check('I', `тап по плейсхолдеру грузит медиа (было ${before}, стало ${after})`, after < before, [s6]);
  }

  // Возвращаем оба переключателя.
  await app.goto(settingsUrl());
  await app.locator('button[role="switch"][aria-label="Автопроигрывание GIF"]').click();
  await app.locator('button[role="switch"][aria-label="Автозагрузка медиа"]').click();
  await expect(app.locator('button[role="switch"][aria-label="Автопроигрывание GIF"]'))
    .toHaveAttribute('aria-checked', 'true');
  await expect(app.locator('button[role="switch"][aria-label="Автозагрузка медиа"]'))
    .toHaveAttribute('aria-checked', 'true');
  check('I', 'оба переключателя возвращены', true);
});

// ─── J. Скрепка: фото и документ ──────────────────────────────────────────────

const TMP = path.join(__dirname, 'report', 'tmp');

/**
 * PNG 240×160 — вложение должно быть настоящим файлом на диске, и достаточно
 * крупным, чтобы превью в пузыре было видно глазами на скриншоте.
 */
function makePng(): string {
  fs.mkdirSync(TMP, { recursive: true });
  const file = path.join(TMP, 'av-chat-test.png');
  const w = 240;
  const h = 160;

  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // бит на канал
  ihdr[9] = 2;   // truecolor RGB
  // Диагональная заливка: одноцветный квадрат неотличим от пустого пузыря.
  const raw: number[] = [];
  for (let y = 0; y < h; y++) {
    raw.push(0); // фильтр строки
    for (let x = 0; x < w; x++) {
      raw.push(200 - Math.floor((x / w) * 90), 120 + Math.floor((y / h) * 80), 150);
    }
  }
  const idat = zlib.deflateSync(Buffer.from(raw));

  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', idat),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
  return file;
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}

function makeTxt(): string {
  fs.mkdirSync(TMP, { recursive: true });
  const file = path.join(TMP, 'av-chat-note.txt');
  fs.writeFileSync(file, 'Тестовый документ для прогона AV Chat.\n'.repeat(20), 'utf8');
  return file;
}

test('J — вложения: PNG с полноэкранным просмотром и txt карточкой файла', async ({ app, ids }) => {
  await openThread(app, ids.convId);

  // Фото
  const png = makePng();
  const chooser1 = app.waitForEvent('filechooser');
  await app.click('button[aria-label="Прикрепить файл"]');
  await app.getByRole('button', { name: /Фото\/видео/ }).click();
  (await chooser1).setFiles(png);
  await app.waitForTimeout(3000);

  const images = app.locator('img[alt=""]');
  const s1 = await shot(app, 'J-photo-sent');
  check('J', 'PNG отправлен, в ленте превью-карточка', (await images.count()) > 0, [s1]);

  if ((await images.count()) > 0) {
    await images.last().click();
    const lightbox = app.locator('div[role="dialog"][aria-label="Просмотр изображения"]');
    const opened = await visible(lightbox, 8000);
    const s2 = await shot(app, 'J-photo-lightbox');
    check('J', 'тап открывает полноэкранный просмотр', opened, [s2]);
    if (opened) await app.locator('button[aria-label="Закрыть"]').click();
  }

  // Документ
  const txt = makeTxt();
  const chooser2 = app.waitForEvent('filechooser');
  await app.click('button[aria-label="Прикрепить файл"]');
  await app.getByRole('button', { name: /Документ/ }).click();
  (await chooser2).setFiles(txt);
  await app.waitForTimeout(3000);

  const card = app.locator('a', { hasText: 'av-chat-note.txt' }).last();
  const cardShown = await visible(card, 10_000);
  const s3 = await shot(app, 'J-file-card');
  check('J', 'txt отправлен, карточка файла с именем', cardShown, [s3]);
  if (cardShown) {
    const text = (await card.innerText()).replace(/\s+/g, ' ');
    check('J', 'на карточке виден размер файла', /(Б|КБ|МБ)/.test(text), [s3]);
  }
});

// ─── K. Микрофон ──────────────────────────────────────────────────────────────

test('K — голосовое: запись фейкового потока, отправка, плеер играет', async ({ app, ids }) => {
  await openThread(app, ids.convId);

  await app.click('button[aria-label="Записать голосовое"]');
  const started = await visible(app.getByText('Идёт запись…'), 8000);
  const s1 = await shot(app, 'K-recording');
  check('K', 'запись стартовала (фейковый микрофон)', started, [s1]);
  if (!started) return;

  // Меньше секунды считается промахом по кнопке — пишем с запасом.
  await app.waitForTimeout(3000);
  await app.click('button[aria-label="Отправить голосовое"]');
  await app.waitForTimeout(4000);

  const player = app.locator('button[aria-label="Воспроизвести"]').last();
  const hasPlayer = await visible(player, 10_000);
  const s2 = await shot(app, 'K-voice-bubble');
  check('K', 'голосовое отправлено, в пузыре плеер', hasPlayer, [s2]);
  if (!hasPlayer) {
    const notice = await app.locator('[role="status"]').innerText().catch(() => '');
    check('K', `плеера нет; тост: «${notice || 'нет'}»`, false, [s2]);
    return;
  }

  const durationText = await player.locator('xpath=../..').innerText().catch(() => '');
  check('K', `в пузыре показана длительность («${durationText.trim()}»)`, /\d:\d\d/.test(durationText), [s2]);

  await player.click();
  await app.waitForTimeout(1500);
  const playing = await app.locator('button[aria-label="Пауза"]').count();
  const progressed = await app.evaluate(() => {
    const list = Array.from(document.querySelectorAll('audio'));
    return list.some((a) => a.currentTime > 0 || !a.paused);
  });
  const s3 = await shot(app, 'K-voice-playing');
  check('K', 'воспроизведение стартовало', playing > 0 || progressed, [s3]);
});

// ─── L. Геолокация ────────────────────────────────────────────────────────────

test('L — геолокация: подтверждение координат и карточка пина', async ({ app, ids }) => {
  await openThread(app, ids.convId);

  await app.click('button[aria-label="Прикрепить файл"]');
  await app.getByRole('button', { name: /Геолокация/ }).click();

  // Карточка подтверждения — единственный блок с рамкой акцентного цвета
  // над композером; кнопка «Отправить» ищется внутри неё, иначе селектор
  // цепляет ещё и круглую кнопку отправки сообщения.
  const card = app.locator('div.flex-shrink-0.mx-3', { hasText: 'Отправить мою локацию' }).first();
  const shown = await visible(card, 15_000);
  const s1 = await shot(app, 'L-geo-confirm');
  check('L', 'карточка подтверждения локации', shown, [s1]);
  if (!shown) return;

  const coords = await card.locator('p.tabular-nums').first().innerText();
  check('L', `координаты 41.31 / 69.28 («${coords}»)`,
    coords.includes('41.31') && coords.includes('69.28'), [s1]);

  await card.getByText('Отправить', { exact: true }).click();
  await app.waitForTimeout(1500);

  const mapLink = app.locator('a[href*="maps.google.com"]').last();
  const href = await mapLink.getAttribute('href').catch(() => null);
  const s2 = await shot(app, 'L-geo-sent');
  check('L', 'в ленте карточка пина', await visible(app.getByText('Геолокация').last(), 8000), [s2]);
  check('L', `ссылка maps.google.com/?q=41.31,69.28 («${href}»)`,
    href === 'https://maps.google.com/?q=41.31,69.28', [s2]);
});

// ─── M. Удаление ──────────────────────────────────────────────────────────────

test('M — своё сообщение удаляется с подтверждением', async ({ app, ids }) => {
  await openThread(app, ids.convId);

  const text = `Удалю это ${Date.now() % 100000}`;
  await sendText(app, text);
  await app.waitForTimeout(600);

  await longPress(app, `text=${text}`);
  const del = app.getByRole('button', { name: 'Удалить', exact: true }).first();
  const menuOk = await visible(del, 5000);
  const s1 = await shot(app, 'M-delete-menu');
  check('M', 'в меню своего сообщения есть «Удалить»', menuOk, [s1]);
  if (!menuOk) return;

  await del.click();
  const confirmShown = await visible(app.getByText('Удалить сообщение?'), 5000);
  const s2 = await shot(app, 'M-delete-confirm');
  check('M', 'показано подтверждение удаления', confirmShown, [s2]);

  await app.locator('button', { hasText: 'Удалить' }).last().click();
  await app.waitForTimeout(1500);

  const tomb = app.getByText('Сообщение удалено').last();
  const tombShown = await visible(tomb, 5000);
  const s3 = await shot(app, 'M-deleted');
  check('M', '«Сообщение удалено» на месте текста', tombShown, [s3]);
  if (tombShown) {
    const style = await tomb.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { style: cs.fontStyle, opacity: cs.opacity };
    });
    check('M', `надпись курсивом и приглушённая (${style.style}, opacity ${style.opacity})`,
      style.style === 'italic' && Number(style.opacity) < 1, [s3]);
  }
  check('M', 'исходный текст пропал', (await app.getByText(text).count()) === 0, [s3]);
});

// ─── N. Тема и размер текста ──────────────────────────────────────────────────

test('N — ночная тема и размер L меняют вид треда', async ({ app, ids }) => {
  await app.goto(settingsUrl());
  await app.getByRole('button', { name: 'Ночь', exact: true }).click();
  await app.waitForTimeout(300);
  const s1 = await shot(app, 'N-settings-dark');

  await openThread(app, ids.convId);
  await app.waitForTimeout(600);

  const surface = await app.locator('div[data-av-theme]').first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      theme: el.getAttribute('data-av-theme'),
      bgVar: cs.getPropertyValue('--av-chat-bg').trim(),
      bgColor: cs.backgroundColor,
    };
  });
  const bubbleIn = await cssOf(app, 'div[data-av-theme]', '--av-bubble-in-bg');
  const s2 = await shot(app, 'N-thread-dark');
  check('N', `тема треда = dark (${surface.theme})`, surface.theme === 'dark', [s2]);
  check('N', `фон треда #1e1a28 (${surface.bgVar} / ${surface.bgColor})`,
    surface.bgVar.toLowerCase() === '#1e1a28' && surface.bgColor === 'rgb(30, 26, 40)', [s2]);
  check('N', `входящие пузыри перекрашены (${bubbleIn})`, bubbleIn.toLowerCase() === '#2a2540', [s2]);

  // Размер L.
  await app.goto(settingsUrl());
  await app.getByRole('button', { name: 'L', exact: true }).click();
  await app.waitForTimeout(300);
  await openThread(app, ids.convId);
  await app.waitForTimeout(600);
  const size = await cssOf(app, 'div[data-av-theme]', '--av-msg-size');
  const pFont = await app.locator('p.whitespace-pre-wrap').last().evaluate((el) => getComputedStyle(el).fontSize);
  const s3 = await shot(app, 'N-text-large');
  check('N', `--av-msg-size = 16px (${size})`, size === '16px', [s3]);
  check('N', `текст сообщения вырос до 16px (${pFont})`, pFont === '16px', [s3]);

  // Возвращаем День и M.
  await app.goto(settingsUrl());
  await app.getByRole('button', { name: 'День', exact: true }).click();
  await app.getByRole('button', { name: 'M', exact: true }).click();
  await app.waitForTimeout(300);
  const back = await cssOf(app, 'div[data-av-theme]', '--av-surface');
  const s4 = await shot(app, 'N-back-to-light');
  check('N', `тема возвращена в День (${back})`, back.toLowerCase() === '#f4f3ef', [s4]);
});

// ─── O. Приватность ───────────────────────────────────────────────────────────

test('O — «Только знакомые» отдаёт 403 restricted чужому', async ({ app, api, ids }) => {
  await app.goto(settingsUrl());
  const sw = app.locator('button[role="switch"][aria-label="Только знакомые могут писать"]');
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await app.waitForTimeout(600);
  const s1 = await shot(app, 'O-restrict-on');
  check('O', 'переключатель «Только знакомые» включён', true, [s1]);

  // Сервер должен подтвердить, что настройка сохранилась.
  const settings = await api.get(`${API}/v1/aivita/messaging/settings`, {
    headers: authHeaders(ids.farhodToken),
  });
  const sj = (await settings.json()) as { data: { restrictNewChats: boolean } };
  check('O', 'настройка сохранена на сервере', sj.data.restrictNewChats === true, [s1]);

  // Дейв, с которым диалога нет, пытается открыть переписку.
  const attempt = await api.post(`${API}/v1/aivita/messaging/conversations`, {
    headers: authHeaders(ids.daveToken),
    data: { userId: ids.farhodId },
  });
  const body = (await attempt.json()) as { code?: string; error?: string };
  check('O', `@dave_av получает 403 (${attempt.status()})`, attempt.status() === 403, [s1]);
  check('O', `код ответа = restricted (${body.code ?? '—'})`, body.code === 'restricted', [s1]);

  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await app.waitForTimeout(600);
  const s2 = await shot(app, 'O-restrict-off');
  check('O', 'настройка возвращена в выключенное состояние', true, [s2]);
});

// ─── P. Пин / mute / архив ────────────────────────────────────────────────────

test('P — закрепление, без звука и архив в списке диалогов', async ({ app, api, ids }) => {
  // Непрочитанное от Алисы: без него бейдж не отрисуется и «серый бейдж»
  // проверять не на чем.
  await api.post(`${API}/v1/aivita/messaging/conversations/${ids.convId}/messages`, {
    headers: authHeaders(ids.aliceToken),
    data: { content: 'Сообщение для проверки бейджа' },
  });

  await app.goto(hubUrl());
  await app.waitForTimeout(1200);

  const row = app.locator('div.relative > button').filter({ hasText: 'Alice' }).first();

  async function rowMenu(item: string) {
    await longPress(app, 'div.relative > button:has-text("Alice")');
    const menuItem = app.getByRole('menuitem', { name: item, exact: true });
    await expect(menuItem).toBeVisible({ timeout: 5000 });
    await menuItem.click();
    await app.waitForTimeout(1200);
  }

  // Закрепить
  await rowMenu('Закрепить');
  const pinIcon = app.locator('span[aria-label="Закреплён"]');
  const s1 = await shot(app, 'P-pinned');
  check('P', 'иконка закрепления появилась', (await pinIcon.count()) > 0, [s1]);
  const firstRowText = await app.locator('div.relative > button').first().innerText().catch(() => '');
  check('P', 'закреплённый диалог стоит первым', firstRowText.includes('Alice'), [s1]);

  // Без звука
  await rowMenu('Без звука');
  const muteIcon = app.locator('span[aria-label="Без звука"]');
  const s2 = await shot(app, 'P-muted');
  check('P', 'перечёркнутый динамик появился', (await muteIcon.count()) > 0, [s2]);
  const badgeBg = await row
    .locator('span.rounded-full')
    .filter({ hasText: /^\d/ })
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor)
    .catch(() => '');
  check('P', `бейдж непрочитанного стал серым (${badgeBg || 'бейджа нет'})`,
    badgeBg === 'rgb(154, 150, 168)', [s2]);

  // В архив
  await rowMenu('В архив');
  const gone = (await app.locator('div.relative > button').filter({ hasText: 'Alice' }).count()) === 0;
  const archiveRow = app.locator('button', { hasText: 'Архив' });
  const archiveShown = (await archiveRow.count()) > 0;
  const s3 = await shot(app, 'P-archived');
  check('P', 'диалог ушёл из основного списка', gone, [s3]);
  check('P', 'сверху появился ряд «Архив»', archiveShown, [s3]);

  if (archiveShown) {
    await archiveRow.first().click();
    await app.waitForTimeout(600);
    const inside = (await app.locator('div.relative > button').filter({ hasText: 'Alice' }).count()) > 0;
    const s4 = await shot(app, 'P-archive-open');
    check('P', 'внутри архива диалог виден', inside, [s4]);
  }

  // Возвращаем: из архива, звук, открепить.
  if (archiveShown) {
    await rowMenu('Из архива');
    await app.waitForTimeout(600);
  } else {
    // Ряда архива нет — вернуть можно только через API, иначе шаг Q и R
    // останутся без диалога.
    await api.put(`${API}/v1/aivita/messaging/conversations/${ids.convId}/prefs`, {
      headers: authHeaders(ids.farhodToken),
      data: { archived: false },
    });
    await app.reload();
    await app.waitForTimeout(1200);
  }
  await rowMenu('Включить звук');
  await rowMenu('Открепить');
  const s5 = await shot(app, 'P-restored');
  check('P', 'пин/mute/архив сняты', (await app.locator('span[aria-label="Закреплён"]').count()) === 0, [s5]);
});

// ─── Q. Помощь ────────────────────────────────────────────────────────────────

test('Q — вкладка «Помощь», FAQ и диалог с поддержкой', async ({ app }) => {
  await app.goto(hubUrl());
  await app.getByRole('tab', { name: 'Помощь', exact: true }).click();
  await app.waitForTimeout(400);

  const faqBtn = app.locator('button[aria-expanded]', { hasText: 'Как найти врача?' }).first();
  const s1 = await shot(app, 'Q-help-tab');
  check('Q', 'вкладка «Помощь» показывает FAQ', (await faqBtn.count()) > 0, [s1]);

  await faqBtn.click();
  await app.waitForTimeout(300);
  const expanded = await faqBtn.getAttribute('aria-expanded');
  const s2 = await shot(app, 'Q-faq-expanded');
  check('Q', 'вопрос FAQ раскрывается', expanded === 'true', [s2]);
  check('Q', 'виден текст ответа', await visible(app.getByText('Откройте раздел «Врачи»', { exact: false })), [s2]);

  await app.getByRole('button', { name: /Написать в поддержку/ }).click();
  await app.waitForURL(/\/messenger\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await app.waitForTimeout(1200);

  const s3 = await shot(app, 'Q-support-thread');
  check('Q', 'открылся тред с @aivita', await visible(app.getByText('@aivita')), [s3]);
  check('Q', 'бейдж официальности',
    (await app.locator('span[aria-label="Официальный аккаунт"]').count()) > 0, [s3]);
  check('Q', 'автоприветствие от поддержки',
    await visible(app.getByText('Здравствуйте! Опишите вопрос', { exact: false })), [s3]);
});

// ─── R. Блокировка ────────────────────────────────────────────────────────────

test('R — блокировка режет отправку и видна в настройках', async ({ app, ids }) => {
  await openThread(app, ids.convId);

  await app.locator('button[aria-label="Действия"]').click();
  await app.getByRole('menuitem', { name: 'Заблокировать' }).click();
  const blockToast = await visible(app.getByText('Пользователь заблокирован'), 5000);
  const s1 = await shot(app, 'R-blocked');
  check('R', 'тост о блокировке', blockToast, [s1]);

  const ta = app.locator('textarea[aria-label="Текст сообщения"]');
  const blockedText = `Не должно уйти ${Date.now() % 100000}`;
  await ta.fill(blockedText);
  await app.click('button[aria-label="Отправить"]');
  await app.waitForTimeout(1500);

  const notice = await app.locator('[role="status"]').innerText().catch(() => '');
  const delivered = (await app.locator('p.whitespace-pre-wrap', { hasText: blockedText }).count()) > 0;
  const s2 = await shot(app, 'R-send-rejected');
  check('R', 'сообщение не попало в ленту', !delivered, [s2]);
  check('R', `отправка отбита с сообщением («${notice.trim() || 'тоста нет'}»)`, notice.trim().length > 0, [s2]);
  check('R', 'текст отказа на русском', /[а-яА-Я]/.test(notice), [s2]);

  await app.goto(settingsUrl());
  await app.waitForTimeout(1000);
  const inList = await visible(app.getByText('@alice_av'), 8000);
  const s3 = await shot(app, 'R-block-list');
  check('R', 'Алиса в списке заблокированных', inList, [s3]);

  await app.getByRole('button', { name: 'Разблокировать' }).first().click();
  await app.waitForTimeout(1200);
  const s4 = await shot(app, 'R-unblocked');
  check('R', 'блокировка снята',
    await visible(app.getByText('Никто не заблокирован'), 8000), [s4]);
});

// ─── Отчёт ────────────────────────────────────────────────────────────────────

test.afterAll(() => {
  const rows = getFindings();
  const failed = rows.filter((r) => !r.ok);
  console.log(`\nПроверок: ${rows.length}, провалов: ${failed.length}`);
  for (const f of failed) console.log(`  FAIL [${f.step}] ${f.note}`);
});
