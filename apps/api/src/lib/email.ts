import { env } from '../env.js';
import { logger } from './logger.js';

export async function sendMagicLink(email: string, token: string) {
  const url = `${env.ADMIN_URL}/auth/verify?token=${token}`;

  if (env.EMAIL_PROVIDER === 'mock') {
    logger.info({ email, magicLinkUrl: url }, '[MOCK EMAIL] Magic link');
    return;
  }

  // TODO: implement real SMTP
  throw new Error('SMTP not implemented');
}
