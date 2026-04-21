import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@medsoft/db';
import { transactions } from '@medsoft/db';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { createTransactionSchema, updateTransactionSchema } from '@medsoft/shared';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../services/audit';

export const transactionsRouter = new Hono();
transactionsRouter.use('*', requireAuth);

transactionsRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1);
  const limit = Math.min(Number(c.req.query('limit') || 20), 100);
  const status = c.req.query('status');
  const offset = (page - 1) * limit;
  const conditions = [isNull(transactions.deletedAt)];
  if (status) conditions.push(eq(transactions.status, status as never));
  const where = and(...conditions);
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(transactions).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(transactions).where(where),
  ]);
  return c.json({ data: rows, total: count, page, limit });
});

transactionsRouter.get('/:id', async (c) => {
  const [row] = await db.select().from(transactions).where(eq(transactions.id, c.req.param('id'))).limit(1);
  if (!row) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return c.json(row);
});

transactionsRouter.post('/', zValidator('json', createTransactionSchema), async (c) => {
  const data = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [row] = await db.insert(transactions).values({ ...data, initiatedByAdminId: admin.id } as never).returning();
  await logAudit(admin.id, 'transaction.create', 'transaction', row.id);
  return c.json(row, 201);
});

transactionsRouter.patch('/:id', zValidator('json', updateTransactionSchema), async (c) => {
  const data = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [row] = await db.update(transactions).set({ ...(data as Record<string, unknown>), updatedAt: new Date() }).where(eq(transactions.id, c.req.param('id'))).returning();
  await logAudit(admin.id, 'transaction.update', 'transaction', row.id);
  return c.json(row);
});

transactionsRouter.delete('/:id', async (c) => {
  const admin = c.get('admin' as never) as { id: string };
  await db.update(transactions).set({ deletedAt: new Date() }).where(eq(transactions.id, c.req.param('id')));
  await logAudit(admin.id, 'transaction.delete', 'transaction', c.req.param('id'));
  return c.json({ message: 'Deleted' });
});
