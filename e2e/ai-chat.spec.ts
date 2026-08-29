/**
 * Шаги S…V — /ai-chat после унификации композера.
 *
 * Файл отдельный от av-chat.spec.ts, но живёт в том же прогоне и делит с ним
 * воркерную сессию: логин и контекст приходят из фикстур. Проверяется ровно
 * то, что чинилось, — навбар, единый композер, эмодзи, честные тосты и то,
 * что отправка текста при этом не отвалилась.
 */
import type { Page } from '@playwright/test';
import { test, check, shot, LOCALE } from './fixtures';

const aiChatUrl = () => `/${LOCALE}/ai-chat`;

async function visible(locator: ReturnType<Page['locator']>, ms = 8000): Promise<boolean> {
  try {
    await locator.first().waitFor({ state: 'visible', timeout: ms });
    return true;
  } catch {
    return false;
  }
}

async function openAiChat(page: Page) {
  if (!new URL(page.url()).pathname.endsWith('/ai-chat')) {
    await page.goto(aiChatUrl());
  }
  await page.waitForSelector('[data-testid="chat-composer"]', { timeout: 20_000 });
}

// ─── S. Навбар не налезает на переписку ───────────────────────────────────────

test('S — на /ai-chat нет плавающего навбара, композер владеет низом', async ({ app }) => {
  await openAiChat(app);

  // Тот же признак, по которому навбар опознаётся в треде мессенджера.
  const navCount = await app.locator('nav, [data-testid="floating-nav"]').count();
  const navVisible = navCount > 0 && (await visible(app.locator('nav').first(), 1500));

  const s1 = await shot(app, 'S-ai-chat');
  check('S', 'плавающий навбар на /ai-chat скрыт', !navVisible, [s1]);

  // Композер должен быть самым нижним видимым блоком: если навбар всё же
  // рисуется поверх, его прямоугольник перекроет композер снизу.
  const overlap = await app.evaluate(() => {
    const composer = document.querySelector('[data-testid="chat-composer"]');
    if (!composer) return { ok: false, reason: 'композер не найден' };
    const box = composer.getBoundingClientRect();
    // Точка внутри композера, у нижнего края: кто там сверху?
    const probe = document.elementFromPoint(box.left + box.width / 2, box.bottom - 6);
    const covered = probe !== null && !composer.contains(probe) && probe !== composer;
    return { ok: !covered, reason: covered ? `сверху ${probe?.tagName}.${(probe as HTMLElement)?.className}` : '' };
  });
  check('S', `низ композера ничем не перекрыт${overlap.reason ? ` (${overlap.reason})` : ''}`, overlap.ok, [s1]);

  // Лента переписки не должна уезжать под композер.
  const noOverlap = await app.evaluate(() => {
    const composer = document.querySelector('[data-testid="chat-composer"]');
    const scroller = document.querySelector('.overflow-y-auto');
    if (!composer || !scroller) return false;
    return scroller.getBoundingClientRect().bottom <= composer.getBoundingClientRect().top + 1;
  });
  check('S', 'лента переписки заканчивается над композером', noOverlap, [s1]);
});

// ─── T. Композер такой же, как в мессенджере ──────────────────────────────────

test('T — композер AI-чата совпадает с композером мессенджера', async ({ app }) => {
  await openAiChat(app);

  const labels = ['Прикрепить файл', 'Эмодзи, стикеры и GIF', 'Записать голосовое', 'Отправить'];
  for (const label of labels) {
    const present = await visible(app.locator(`[data-testid="chat-composer"] button[aria-label="${label}"]`), 4000);
    check('T', `в композере есть кнопка «${label}»`, present);
  }

  // Порядок слева направо — тот же, что в треде: скрепка, поле, эмодзи, микрофон, отправка.
  const order = await app.evaluate(() => {
    const root = document.querySelector('[data-testid="chat-composer"]');
    if (!root) return [];
    return Array.from(root.querySelectorAll('button, textarea')).map(
      (el) => el.getAttribute('aria-label') ?? el.tagName.toLowerCase(),
    );
  });
  check(
    'T',
    `порядок элементов: ${order.join(' → ')}`,
    JSON.stringify(order) ===
      JSON.stringify(['Прикрепить файл', 'Текст сообщения', 'Эмодзи, стикеры и GIF', 'Записать голосовое', 'Отправить']),
  );

  // Круглая градиентная кнопка отправки — тот же токен, что в мессенджере.
  const sendBg = await app.evaluate(() => {
    const btn = document.querySelector('[data-testid="chat-composer"] button[aria-label="Отправить"]');
    return btn ? getComputedStyle(btn).backgroundImage : '';
  });
  const s1 = await shot(app, 'T-composer');
  check('T', `кнопка отправки градиентная («${sendBg.slice(0, 40)}…»)`, sendBg.includes('gradient'), [s1]);

  // Все кнопки композера реально доступны пальцем на 390px.
  const reachable = await app.evaluate(() => {
    const root = document.querySelector('[data-testid="chat-composer"]');
    if (!root) return [];
    return Array.from(root.querySelectorAll('button')).map((btn) => {
      const b = btn.getBoundingClientRect();
      const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return { label: btn.getAttribute('aria-label') ?? '?', ok: btn.contains(top) || btn === top };
    });
  });
  for (const r of reachable) {
    check('T', `кнопка «${r.label}» не перекрыта на 390px`, r.ok);
  }
});

// ─── U. Эмодзи и честные тосты ────────────────────────────────────────────────

test('U — эмодзи вставляются, микрофон честно говорит «Скоро в AI-чате»', async ({ app }) => {
  await openAiChat(app);

  const input = app.locator('[data-testid="chat-composer"] textarea');
  await input.fill('');

  await app.click('[data-testid="chat-composer"] button[aria-label="Эмодзи, стикеры и GIF"]');
  const panelOpen = await visible(app.locator('text=Недавние').or(app.locator('[role="tab"]').first()), 6000);
  const s1 = await shot(app, 'U-emoji-panel');
  check('U', 'панель эмодзи открылась', panelOpen, [s1]);

  if (panelOpen) {
    // Первая же кнопка-эмодзи в сетке.
    const firstEmoji = app.locator('button').filter({ hasText: /^\p{Extended_Pictographic}$/u }).first();
    if (await visible(firstEmoji, 5000)) {
      await firstEmoji.click();
      await app.waitForTimeout(400);
      const value = await input.inputValue();
      const s2 = await shot(app, 'U-emoji-inserted');
      check('U', `эмодзи попал в поле («${value}»)`, value.length > 0, [s2]);

      // Панель остаётся открытой — подряд вставляют несколько.
      const stillOpen = await visible(app.locator('[role="tab"]').first(), 2000);
      check('U', 'после вставки панель не закрылась', stillOpen, [s2]);
    }
    await app.click('[data-testid="chat-composer"] button[aria-label="Эмодзи, стикеры и GIF"]');
  }

  await input.fill('');
  await app.click('[data-testid="chat-composer"] button[aria-label="Записать голосовое"]');
  const toast = app.locator('[role="status"]');
  const toastShown = await visible(toast, 4000);
  const toastText = toastShown ? (await toast.innerText()).trim() : '';
  const s3 = await shot(app, 'U-mic-toast');
  check('U', `микрофон отвечает тостом («${toastText}»)`, /Скоро в AI-чате/.test(toastText), [s3]);

  // И при этом ничего не записывает: строки записи быть не должно.
  const recording = await visible(app.locator('[data-testid="recording-timer"]'), 1500);
  check('U', 'запись в AI-чате не стартует', !recording, [s3]);
});

// ─── V. Отправка текста не сломалась ──────────────────────────────────────────

test('V — текст в AI-чат отправляется и попадает в ленту', async ({ app }) => {
  await openAiChat(app);

  const input = app.locator('[data-testid="chat-composer"] textarea');
  const probe = `e2e-проверка-${Date.now()}`;
  await input.fill(probe);

  const sendBtn = app.locator('[data-testid="chat-composer"] button[aria-label="Отправить"]');
  const enabled = await sendBtn.isEnabled();
  check('V', 'кнопка отправки активна при непустом тексте', enabled);

  await sendBtn.click();

  const inFeed = await visible(app.locator(`text=${probe}`), 10_000);
  const s1 = await shot(app, 'V-sent');
  check('V', 'сообщение появилось в переписке', inFeed, [s1]);

  const cleared = (await input.inputValue()) === '';
  check('V', 'поле очистилось после отправки', cleared, [s1]);

  // Ответ модели может не прийти без ключа — важно, что запрос ушёл и UI жив.
  await app.waitForTimeout(3000);
  const alive = await visible(app.locator('[data-testid="chat-composer"]'), 3000);
  const s2 = await shot(app, 'V-after-send');
  check('V', 'экран жив после отправки', alive, [s2]);
});
