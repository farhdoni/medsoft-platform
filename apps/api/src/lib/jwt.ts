import { SignJWT, jwtVerify, importPKCS8, importSPKI, generateKeyPair } from 'jose';
import { env } from '../env.js';

let privateKey: Awaited<ReturnType<typeof importPKCS8>>;
let publicKey: Awaited<ReturnType<typeof importSPKI>>;

export async function initJwt() {
  const privateKeyPem = Buffer.from(env.JWT_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
  const publicKeyPem = Buffer.from(env.JWT_PUBLIC_KEY_BASE64, 'base64').toString('utf-8');
  privateKey = await importPKCS8(privateKeyPem, 'ES256');
  publicKey = await importSPKI(publicKeyPem, 'ES256');
}

export async function signAccessToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(privateKey);
}

export async function signRefreshToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .sign(privateKey);
}

export async function signTempToken(payload: Record<string, unknown>, expiresIn = '10m') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(privateKey);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, publicKey);
  return payload;
}
