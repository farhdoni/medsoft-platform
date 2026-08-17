import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { dischargeDocuments } from '@medsoft/db/schema/discharge-documents';
import { and, eq } from 'drizzle-orm';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { requirePartnerAuth } from '../../middleware/partner-auth.js';
import { resolvePatientLink } from '../../lib/identity-resolver.js';
import { hasActiveConsent } from '../../lib/consent.js';

// POST /ecosystem/v1/discharge-documents — a partner clinic (e.g. MedSoft)
// attaches a discharge document (epicrisis file the clinic already
// produced) to its own patient's AIVITA profile. v1 scope is deliberately
// just the file + bibliographic metadata — NOT structured diagnoses/lab
// results (that's v2, see task decision log).
//
// Two gates, both mandatory, checked in this order:
//   1. resolvePatientLink — same identity resolution ecosystem/v1
//      appointments already uses. Only 'linked' continues.
//   2. hasActiveConsent — the PATIENT must have already granted this
//      partner permission to attach discharge documents (scope
//      'discharge_document') through the patient's own AIVITA session.
//      This endpoint only ever CHECKS for consent — it never creates one.
//      A clinic cannot consent on a patient's behalf; that would defeat
//      the entire point of asking first.
//
// Only externalId + the internal discharge_documents id (not the internal
// personId/uuid, not the raw disk file_path) ever go back to the partner.

const CONSENT_SCOPE = 'discharge_document';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/api/src/routes/ecosystem -> apps/api/uploads/discharge (same depth
// as routes/aivita/upload.ts's UPLOADS_DIR). A dedicated subdirectory, not
// the shared chat-upload folder: uploadsServeRouter (upload.ts) serves any
// file directly under UPLOADS_DIR by name with NO auth check — a filename
// containing '/' is rejected there as 400, so that public route can never
// reach into this subdirectory. Discharge documents are patient-owned
// medical records; they must never be reachable through that route.
const UPLOADS_ROOT = path.join(__dirname, '..', '..', '..', 'uploads');
const DISCHARGE_DIR = path.join(UPLOADS_ROOT, 'discharge');

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'document';
  const cleaned = base.replace(/[^\w.\-() ]/g, '_').slice(0, 200);
  return cleaned || 'document';
}

function normalizeIssuedAt(raw: string): string | null {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function field(v: string | File | (string | File)[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  return undefined;
}

const router = new Hono();
router.use('*', requirePartnerAuth);

router.post('/', async (c) => {
  const partner = c.get('partnerClinic');

  let body: Awaited<ReturnType<typeof c.req.parseBody>>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ error: 'Invalid multipart body' }, 400);
  }

  const file = body['file'];
  if (!file || typeof file === 'string' || Array.isArray(file)) {
    return c.json({ error: 'No file provided' }, 400);
  }

  const partnerLocalId = field(body['partnerLocalId']);
  const partnerDocumentId = field(body['partnerDocumentId']);
  const issuedAtRaw = field(body['issuedAt']);
  const doctorLabel = field(body['doctorLabel']) ?? null;
  const clinicLabel = field(body['clinicLabel']) ?? null;
  const phone = field(body['phone']) ?? null;
  const telegramUserId = field(body['telegramUserId']) ?? null;
  const externalIdHint = field(body['externalId']) ?? null;

  if (!partnerLocalId || !partnerDocumentId || !issuedAtRaw) {
    return c.json({ error: 'partnerLocalId, partnerDocumentId and issuedAt are required' }, 400);
  }

  const issuedAt = normalizeIssuedAt(issuedAtRaw);
  if (!issuedAt) {
    return c.json({ error: 'Invalid issuedAt' }, 400);
  }

  const mime = file.type;
  const ext = ALLOWED_MIME_EXT[mime];
  if (!ext) {
    return c.json({ error: `File type not allowed: ${mime}` }, 400);
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength === 0) {
    return c.json({ error: 'Empty file' }, 400);
  }
  if (bytes.byteLength > MAX_BYTES) {
    return c.json({ error: 'File too large (max 10MB)' }, 400);
  }

  // ── 1. Identity resolution ────────────────────────────────────────────
  const resolved = await resolvePatientLink(partner.code, partnerLocalId, {
    phone,
    telegramUserId,
    externalId: externalIdHint,
  });

  if (resolved.status === 'no_match') {
    return c.json({
      status: 'no_match',
      message: 'Patient not linked to an AIVITA account yet — resend once identified.',
    }, 202);
  }
  if (resolved.status === 'quarantine') {
    return c.json({
      status: 'quarantine',
      message: 'Patient link exists but is not confirmed yet.',
    }, 202);
  }
  if (resolved.status === 'ambiguous') {
    return c.json({
      status: 'ambiguous',
      message: 'Multiple AIVITA accounts matched this patient — resolve manually before pushing this document.',
    }, 409);
  }

  // ── 2. Consent gate — patient-granted only, never created here ─────────
  const consented = await hasActiveConsent(resolved.personId, partner.code, CONSENT_SCOPE);
  if (!consented) {
    return c.json({
      status: 'consent_required',
      message: 'Patient has not granted this clinic consent to attach discharge documents. The patient must grant consent from their own AIVITA account first.',
    }, 403);
  }

  // ── 3. Idempotency pre-check — avoid touching disk for a known replay ──
  const [existingDoc] = await db.select()
    .from(dischargeDocuments)
    .where(and(
      eq(dischargeDocuments.partnerCode, partner.code),
      eq(dischargeDocuments.partnerDocumentId, partnerDocumentId),
    ))
    .limit(1);

  if (existingDoc) {
    if (existingDoc.personId !== resolved.personId) {
      return c.json({
        status: 'conflict',
        message: 'partnerDocumentId already used for a different patient.',
      }, 409);
    }
    return c.json({
      externalId: resolved.externalId,
      document: {
        id: existingDoc.id,
        partnerDocumentId: existingDoc.partnerDocumentId,
        issuedAt: existingDoc.issuedAt,
        fileName: existingDoc.fileName,
        mimeType: existingDoc.mimeType,
        fileSize: existingDoc.fileSize,
      },
      duplicate: true,
    }, 200);
  }

  // ── 4. Save file + insert row (race-safe via onConflictDoNothing) ──────
  if (!existsSync(DISCHARGE_DIR)) {
    await mkdir(DISCHARGE_DIR, { recursive: true });
  }

  const storageFileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const absolutePath = path.join(DISCHARGE_DIR, storageFileName);
  const relativePath = path.posix.join('discharge', storageFileName);

  await writeFile(absolutePath, Buffer.from(bytes));

  const [inserted] = await db.insert(dischargeDocuments).values({
    personId: resolved.personId,
    partnerCode: partner.code,
    partnerDocumentId,
    filePath: relativePath,
    fileName: sanitizeFileName(file.name ?? 'document'),
    mimeType: mime,
    fileSize: bytes.byteLength,
    issuedAt,
    doctorLabel,
    clinicLabel,
  })
    .onConflictDoNothing({
      target: [dischargeDocuments.partnerCode, dischargeDocuments.partnerDocumentId],
    })
    .returning();

  if (inserted) {
    return c.json({
      externalId: resolved.externalId,
      document: {
        id: inserted.id,
        partnerDocumentId: inserted.partnerDocumentId,
        issuedAt: inserted.issuedAt,
        fileName: inserted.fileName,
        mimeType: inserted.mimeType,
        fileSize: inserted.fileSize,
      },
      duplicate: false,
    }, 201);
  }

  // Lost the race between our pre-check and this insert — clean up the
  // orphan file we just wrote and return the row that won instead.
  await unlink(absolutePath).catch(() => {});

  const [raced] = await db.select()
    .from(dischargeDocuments)
    .where(and(
      eq(dischargeDocuments.partnerCode, partner.code),
      eq(dischargeDocuments.partnerDocumentId, partnerDocumentId),
    ))
    .limit(1);

  if (!raced) {
    throw new Error('discharge document insert conflicted but no existing row found');
  }
  if (raced.personId !== resolved.personId) {
    return c.json({
      status: 'conflict',
      message: 'partnerDocumentId already used for a different patient.',
    }, 409);
  }

  return c.json({
    externalId: resolved.externalId,
    document: {
      id: raced.id,
      partnerDocumentId: raced.partnerDocumentId,
      issuedAt: raced.issuedAt,
      fileName: raced.fileName,
      mimeType: raced.mimeType,
      fileSize: raced.fileSize,
    },
    duplicate: true,
  }, 200);
});

export { router as ecosystemDischargeDocumentsRouter };
