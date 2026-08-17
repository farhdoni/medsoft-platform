import { createMiddleware } from 'hono/factory';
import { db } from '@medsoft/db';
import { partnerClinics } from '@medsoft/db/schema/partner-clinics';
import { eq } from 'drizzle-orm';
import { verifyPartnerApiKey } from '../lib/partner-keys.js';

// M2M auth for partner-system requests (ecosystem/v1), separate from
// requireAivitaAuth (user JWT session, cookie-based). A partner clinic
// (e.g. MedSoft) authenticates with a static API key issued via
// POST /v1/admin/partners/:code/issue-key — see routes/admin-partners.ts.
//
// Two headers, not one: X-Partner-Code identifies which partner_clinics
// row to check, X-Partner-Key is the raw secret verified against its
// bcrypt hash. generatePartnerApiKey() (partner-keys.ts) returns a bare
// random token with no embedded identifier, and bcrypt hashes aren't
// searchable — without a code to look up first, the only alternative
// would be bcrypt-comparing the key against every partner_clinics row on
// every request. Both go in headers, never query string (a key in a URL
// ends up in access logs/proxy logs/browser history — an unacceptable
// leak vector for a long-lived credential). Not Authorization: Bearer,
// to keep it visually distinct from the user-session bearer tokens
// requireAivitaAuth/requireAuth accept, so a header dump makes it obvious
// which credential is which.
//
// Both "no such partner" and "wrong key" return the same 401 body — never
// tell a caller with a bad key whether the code they guessed exists.

export type PartnerClinic = typeof partnerClinics.$inferSelect;

declare module 'hono' {
  interface ContextVariableMap {
    partnerClinic: PartnerClinic;
  }
}

export const requirePartnerAuth = createMiddleware(async (c, next) => {
  const partnerCode = c.req.header('X-Partner-Code');
  const rawKey = c.req.header('X-Partner-Key');

  if (!rawKey || !partnerCode) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const [partner] = await db.select()
    .from(partnerClinics)
    .where(eq(partnerClinics.code, partnerCode))
    .limit(1);

  // Same 401 whether the code doesn't exist, has no key issued yet, or the
  // key is wrong — don't leak which case it was.
  if (!partner || !partner.apiKeyHash || !(await verifyPartnerApiKey(rawKey, partner.apiKeyHash))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (partner.status !== 'active') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  c.set('partnerClinic', partner);
  await next();
});
