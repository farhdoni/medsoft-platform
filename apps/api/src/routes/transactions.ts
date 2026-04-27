import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@medsoft/db';
import { transactions } from '@medsoft/db/schema';
import { eq, isNull, and, gte, lte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { createTransactionSchema, updateTransactionSchema, transactionFiltersSchema } from '@medsoft/shared';

const router = new Hono();
router.use('*', requireAuth);

router.get('/', zValidator('query', transactionFiltersSchema), async (c) => {
  const { status, type, provider, patientId, dateFrom, dateTo, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const conditions = [isNull(transactions.deletedAt)];
  if (status) conditions.push(eq(transactions.status, status));
  if (type) conditions.push(eq(transactions.type, type));
  if (provider) conditions.push(eq(transactions.provider, provider));
  if (patientId) conditions.push(eq(transactions.patientId, patientId));
  if (dateFrom) conditions.push(gte(transactions.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(transactions.createdAt, new Date(dateTo)));

  const [rows, total] = await Promise.all([
    db.select().from(transactions).where(and(...conditions)).limit(limit).offset(offset).orderBy(transactions.createdAt),
    db.$count(transactions, and(...conditions)),
  ]);

  return c.json({ data: rows, total: Number(total), page, limit });
});

router.get('/:id', async (c) => {
  const row = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, c.req.param('id')), isNull(transactions.deletedAt)),
  });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.post('/', zValidator('json', createTransactionSchema), async (c) => {
  const data = c.req.valid('json');
  const adminId = c.get('adminId');
  const [row] = await db.insert(transactions).values({
    ...data,
    amountUzs: String(data.amountUzs),
    initiatedByAdminId: adminId,
  }).returning();
  return c.json(row, 201);
});

router.patch('/:id', zValidator('json', updateTransactionSchema), async (c) => {
  const data = c.req.valid('json');
  const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.status === 'completed') update.completedAt = new Date();

  const [row] = await db.update(transactions)
    .set(update)
    .where(and(eq(transactions.id, c.req.param('id')), isNull(transactions.deletedAt)))
    .returning();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.delete('/:id', async (c) => {
  const [row] = await db.update(transactions)
    .set({ deletedAt: new Date() })
    .where(and(eq(transactions.id, c.req.param('id')), isNull(transactions.deletedAt)))
    .returning({ id: transactions.id });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

export { router as transactionsRouter };
