import nodemailer from 'nodemailer';
import { env } from '../env.js';
import { logger } from './logger.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (!env.SMTP_USER || !env.SMTP_PASSWORD) {
    throw new Error('SMTP_USER and SMTP_PASSWORD must be set when EMAIL_PROVIDER=smtp');
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === 'true',  // false = STARTTLS on port 587
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  return transporter;
}

export async function sendMagicLink(email: string, token: string) {
  const url = `${env.ADMIN_URL}/auth/verify?token=${token}`;

  if (env.EMAIL_PROVIDER === 'mock') {
    logger.info({ email, magicLinkUrl: url }, '[MOCK EMAIL] Magic link');
    return;
  }

  const from = `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL ?? env.SMTP_USER}>`;

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

  const info = await getTransporter().sendMail({
    from,
    to: email,
    subject: 'Ваша ссылка для входа в Aivita Admin',
    html,
    text: `Ссылка для входа: ${url}\n\nДействительна 15 минут.`,
  });

  logger.info({ email, messageId: info.messageId }, 'Magic link email sent via SMTP');
}

export async function sendVerificationCode(email: string, code: string) {
  if (env.EMAIL_PROVIDER === 'mock') {
    logger.info({ email, code }, '[MOCK EMAIL] Verification code');
    return;
  }

  const from = `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL ?? env.SMTP_USER}>`;
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a1a2e;">Подтверди email</h2>
  <p>Твой код подтверждения:</p>
  <div style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#e879a0;text-align:center;padding:20px 0;">${code}</div>
  <p style="color:#666;font-size:13px;">Код действителен 15 минут. Если ты не регистрировался — проигнорируй это письмо.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="color:#999;font-size:12px;">Aivita · aivita.uz</p>
</body></html>`;

  const info = await getTransporter().sendMail({
    from, to: email,
    subject: `${code} — код подтверждения Aivita`,
    html,
    text: `Твой код подтверждения Aivita: ${code}\n\nДействителен 15 минут.`,
  });
  logger.info({ email, messageId: info.messageId }, 'Verification code sent');
}

export async function sendPasswordReset(email: string, token: string) {
  const url = `${env.AIVITA_URL}/ru/reset-password?token=${token}`;

  if (env.EMAIL_PROVIDER === 'mock') {
    logger.info({ email, url }, '[MOCK EMAIL] Password reset');
    return;
  }

  const from = `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL ?? env.SMTP_USER}>`;
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a1a2e;">Сброс пароля</h2>
  <p>Нажми кнопку ниже, чтобы задать новый пароль. Ссылка действительна 1 час.</p>
  <a href="${url}" style="display:inline-block;background:#e879a0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:16px;margin:16px 0;">Сбросить пароль</a>
  <p style="color:#666;font-size:13px;">Если ты не запрашивал сброс — проигнорируй это письмо.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="color:#999;font-size:12px;">Aivita · aivita.uz</p>
</body></html>`;

  const info = await getTransporter().sendMail({
    from, to: email,
    subject: 'Сброс пароля Aivita',
    html,
    text: `Ссылка для сброса пароля: ${url}\n\nДействительна 1 час.`,
  });
  logger.info({ email, messageId: info.messageId }, 'Password reset email sent');
}
