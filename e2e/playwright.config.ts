import { defineConfig } from '@playwright/test';

/**
 * Регрессионный прогон AV Chat через реальный браузер.
 *
 * Стек предполагается уже поднятым (Postgres 5432, API 3001, фронт 3005) —
 * webServer здесь намеренно нет: дев-сервер Next живёт дольше прогона, и
 * перезапускать его на каждый `playwright test` дороже, чем один раз поднять.
 *
 * Перед прогоном база приводится к известному состоянию:
 *   cd apps/api && npx tsx --env-file .env scripts/seed-av-chat.ts
 */
export default defineConfig({
  testDir: '.',
  globalSetup: './global-setup.ts',
  // Шаги A…R идут по порядку и делят один браузерный контекст: тред,
  // открытый шагом C, шаг D продолжает. Отсюда один воркер и запрет
  // параллельности внутри файла.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Хватает на загрузку GIF с CDN провайдера и на запись голосового.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: 'report/results.json' }]],
  outputDir: 'report/artifacts',

  use: {
    baseURL: 'http://localhost:3005',
    // Мобильный вид: AV Chat спроектирован под 390-точечную ширину.
    viewport: { width: 390, height: 844 },
    permissions: ['microphone', 'geolocation'],
    geolocation: { latitude: 41.31, longitude: 69.28 },
    locale: 'ru-RU',
    timezoneId: 'Asia/Tashkent',
    trace: 'retain-on-failure',
    video: 'off',
    launchOptions: {
      args: [
        // Фейковый микрофон: getUserMedia отдаёт синтетический поток и не
        // показывает системный диалог разрешения.
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },

  projects: [{ name: 'av-chat' }],
});
