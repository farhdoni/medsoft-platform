import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@medsoft/db';
import { sosCalls } from '@medsoft/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { updateSosCallSchema, sosCallFiltersSchema } from '@medsoft/shared';

const router = new Hono();
router.use('*', requireAuth);

router.get('/', zValidator('query', sosCallFiltersSchema), async (c) => {
  const { status, patientId, assignedAdminId, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const conditions = [isNull(sosCalls.deletedAt)];
  if (status) conditions.push(eq(sosCalls.status, status));
  if (patientId) conditions.push(eq(sosCalls.patientId, patientId));
  if (assignedAdminId) conditions.push(eq(sosCalls.assignedAdminId, assignedAdminId));

  const [rows, total] = await Promise.all([
    db.select().from(sosCalls).where(and(...conditions)).limit(limit).offset(offset).orderBy(sosCalls.createdAt),
    db.$count(sosCalls, and(...conditions)),
  ]);

  return c.json({ data: rows, total: Number(total), page, limit });
});

router.get('/:id', async (c) => {
  const row = await db.query.sosCalls.findFirst({
    where: and(eq(sosCalls.id, c.req.param('id')), isNull(sosCalls.deletedAt)),
  });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.patch('/:id', zValidator('json', updateSosCallSchema), async (c) => {
  const { status, assignedAdminId, operatorNotes, resolutionSummary } = c.req.valid('json');
  const adminId = c.get('adminId');

  const update: Record<string, unknown> = { status, updatedAt: new Date() };
  if (assignedAdminId) update.assignedAdminId = assignedAdminId;
  if (operatorNotes) update.operatorNotes = operatorNotes;
  if (resolutionSummary) update.resolutionSummary = resolutionSummary;
  if (status === 'operator_assigned') update.assignedAt = new Date();
  if (status === 'brigade_dispatched') update.brigadDispatchedAt = new Date();
  if (status === 'resolved' || status === 'false_alarm') update.resolvedAt = new Date();

  const [row] = await db.update(sosCalls)
    .set(update)
    .where(and(eq(sosCalls.id, c.req.param('id')), isNull(sosCalls.deletedAt)))
    .returning();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

export { router as sosCallsRouter };
