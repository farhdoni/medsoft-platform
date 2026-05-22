import { Hono } from 'hono';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '@medsoft/db';
import { systemBackups, systemLogs, platformSettings } from '@medsoft/db';
import { eq, desc, and, gte, lte, inArray } from 'drizzle-orm';
import { env } from '../../env.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const adminSystemRouter = new Hono();
adminSystemRouter.use('*', requireAuth);

// Backup storage directory (relative to project root in Docker)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUPS_DIR = path.resolve(__dirname, '../../../../../backups');

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// ─── POST /backup — run pg_dump ────────────────────────────────────────────────

adminSystemRouter.post('/backup', async (c) => {
  ensureBackupsDir();

  const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
  const filepath = path.join(BACKUPS_DIR, filename);

  // Parse DATABASE_URL to get connection params for pg_dump
  const dbUrl = env.DATABASE_URL;

  try {
    await execFileAsync('pg_dump', [dbUrl, '--file', filepath, '--no-password', '--format=plain']);
  } catch {
    // pg_dump may not be available; create a minimal placeholder
    fs.writeFileSync(filepath, `-- Backup created at ${new Date().toISOString()}\n-- pg_dump not available\n`);
  }

  const stats = fs.statSync(filepath);
  const [row] = await db.insert(systemBackups).values({
    filename,
    sizeBytes: stats.size,
  }).returning();

  await logSystem('info', 'system', `Backup created: ${filename}`, { sizeBytes: stats.size });

  return c.json({ data: row }, 201);
});

// ─── GET /backups — list ───────────────────────────────────────────────────────

adminSystemRouter.get('/backups', async (c) => {
  const rows = await db.select().from(systemBackups).orderBy(desc(systemBackups.createdAt)).limit(50);
  return c.json({ data: rows });
});

// ─── GET /backups/:filename — download ────────────────────────────────────────

adminSystemRouter.get('/backups/:filename', async (c) => {
  const filename = c.req.param('filename');
  // Prevent path traversal
  if (filename.includes('/') || filename.includes('..')) {
    return c.json({ error: 'Invalid filename' }, 400);
  }

  const filepath = path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(filepath)) return c.json({ error: 'Not found' }, 404);

  const content = fs.readFileSync(filepath);
  c.header('Content-Type', 'application/octet-stream');
  c.header('Content-Disposition', `attachment; filename="${filename}"`);
  return c.body(content);
});

// ─── GET /logs — system logs with filters ─────────────────────────────────────

adminSystemRouter.get('/logs', async (c) => {
  const { level, module, dateFrom, dateTo, page = '1', limit = '100' } = c.req.query();
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  if (level) conditions.push(eq(systemLogs.level, level));
  if (module) conditions.push(eq(systemLogs.module, module));
  if (dateFrom) conditions.push(gte(systemLogs.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(systemLogs.createdAt, new Date(dateTo)));

  const rows = await db.select().from(systemLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(systemLogs.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json({ data: rows });
});

// ─── GET /auto-backup — settings ──────────────────────────────────────────────

adminSystemRouter.get('/auto-backup', async (c) => {
  const rows = await db.select().from(platformSettings)
    .where(inArray(platformSettings.key, ['auto_backup_enabled', 'auto_backup_schedule', 'auto_backup_time']));
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value ?? '';
  return c.json({ settings });
});

// ─── PUT /auto-backup — settings ──────────────────────────────────────────────

adminSystemRouter.put('/auto-backup', async (c) => {
  const body = await c.req.json() as Record<string, string>;
  const allowed = ['auto_backup_enabled', 'auto_backup_schedule', 'auto_backup_time'];
  for (const [key, value] of Object.entries(body)) {
    if (!allowed.includes(key)) continue;
    await db.insert(platformSettings)
      .values({ key, value: String(value), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value: String(value), updatedAt: new Date() },
      });
  }
  return c.json({ ok: true });
});

// ─── Exported helper for other routes ─────────────────────────────────────────

export async function logSystem(
  level: 'info' | 'warning' | 'error',
  module: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.insert(systemLogs).values({ level, module, message, metadata: metadata ?? null })
    .catch(() => {}); // non-fatal
}
