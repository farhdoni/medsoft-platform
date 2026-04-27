import speakeasy from 'speakeasy';

export function generateTotpSecret(email: string) {
  return speakeasy.generateSecret({
    name: `MedSoft Admin (${email})`,
    length: 32,
  });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });
}

export function getTotpUri(secret: speakeasy.GeneratedSecret): string {
  return secret.otpauth_url ?? '';
}
