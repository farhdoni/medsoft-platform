/**
 * File upload endpoint for patient-doctor chat attachments.
 * Saves to ./uploads/ dir and returns a public URL.
 * Max 10MB, allowed types: image/*, audio/*, application/pdf.
 */
import { Hono } from 'hono';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads');
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_PREFIXES = ['image/', 'audio/'];
// Allowlist, deliberately not a blocklist: anything not named here is refused,
// so executables cannot be reached by inventing a new extension. Archives are
// accepted on their declared type only — we do not read inside them.
// TODO(prod): put attachment antivirus scanning in front of this before the
// uploads directory is exposed to real patients.
const ALLOWED_MIME_EXACT    = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

/**
 * Media type with codec parameters stripped.
 *
 * MediaRecorder reports a recording's container as "audio/webm;codecs=opus",
 * and matching that whole string against the tables below finds nothing — the
 * upload then lands with no extension and comes back from the serve handler as
 * application/octet-stream, which no <audio> element will play.
 */
function baseType(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase();
}

function isAllowed(mime: string): boolean {
  const base = baseType(mime);
  return (
    ALLOWED_MIME_PREFIXES.some(p => base.startsWith(p)) ||
    ALLOWED_MIME_EXACT.includes(base)
  );
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
    'image/webp': '.webp', 'image/heic': '.heic',
    'audio/webm': '.webm', 'audio/ogg': '.ogg', 'audio/mpeg': '.mp3',
    'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/mp4': '.m4a',
    'audio/aac': '.aac', 'audio/x-m4a': '.m4a',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt', 'text/csv': '.csv',
    'application/zip': '.zip', 'application/x-zip-compressed': '.zip',
  };
  return map[baseType(mime)] ?? '';
}

export const uploadRouter = new Hono();
uploadRouter.use('*', requireAivitaAuth);

uploadRouter.post('/', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No file provided' }, 400);
    }

    const mime = file.type;
    if (!isAllowed(mime)) {
      return c.json({ error: `File type not allowed: ${mime}` }, 415);
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return c.json({ error: 'File too large (max 10MB)' }, 413);
    }

    // Ensure uploads directory exists
    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true });
    }

    const ext = mimeToExt(mime);
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    await writeFile(filepath, Buffer.from(bytes));

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const url = `${apiBase}/v1/aivita/uploads/${filename}`;

    return c.json({ data: { url, name: file.name ?? filename, mime, size: bytes.byteLength } });
  } catch (e) {
    return c.json({ error: 'Upload failed', message: String(e) }, 500);
  }
});

// ─── Serve uploaded files ──────────────────────────────────────────────────────
export const uploadsServeRouter = new Hono();

uploadsServeRouter.get('/:filename', async (c) => {
  const filename = c.req.param('filename');
  // Basic path traversal guard
  if (filename.includes('..') || filename.includes('/')) {
    return c.json({ error: 'Bad request' }, 400);
  }

  const { readFile } = await import('fs/promises');
  const filepath = path.join(UPLOADS_DIR, filename);

  try {
    const buf = await readFile(filepath);
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif',  '.webp': 'image/webp',
      '.webm': 'audio/webm', '.ogg': 'audio/ogg',
      '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain', '.csv': 'text/csv', '.zip': 'application/zip',
    };
    const mime = mimeMap[ext] ?? 'application/octet-stream';
    return new Response(buf, { headers: { 'Content-Type': mime, 'Cache-Control': 'public,max-age=86400' } });
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
});
