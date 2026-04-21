import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import bcrypt from 'bcrypt';
import { env } from '../env';

export function generateTotpSecret() {
  return speakeasy.generateSecret({
    name: `${env.TOTP_ISSUER} (${env.TOTP_LABEL})`,
    issuer: env.TOTP_ISSUER,
  });
}

export async function generateQrDataUrl(otpauthUrl: string): Promise<string> {
  return qrcode.toDataURL(otpauthUrl);
}

export function verifyTotpCode(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
}

export async function generateBackupCodes(): Promise<{ plain: string[]; hashed: string[] }> {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    plain.push(code);
    hashed.push(await bcrypt.hash(code, 12));
  }
  return { plain, hashed };
}

export async function verifyBackupCode(plain: string, hashes: string[]): Promise<number> {
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(plain, hashes[i])) return i;
  }
  return -1;
}
