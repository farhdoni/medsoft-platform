import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { doctorNotes } from '@medsoft/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorNotesRouter = new Hono();

doctorNotesRouter.use('*', requireAivitaAuth);

// GET / — заметки врача (с фильтром по пациенту)
doctorNotesRouter.get('/', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { patientId } = c.req.query();

  const conditions = [eq(doctorNotes.doctorId, doctorId)];
  if (patientId) conditions.push(eq(doctorNotes.patientId, patientId));

  const data = await db.select().from(doctorNotes)
    .where(and(...conditions))
    .orderBy(desc(doctorNotes.createdAt));
  return c.json({ data });
});

// POST / — создать заметку
doctorNotesRouter.post('/', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const body = await c.req.json() as {
    patientId: string;
    appointmentId?: string;
    text: string;
    isPinned?: boolean;
  };

  const [row] = await db.insert(doctorNotes).values({
    doctorId,
    patientId: body.patientId,
    appointmentId: body.appointmentId ?? null,
    text: body.text,
    isPinned: body.isPinned ?? false,
  }).returning();
  return c.json({ data: row });
});

// PUT /:id — обновить заметку
doctorNotesRouter.put('/:id', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { text, isPinned } = await c.req.json() as { text?: string; isPinned?: boolean };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (text !== undefined) updates.text = text;
  if (isPinned !== undefined) updates.isPinned = isPinned;

  const [updated] = await db.update(doctorNotes).set(updates as any)
    .where(and(
      eq(doctorNotes.id, c.req.param('id')),
      eq(doctorNotes.doctorId, doctorId),
    )).returning();
  return c.json({ data: updated });
});

// DELETE /:id — удалить заметку
doctorNotesRouter.delete('/:id', async (c) => {
  const doctorId = c.get('aivitaUserId');
  await db.delete(doctorNotes)
    .where(and(
      eq(doctorNotes.id, c.req.param('id')),
      eq(doctorNotes.doctorId, doctorId),
    ));
  return c.json({ data: { success: true } });
});
