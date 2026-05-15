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
const ALLOWED_MIME_EXACT    = ['application/pdf'];

function isAllowed(mime: string): boolean {
  return (
    ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p)) ||
    ALLOWED_MIME_EXACT.includes(mime)
  );
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
    'image/webp': '.webp', 'image/heic': '.heic',
    'audio/webm': '.webm', 'audio/ogg': '.ogg', 'audio/mpeg': '.mp3',
    'audio/wav': '.wav', 'audio/mp4': '.m4a',
    'application/pdf': '.pdf',
  };
  return map[mime] ?? '';
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

    return c.json({ data: { url, name: file.name ?? filename, mime } });
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
      '.pdf': 'application/pdf',
    };
    const mime = mimeMap[ext] ?? 'application/octet-stream';
    return new Response(buf, { headers: { 'Content-Type': mime, 'Cache-Control': 'public,max-age=86400' } });
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
});
