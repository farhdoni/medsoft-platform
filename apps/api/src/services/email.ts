import { env } from '../env';
import { logger } from '../middleware/logger';

export async function sendMagicLink(email: string, url: string): Promise<void> {
  const subject = 'MedSoft — ссылка для входа';
  const html = `<p>Нажмите на ссылку ниже для входа в MedSoft Admin Panel:</p><p><a href="${url}">${url}</a></p><p>Ссылка действительна 10 минут.</p>`;

  if (env.EMAIL_PROVIDER === 'mock') {
    logger.info({ email, url }, '[MOCK EMAIL] Magic link');
    console.log(`\n🔗 MAGIC LINK for ${email}:\n${url}\n`);
    return;
  }

  if (env.EMAIL_PROVIDER === 'resend') {
    const { Resend } = await import('resend');
    const resend = new Resend(env.RESEND_API_KEY);
    await resend.emails.send({ from: env.EMAIL_FROM, to: email, subject, html });
    return;
  }

  if (env.EMAIL_PROVIDER === 'smtp') {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    });
    await transporter.sendMail({ from: env.EMAIL_FROM, to: email, subject, html });
  }
}
