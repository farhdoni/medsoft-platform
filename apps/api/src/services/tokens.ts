import { SignJWT, jwtVerify, importPKCS8, importSPKI, type JWTPayload } from 'jose';
import { env } from '../env';

let privateKey: Awaited<ReturnType<typeof importPKCS8>>;
let publicKey: Awaited<ReturnType<typeof importSPKI>>;

async function getKeys() {
  if (!privateKey) {
    const pk = env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
    const pub = env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
    privateKey = await importPKCS8(pk, 'ES256');
    publicKey = await importSPKI(pub, 'ES256');
  }
  return { privateKey, publicKey };
}

export type TokenPayload = {
  sub: string;
  email: string;
  role: string;
  sessionId?: string;
  type: 'access' | 'refresh';
};

export async function signAccessToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  const { privateKey } = await getKeys();
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_ACCESS_TTL}s`)
    .sign(privateKey);
}

export async function signRefreshToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  const { privateKey } = await getKeys();
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_REFRESH_TTL}s`)
    .sign(privateKey);
}

export async function verifyToken(token: string): Promise<TokenPayload & JWTPayload> {
  const { publicKey } = await getKeys();
  const { payload } = await jwtVerify(token, publicKey);
  return payload as TokenPayload & JWTPayload;
}
