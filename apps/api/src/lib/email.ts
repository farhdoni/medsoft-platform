import { env } from '../env.js';
import { appUrl } from './app-url.js';
import { logger } from './logger.js';
import type { BotLocale } from './telegram-i18n.js';

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM = 'AIVITA <noreply@aivita.uz>';

async function sendViaResend(to: string, subject: string, html: string, text: string): Promise<string> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY must be set when EMAIL_PROVIDER=smtp');
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, 'Resend API вернул ошибку при отправке письма');
    throw new Error(`Resend API error: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function sendMagicLink(email: string, token: string) {
  const url = `${env.ADMIN_URL}/auth/verify?token=${token}`;

  if (env.EMAIL_PROVIDER === 'mock') {
    logger.info({ email, magicLinkUrl: url }, '[MOCK EMAIL] Magic link');
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a2e;">Вход в Aivita Admin</h2>
  <p>Нажмите кнопку ниже, чтобы войти в панель управления. Ссылка действительна 15 минут.</p>
  <a href="${url}" style="
    display: inline-block;
    background: #4f46e5;
    color: #fff;
    text-decoration: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    margin: 16px 0;
  ">Войти в Admin Panel</a>
  <p style="color: #666; font-size: 13px;">Если вы не запрашивали вход — проигнорируйте это письмо.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #999; font-size: 12px;">Aivita · admin.aivita.uz</p>
</body>
</html>
`;

  const text = `Ссылка для входа: ${url}\n\nДействительна 15 минут. Если вы не запрашивали вход — проигнорируйте это письмо.`;

  const messageId = await sendViaResend(email, 'Ваша ссылка для входа в Aivita Admin', html, text);

  logger.info({ email, messageId }, 'Magic link email sent via Resend');
}

const VERIFICATION_CODE_TEXT: Record<BotLocale, {
  subject: (code: string) => string;
  heading: string;
  intro: string;
  note: string;
  textBody: (code: string) => string;
}> = {
  ru: {
    subject: (code) => `${code} — код подтверждения Aivita`,
    heading: 'Подтверди email',
    intro: 'Твой код подтверждения:',
    note: 'Код действителен 15 минут. Если ты не регистрировался — проигнорируй это письмо.',
    textBody: (code) => `Ваш код: ${code}\n\nДействителен 15 минут. Если ты не регистрировался — проигнорируй это письмо.`,
  },
  uz: {
    subject: (code) => `${code} — AIVITA tasdiqlash kodi`,
    heading: 'Emailni tasdiqlang',
    intro: 'Tasdiqlash kodingiz:',
    note: "Kod 15 daqiqa amal qiladi. Agar ro'yxatdan o'tmagan bo'lsangiz — bu xatni e'tiborsiz qoldiring.",
    textBody: (code) => `Kodingiz: ${code}\n\n15 daqiqa amal qiladi. Agar ro'yxatdan o'tmagan bo'lsangiz — bu xatni e'tiborsiz qoldiring.`,
  },
  en: {
    subject: (code) => `${code} — your AIVITA verification code`,
    heading: 'Verify your email',
    intro: 'Your verification code:',
    note: "This code is valid for 15 minutes. If you didn't sign up, you can ignore this email.",
    textBody: (code) => `Your code: ${code}\n\nValid for 15 minutes. If you didn't sign up, ignore this email.`,
  },
};

export async function sendVerificationCode(email: string, code: string, locale: BotLocale = 'ru') {
  if (env.EMAIL_PROVIDER === 'mock') {
    logger.info({ email, code, locale }, '[MOCK EMAIL] Verification code');
    return;
  }

  const t = VERIFICATION_CODE_TEXT[locale];

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a1a2e;">${t.heading}</h2>
  <p>${t.intro}</p>
  <div style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#e879a0;text-align:center;padding:20px 0;">${code}</div>
  <p style="color:#666;font-size:13px;">${t.note}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="color:#999;font-size:12px;">Aivita · aivita.uz</p>
</body></html>`;

  const messageId = await sendViaResend(email, t.subject(code), html, t.textBody(code));

  logger.info({ email, messageId, locale }, 'Verification code sent via Resend');
}

export async function sendPasswordReset(
  email: string,
  token: string,
  opts?: { linkUrl?: string; expiryLabel?: string; subject?: string },
) {
  const url = opts?.linkUrl ?? appUrl(`/reset-password?token=${token}`);
  const expiryLabel = opts?.expiryLabel ?? '1 час';
  const subject = opts?.subject ?? 'Сброс пароля Aivita';

  if (env.EMAIL_PROVIDER === 'mock') {
    logger.info({ email, url }, '[MOCK EMAIL] Password reset');
    return;
  }

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a1a2e;">Сброс пароля</h2>
  <p>Нажми кнопку ниже, чтобы задать новый пароль. Ссылка действительна ${expiryLabel}.</p>
  <a href="${url}" style="display:inline-block;background:#e879a0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:16px;margin:16px 0;">Сбросить пароль</a>
  <p style="color:#666;font-size:13px;">Если ты не запрашивал сброс — проигнорируй это письмо.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="color:#999;font-size:12px;">Aivita · aivita.uz</p>
</body></html>`;

  const text = `Ссылка для сброса пароля: ${url}\n\nДействительна ${expiryLabel}. Если ты не запрашивал сброс — проигнорируй это письмо.`;

  const messageId = await sendViaResend(email, subject, html, text);

  logger.info({ email, messageId }, 'Password reset email sent via Resend');
}
