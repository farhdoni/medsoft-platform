// Text for everything @aivita_uz_bot sends — the webhook's own replies
// (handleStart) and the auth codes/reset links dispatched through
// notify-code.ts. apps/api has no i18n framework, so a plain dictionary
// keeps all three languages in one place instead of pulling in a new
// dependency for half a dozen short strings.

export type BotLocale = 'ru' | 'uz' | 'en';

const SUPPORTED_LOCALES: readonly BotLocale[] = ['ru', 'uz', 'en'];

// Telegram's language_code and aivita_users.locale can both carry a
// region/script suffix ("uz-UZ", "en-US") — matching on the leading two
// letters is enough to tell apart the three languages this bot speaks.
function normalizeLocale(raw: string | null | undefined): BotLocale | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return SUPPORTED_LOCALES.find((l) => lower.startsWith(l)) ?? null;
}

// language_code is the Telegram client's language — always present, but
// only a guess. aivita_users.locale is an explicit in-app choice, so it
// wins whenever the account is already known (link/code/reset flows);
// language_code is all we have for the very first /start, before any
// account is resolved.
export function resolveBotLocale(
  languageCode?: string | null,
  accountLocale?: string | null,
): BotLocale {
  return normalizeLocale(accountLocale) ?? normalizeLocale(languageCode) ?? 'ru';
}

type Localized = Record<BotLocale, string>;

export const BOT_MESSAGES = {
  greeting: {
    ru: 'Привет! Это бот AIVITA. Чтобы привязать аккаунт, откройте приложение → Настройки → Привязать Telegram.',
    uz: 'Salom! Bu AIVITA boti. Akkauntni ulash uchun ilovani oching → Sozlamalar → Telegram\'ni ulash.',
    en: 'Hi! This is the AIVITA bot. To link your account, open the app → Settings → Link Telegram.',
  },
  invalidToken: {
    ru: 'Ссылка устарела или недействительна. Сгенерируйте новую в приложении AIVITA → Настройки.',
    uz: 'Havola eskirgan yoki yaroqsiz. AIVITA ilovasida → Sozlamalar bo\'limida yangisini yarating.',
    en: 'This link has expired or is invalid. Generate a new one in the AIVITA app → Settings.',
  },
  alreadyLinkedElsewhere: {
    ru: 'Этот Telegram уже привязан к другому аккаунту AIVITA.',
    uz: 'Bu Telegram allaqachon boshqa AIVITA akkauntiga ulangan.',
    en: 'This Telegram is already linked to a different AIVITA account.',
  },
  linkFailed: {
    ru: 'Не удалось привязать аккаунт — попробуйте ещё раз чуть позже.',
    uz: 'Akkauntni ulab bo\'lmadi — birozdan keyin qayta urinib ko\'ring.',
    en: 'Couldn\'t link your account — please try again in a bit.',
  },
  linked: {
    ru: '✅ Telegram привязан к аккаунту AIVITA. Теперь коды и уведомления могут приходить сюда.',
    uz: '✅ Telegram AIVITA akkauntiga ulandi. Endi kodlar va bildirishnomalar shu yerga kelishi mumkin.',
    en: '✅ Telegram is linked to your AIVITA account. Codes and notifications can now arrive here.',
  },
} satisfies Record<string, Localized>;

export function verificationCodeMessage(locale: BotLocale, code: string): string {
  const byLocale: Localized = {
    ru: `Ваш код подтверждения AIVITA: ${code}. Действителен 15 минут.`,
    uz: `AIVITA tasdiqlash kodingiz: ${code}. 15 daqiqa amal qiladi.`,
    en: `Your AIVITA verification code: ${code}. Valid for 15 minutes.`,
  };
  return byLocale[locale];
}

export function passwordResetMessage(locale: BotLocale, resetUrl: string): string {
  const byLocale: Localized = {
    ru: `Сброс пароля AIVITA: ${resetUrl}\n\nСсылка действительна 1 час. Если вы не запрашивали сброс — проигнорируйте это сообщение.`,
    uz: `AIVITA parolni tiklash: ${resetUrl}\n\nHavola 1 soat amal qiladi. Agar tiklashni so'ramagan bo'lsangiz — bu xabarni e'tiborsiz qoldiring.`,
    en: `AIVITA password reset: ${resetUrl}\n\nThe link is valid for 1 hour. If you didn't request a reset, ignore this message.`,
  };
  return byLocale[locale];
}
