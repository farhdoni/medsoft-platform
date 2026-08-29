import { resetRun } from './fixtures';

/**
 * Один раз на прогон: чистит скриншоты и накопленный отчёт.
 *
 * Именно globalSetup, а не начало spec-файла: Playwright перезапускает воркер
 * после каждого упавшего теста, и очистка из модуля спеки стирала бы всё,
 * что собрано до падения.
 */
export default function globalSetup() {
  resetRun();
}
