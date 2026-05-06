import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { prescriptionTemplates } from '@medsoft/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorTemplatesRouter = new Hono();

doctorTemplatesRouter.use('*', requireAivitaAuth);

// GET / — мои шаблоны
doctorTemplatesRouter.get('/', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { type } = c.req.query();

  const conditions = [eq(prescriptionTemplates.doctorId, doctorId)];
  if (type) conditions.push(eq(prescriptionTemplates.type, type));

  const data = await db.select().from(prescriptionTemplates)
    .where(and(...conditions))
    .orderBy(desc(prescriptionTemplates.usageCount));
  return c.json({ data });
});

// POST / — создать шаблон
doctorTemplatesRouter.post('/', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const body = await c.req.json() as {
    type: string;
    title: string;
    details?: string;
    frequency?: string;
    durationDays?: number;
  };

  const [row] = await db.insert(prescriptionTemplates).values({
    doctorId,
    type: body.type,
    title: body.title,
    details: body.details ?? null,
    frequency: body.frequency ?? null,
    durationDays: body.durationDays ?? null,
  }).returning();
  return c.json({ data: row });
});

// PUT /:id — обновить шаблон
doctorTemplatesRouter.put('/:id', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const body = await c.req.json() as Record<string, unknown>;
  delete body.id;
  delete body.doctorId;

  const [updated] = await db.update(prescriptionTemplates).set(body as any)
    .where(and(
      eq(prescriptionTemplates.id, c.req.param('id')),
      eq(prescriptionTemplates.doctorId, doctorId),
    )).returning();
  return c.json({ data: updated });
});

// DELETE /:id — удалить шаблон
doctorTemplatesRouter.delete('/:id', async (c) => {
  const doctorId = c.get('aivitaUserId');
  await db.delete(prescriptionTemplates)
    .where(and(
      eq(prescriptionTemplates.id, c.req.param('id')),
      eq(prescriptionTemplates.doctorId, doctorId),
    ));
  return c.json({ data: { success: true } });
});
