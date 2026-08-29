import { db } from '@medsoft/db';
import { aivitaUsers } from '@medsoft/db/schema/aivita';
import { identityLinks } from '@medsoft/db/schema/identity-links';
import { and, eq, inArray } from 'drizzle-orm';
import { normalizePhone, phoneRawVariants } from './phone.js';

// Identity resolver (ecosystem/v1 exchange module, brick 5 — fills the
// identity_links table that brick 2 defined). Given what a partner clinic
// tells us about one of their patients, finds or creates the AIVITA person
// that patient corresponds to.
//
// This is a plain service function, not wired to HTTP yet — no
// ecosystem/v1 route calls it. That's the next brick.
//
// Matching is ONLY ever done on a stable channel (external id, phone,
// telegram provider id) — never on name. See status/ambiguity semantics
// below for why a match can come back without a link ever being written.

export type MatchChannel = 'phone' | 'telegram' | 'external' | 'manual';

export type IdentityLink = typeof identityLinks.$inferSelect;

export interface ResolveHints {
  phone?: string | null;
  telegramUserId?: string | null;
  externalId?: string | null;
}

export type ResolveResult =
  // Exactly one AIVITA person matched (or an existing active link already
  // covered this partner_local_id) — safe to treat as this partner's
  // patient going forward.
  | { status: 'linked'; personId: string; externalId: string; matchChannel: MatchChannel; link: IdentityLink }
  // An identity_links row already exists for this partner_local_id but is
  // NOT active (e.g. created by a manual/admin flow pending review). We
  // never silently promote it to active — the caller must treat this
  // patient as unconfirmed.
  | { status: 'quarantine'; personId: string; externalId: string; link: IdentityLink }
  // Zero candidates on every stable key the partner gave us. Not an error:
  // this partner's patient simply isn't an AIVITA user (yet). No row is
  // written — see the design note below.
  | { status: 'no_match' }
  // Two or more AIVITA people matched the same stable key. Never guessed;
  // no row is written. See the design note below.
  | { status: 'ambiguous'; channel: MatchChannel; candidateCount: number };

// ── Design notes (the two SanitizedLink decisions the task called out) ────
//
// no_match writes nothing (rather than a person_id-less "pending" row):
// identity_links.person_id is NOT NULL, so there is no honest row shape for
// "no person exists yet" — inventing one would mean either making person_id
// nullable (a real schema/migration change, and it complicates both UNIQUE
// constraints, which are not designed for a NULL person_id) or pointing it
// at a placeholder person, which is worse than not writing anything. Since
// this table has no dedicated index on partner_local_id alone (only the
// UNIQUE(partner_code, partner_local_id) composite), not writing a row costs
// nothing — the next call with the same partner_local_id just re-runs the
// match, which is exactly what you want once the patient actually signs up.
//
// ambiguous ALSO writes nothing, for a mirror-image reason: identity_links
// has exactly one person_id per row, so representing "2+ candidates" would
// require either picking one arbitrarily (explicitly forbidden by the task:
// "не выбирать наугад") or writing multiple quarantine rows, one per
// candidate — but UNIQUE(person_id, partner_code) means each of those
// candidate people would then be "used up" against this partner, which
// could block the *correct* person from ever getting a real link to this
// partner later. That is the "мусор" the task asked me to avoid. The
// schema comment's "an ambiguous match is written as quarantine" reading
// is reconciled by scoping it to the 'manual' channel — an admin resolving
// an ambiguous case out-of-band picks a specific person deliberately, which
// is a real, honest single-person row. This resolver never writes 'manual'
// or 'quarantine' itself; it only ever writes 'active', because it only
// ever writes when there's exactly one honest candidate.

export async function resolvePatientLink(
  partnerCode: string,
  partnerLocalId: string,
  hints: ResolveHints,
): Promise<ResolveResult> {
  // Step 1 — idempotency. Same partner re-sending the same patient must
  // return the same link, never create a duplicate.
  const existingLink = await findLinkByPartnerLocalId(partnerCode, partnerLocalId);
  if (existingLink) {
    return toResult(existingLink);
  }

  // Step 2 — match by stable key, in priority order (most reliable first).
  // Stop at the first channel that was given a hint: 0 candidates means
  // that key didn't identify anyone, so fall through to the next, weaker
  // key; 2+ candidates means that key contradicts itself — stop right there
  // rather than let a weaker key "break the tie", which would effectively
  // be guessing.
  const channels: Array<{ channel: MatchChannel; find: () => Promise<Candidate[]> }> = [
    { channel: 'external', find: () => matchByExternalId(hints.externalId) },
    { channel: 'phone', find: () => matchByPhone(hints.phone) },
    { channel: 'telegram', find: () => matchByTelegram(hints.telegramUserId) },
  ];

  for (const { channel, find } of channels) {
    const candidates = await find();
    if (candidates.length === 0) continue;
    if (candidates.length > 1) {
      return { status: 'ambiguous', channel, candidateCount: candidates.length };
    }
    return createLink(partnerCode, partnerLocalId, candidates[0], channel);
  }

  return { status: 'no_match' };
}

// ── Matching ────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  externalId: string;
}

async function matchByExternalId(externalId?: string | null): Promise<Candidate[]> {
  if (!externalId) return [];
  return db
    .select({ id: aivitaUsers.id, externalId: aivitaUsers.externalId })
    .from(aivitaUsers)
    .where(eq(aivitaUsers.externalId, externalId));
  // aivitaUsers.externalId is UNIQUE, so this is always 0 or 1 rows —
  // never genuinely ambiguous.
}

async function matchByPhone(rawPhone?: string | null): Promise<Candidate[]> {
  const canonical = normalizePhone(rawPhone);
  if (!canonical) return [];
  const variants = phoneRawVariants(canonical);
  return db
    .select({ id: aivitaUsers.id, externalId: aivitaUsers.externalId })
    .from(aivitaUsers)
    .where(inArray(aivitaUsers.phone, variants));
  // aivitaUsers.phone is UNIQUE on the raw stored string, but two different
  // raw forms of the SAME normalized number (e.g. '+998901234567' vs
  // '998901234567') can both legally exist as separate rows — that's the
  // real, deliberate ambiguity case this resolver has to catch.
}

async function matchByTelegram(telegramUserId?: string | null): Promise<Candidate[]> {
  if (!telegramUserId) return [];
  return db
    .select({ id: aivitaUsers.id, externalId: aivitaUsers.externalId })
    .from(aivitaUsers)
    .where(and(eq(aivitaUsers.provider, 'telegram'), eq(aivitaUsers.providerUserId, telegramUserId)));
  // No unique constraint on (provider, providerUserId) — duplicate telegram
  // signups are possible, so this can genuinely return 2+ rows too.
}

// ── Link lookup / creation ─────────────────────────────────────────────

async function findLinkByPartnerLocalId(partnerCode: string, partnerLocalId: string): Promise<IdentityLink | null> {
  const [row] = await db
    .select()
    .from(identityLinks)
    .where(and(eq(identityLinks.partnerCode, partnerCode), eq(identityLinks.partnerLocalId, partnerLocalId)))
    .limit(1);
  return row ?? null;
}

async function findLinkByPerson(partnerCode: string, personId: string): Promise<IdentityLink | null> {
  const [row] = await db
    .select()
    .from(identityLinks)
    .where(and(eq(identityLinks.partnerCode, partnerCode), eq(identityLinks.personId, personId)))
    .limit(1);
  return row ?? null;
}

async function createLink(
  partnerCode: string,
  partnerLocalId: string,
  candidate: Candidate,
  matchChannel: MatchChannel,
): Promise<ResolveResult> {
  // Race safety: two concurrent resolves for the same new patient must not
  // create two rows. Rely on the table's own UNIQUE constraints + ON
  // CONFLICT DO NOTHING rather than check-then-insert (a plain SELECT then
  // INSERT has the same TOCTOU gap that bit the payment flows) — whichever
  // request's INSERT actually lands wins, the other gets 0 rows back and
  // re-reads instead of assuming it won.
  const [inserted] = await db
    .insert(identityLinks)
    .values({
      personId: candidate.id,
      partnerCode,
      partnerLocalId,
      matchChannel,
      status: 'active',
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    return { status: 'linked', personId: candidate.id, externalId: candidate.externalId, matchChannel, link: inserted };
  }

  // Lost the race under UNIQUE(partner_code, partner_local_id): someone
  // else's insert for this exact partner_local_id won first.
  const byLocalId = await findLinkByPartnerLocalId(partnerCode, partnerLocalId);
  if (byLocalId) return toResult(byLocalId);

  // Not that one — the conflict must be UNIQUE(person_id, partner_code)
  // instead: this person already has a link with this partner under a
  // DIFFERENT partner_local_id (e.g. the partner sent the same real patient
  // twice under two local record ids). The schema allows only one link per
  // (person, partner), so surface the pre-existing link rather than fail
  // silently or throw away a real match.
  const byPerson = await findLinkByPerson(partnerCode, candidate.id);
  if (byPerson) return toResult(byPerson);

  // Unreachable: onConflictDoNothing only no-ops on a real constraint
  // conflict, and these are the table's only two unique constraints.
  throw new Error('resolvePatientLink: insert conflicted but no existing row found on either unique constraint');
}

async function toResult(link: IdentityLink): Promise<ResolveResult> {
  const [person] = await db
    .select({ externalId: aivitaUsers.externalId })
    .from(aivitaUsers)
    .where(eq(aivitaUsers.id, link.personId));

  // personId is a NOT NULL FK with no delete action other than cascade, so
  // the referenced person always exists alongside the link.
  const externalId = person!.externalId;

  return link.status === 'active'
    ? { status: 'linked', personId: link.personId, externalId, matchChannel: link.matchChannel as MatchChannel, link }
    : { status: 'quarantine', personId: link.personId, externalId, link };
}
