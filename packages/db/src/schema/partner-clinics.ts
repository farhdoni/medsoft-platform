import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ─── partner_clinics ────────────────────────────────────────────────────────
//
// ecosystem/v1 exchange module, brick 3 (brick 1: aivitaUsers.externalId,
// brick 2: identityLinks).
//
// Registry of external clinic systems (e.g. MedSoft) connected to the AIVITA
// ecosystem at the CLINIC level (not per-branch). AIVITA owns the contract;
// a row here is a partner clinic that has been onboarded to plug into it.
//
// Deliberately a NEW table, not a reuse of the legacy `clinics` table:
// `clinics` is an active, differently-scoped marketplace entity (physical
// clinic listings — doctors_count, revenue_this_month_uzs, working_hours,
// commission_percent, its own CRUD at apps/api/src/routes/clinics.ts, FK'd
// from doctors/appointments). Bolting partner-auth semantics (api key hash,
// contract version) onto that would conflate two unrelated concerns and
// couple partner auth to marketplace-listing churn. `identity_links` (brick
// 2)'s comment floated "legacy clinics" as unused for this purpose — recon
// for brick 3 found it's actually live, just for something else entirely,
// which is an even stronger reason to keep this separate.
//
// Security: `apiKeyHash` stores only a bcrypt hash of the partner's API key,
// same pattern as adminSessions.refreshTokenHash (apps/api/src/routes/auth.ts).
// The raw key is generated once, shown to the partner once, and never
// persisted — only its hash. Key issuance + the auth middleware that checks
// incoming requests against this table are the NEXT step; this brick is the
// registry + hash storage only.

export const partnerClinics = pgTable(
  'partner_clinics',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Stable partner code. This is the value identity_links.partner_code
    // now has a real FK against (see identity-links.ts).
    code: text('code').notNull(),

    name: text('name').notNull(),

    // Bcrypt hash of the partner's API key. Null until a key has been
    // issued (a partner can be registered before it's ready to connect).
    apiKeyHash: text('api_key_hash'),

    // 'pending' | 'active' | 'suspended'. Defaults to 'pending', same
    // reasoning as identity_links.status defaulting to 'quarantine': a
    // partner must never be treated as authorized just for existing in the
    // table — a row only becomes 'active' once a key has actually been
    // issued and the partner confirmed.
    status: text('status').notNull().default('pending'),

    // Which ecosystem/v1 contract revision this partner implements. Plain
    // text (not an enum) since versions aren't enumerable yet — there's
    // only 'v1' today.
    contractVersion: text('contract_version').notNull().default('v1'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Also the FK target for identity_links.partner_code — a UNIQUE
    // constraint doubles as its index, so no separate index on `code`.
    uniqueCode: unique('partner_clinics_code_unique').on(table.code),

    statusIdx: index('partner_clinics_status_idx').on(table.status),
  })
);
