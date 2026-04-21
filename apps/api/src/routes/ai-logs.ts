import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { aiLogs } from '@medsoft/db';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

export const aiLogsRouter = new Hono();
aiLogsRouter.use('*', requireAuth);

aiLogsRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1);
  const limit = Math.min(Number(c.req.query('limit') || 20), 100);
  const offset = (page - 1) * limit;
  const where = isNull(aiLogs.deletedAt);
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(aiLogs).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(aiLogs).where(where),
  ]);
  return c.json({ data: rows, total: count, page, limit });
});

aiLogsRouter.get('/:id', async (c) => {
  const [row] = await db.select().from(aiLogs).where(and(eq(aiLogs.id, c.req.param('id')), isNull(aiLogs.deletedAt))).limit(1);
  if (!row) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return c.json(row);
});
