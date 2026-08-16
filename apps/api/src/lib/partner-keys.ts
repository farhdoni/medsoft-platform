import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

// Partner API key lifecycle for partner_clinics.api_key_hash (ecosystem/v1
// exchange module, brick 3). Same hash pattern as adminSessions.refreshTokenHash
// (apps/api/src/routes/auth.ts): a high-entropy random token, bcrypt-hashed,
// only the hash persisted. The raw key is returned exactly once at issuance
// and never stored or logged anywhere.
//
// Issuance endpoint + the auth middleware that calls verifyPartnerApiKey on
// incoming requests are the next step — this module is just the primitives.

export function generatePartnerApiKey(): string {
  return randomBytes(32).toString('hex');
}

export function hashPartnerApiKey(rawKey: string): Promise<string> {
  return bcrypt.hash(rawKey, 10);
}

export function verifyPartnerApiKey(rawKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(rawKey, hash);
}
