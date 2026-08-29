import type { RecorderErrorKind } from './useVoiceRecorder';

/**
 * Russian copy for a failed recording attempt, shared by /messenger and
 * /ai-chat so the same cause never gets two different explanations.
 *
 * The permission wording names the fix rather than the fault: on a denied
 * microphone the browser will not prompt again, so telling the user to press
 * the button harder is useless — they have to change the site setting.
 */
export function recorderErrorText(kind: RecorderErrorKind): string {
  switch (kind) {
    case 'permission':
      return 'Нет доступа к микрофону — разрешите в настройках браузера';
    case 'no-device':
      return 'Микрофон не найден';
    case 'unsupported':
      return 'Браузер не поддерживает запись голоса';
    case 'insecure':
      return 'Запись голоса доступна только по защищённому соединению (HTTPS)';
    default:
      return 'Не удалось записать';
  }
}
