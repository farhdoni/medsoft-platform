import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { medicationSchedule, medicationLog, aivitaDeviceTokens } from '@medsoft/db';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaMedicationsRouter = new Hono();

aivitaMedicationsRouter.use('*', requireAivitaAuth);

// ─── GET / — мои лекарства (активные) ────────────────────────────────────────

aivitaMedicationsRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const data = await db.select().from(medicationSchedule)
    .where(and(
      eq(medicationSchedule.userId, userId),
      eq(medicationSchedule.isActive, true),
    ))
    .orderBy(asc(medicationSchedule.createdAt));
  return c.json({ data });
});

// ─── POST / — добавить лекарство вручную ─────────────────────────────────────

aivitaMedicationsRouter.post('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const body = await c.req.json() as {
    title: string;
    dosage?: string;
    frequency?: string;
    times?: string[];
    durationDays?: number;
    startDate?: string;
    endDate?: string;
    instructions?: string;
    reminderEnabled?: boolean;
    reminderMinutesBefore?: number;
    prescriptionId?: string;
  };

  if (!body.title) return c.json({ error: 'title is required' }, 400);

  const startDate = body.startDate ?? new Date().toISOString().split('T')[0];

  let endDate: string | null = body.endDate ?? null;
  if (!endDate && body.durationDays) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + body.durationDays);
    endDate = d.toISOString().split('T')[0];
  }

  const [row] = await db.insert(medicationSchedule).values({
    userId,
    prescriptionId: body.prescriptionId ?? null,
    title: body.title,
    dosage: body.dosage ?? null,
    frequency: body.frequency ?? '1 раз в день',
    times: body.times ?? [],
    durationDays: body.durationDays ?? null,
    startDate,
    endDate,
    instructions: body.instructions ?? null,
    reminderEnabled: body.reminderEnabled !== false,
    reminderMinutesBefore: body.reminderMinutesBefore ?? 5,
    createdBy: 'patient',
    doctorId: null,
  }).returning();

  return c.json({ data: row }, 201);
});

// ─── PUT /:id — обновить лекарство ───────────────────────────────────────────

aivitaMedicationsRouter.put('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const id = c.req.param('id');
  const body = await c.req.json() as Record<string, unknown>;

  const [existing] = await db.select().from(medicationSchedule)
    .where(and(eq(medicationSchedule.id, id), eq(medicationSchedule.userId, userId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);

  // Врачебное назначение — пациент может только toggle напоминания
  if (existing.createdBy === 'doctor') {
    const [updated] = await db.update(medicationSchedule)
      .set({
        reminderEnabled: typeof body.reminderEnabled === 'boolean' ? body.reminderEnabled : existing.reminderEnabled,
        reminderMinutesBefore: typeof body.reminderMinutesBefore === 'number' ? body.reminderMinutesBefore : existing.reminderMinutesBefore,
        updatedAt: new Date(),
      })
      .where(eq(medicationSchedule.id, id))
      .returning();
    return c.json({ data: updated });
  }

  delete body.id;
  delete body.userId;
  delete body.createdAt;
  delete body.prescriptionId;
  delete body.createdBy;
  delete body.doctorId;
  (body as Record<string, unknown>).updatedAt = new Date();

  const [updated] = await db.update(medicationSchedule)
    .set(body as never)
    .where(eq(medicationSchedule.id, id))
    .returning();
  return c.json({ data: updated });
});

// ─── DELETE /:id — деактивировать / удалить ──────────────────────────────────

aivitaMedicationsRouter.delete('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const id = c.req.param('id');

  const [existing] = await db.select().from(medicationSchedule)
    .where(and(eq(medicationSchedule.id, id), eq(medicationSchedule.userId, userId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);

  if (existing.createdBy === 'doctor') {
    // Деактивировать без удаления
    await db.update(medicationSchedule)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(medicationSchedule.id, id));
    return c.json({ data: { success: true, deactivated: true } });
  }

  await db.delete(medicationSchedule).where(eq(medicationSchedule.id, id));
  return c.json({ data: { success: true, deleted: true } });
});

// ─── GET /today — расписание на сегодня ──────────────────────────────────────

aivitaMedicationsRouter.get('/today', async (c) => {
  const userId = c.get('aivitaUserId');
  const today = new Date().toISOString().split('T')[0];

  const meds = await db.select().from(medicationSchedule)
    .where(and(
      eq(medicationSchedule.userId, userId),
      eq(medicationSchedule.isActive, true),
    ));

  const todayStart = new Date(`${today}T00:00:00`);
  const todayEnd = new Date(`${today}T23:59:59`);

  const logs = await db.select().from(medicationLog)
    .where(and(
      eq(medicationLog.userId, userId),
      gte(medicationLog.scheduledAt, todayStart),
      lte(medicationLog.scheduledAt, todayEnd),
    ));

  const now = new Date();

  const schedule: Array<{
    scheduleId: string;
    title: string;
    dosage: string | null;
    instructions: string | null;
    time: string;
    period: 'morning' | 'afternoon' | 'evening';
    status: string;
    takenAt: Date | null;
    createdBy: string;
    doctorId: string | null;
    logId: string | null;
  }> = [];

  for (const med of meds) {
    if (med.startDate && today < med.startDate) continue;
    if (med.endDate && today > med.endDate) continue;

    const times = (med.times as string[]) || [];
    if (times.length === 0) {
      // No specific times — treat as once per day (morning)
      times.push('08:00');
    }

    for (const time of times) {
      const [h] = time.split(':').map(Number);
      const period: 'morning' | 'afternoon' | 'evening' =
        h >= 17 ? 'evening' : h >= 12 ? 'afternoon' : 'morning';

      const scheduledAt = new Date(`${today}T${time}:00`);
      const log = logs.find((l) =>
        l.scheduleId === med.id &&
        Math.abs(new Date(l.scheduledAt).getTime() - scheduledAt.getTime()) < 60 * 60 * 1000,
      );

      let status: string;
      if (log) {
        status = log.status;
      } else if (now > scheduledAt) {
        status = 'missed';
      } else {
        status = 'pending';
      }

      schedule.push({
        scheduleId: med.id,
        title: med.title,
        dosage: med.dosage,
        instructions: med.instructions,
        time,
        period,
        status,
        takenAt: log?.takenAt ?? null,
        createdBy: med.createdBy,
        doctorId: med.doctorId,
        logId: log?.id ?? null,
      });
    }
  }

  schedule.sort((a, b) => a.time.localeCompare(b.time));
  return c.json({ data: schedule });
});

// ─── POST /:id/take — отметить "Принял" ──────────────────────────────────────

aivitaMedicationsRouter.post('/:id/take', async (c) => {
  const userId = c.get('aivitaUserId');
  const scheduleId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}) as { time?: string; note?: string });
  const time = body.time ?? null;

  const [med] = await db.select().from(medicationSchedule)
    .where(and(eq(medicationSchedule.id, scheduleId), eq(medicationSchedule.userId, userId)))
    .limit(1);
  if (!med) return c.json({ error: 'Not found' }, 404);

  const today = new Date().toISOString().split('T')[0];
  const scheduledAt = time ? new Date(`${today}T${time}:00`) : new Date();
  const todayStart = new Date(`${today}T00:00:00`);
  const todayEnd = new Date(`${today}T23:59:59`);

  const [existing] = await db.select().from(medicationLog)
    .where(and(
      eq(medicationLog.scheduleId, scheduleId),
      eq(medicationLog.userId, userId),
      gte(medicationLog.scheduledAt, todayStart),
      lte(medicationLog.scheduledAt, todayEnd),
    ))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(medicationLog)
      .set({ status: 'taken', takenAt: new Date() })
      .where(eq(medicationLog.id, existing.id))
      .returning();
    return c.json({ data: updated });
  }

  const [row] = await db.insert(medicationLog).values({
    scheduleId,
    userId,
    scheduledAt,
    status: 'taken',
    takenAt: new Date(),
    note: body.note ?? null,
  }).returning();

  return c.json({ data: row }, 201);
});

// ─── POST /:id/skip — пропустить ─────────────────────────────────────────────

aivitaMedicationsRouter.post('/:id/skip', async (c) => {
  const userId = c.get('aivitaUserId');
  const scheduleId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}) as { time?: string; note?: string });
  const time = body.time ?? null;

  const today = new Date().toISOString().split('T')[0];
  const scheduledAt = time ? new Date(`${today}T${time}:00`) : new Date();
  const todayStart = new Date(`${today}T00:00:00`);
  const todayEnd = new Date(`${today}T23:59:59`);

  const [existing] = await db.select().from(medicationLog)
    .where(and(
      eq(medicationLog.scheduleId, scheduleId),
      eq(medicationLog.userId, userId),
      gte(medicationLog.scheduledAt, todayStart),
      lte(medicationLog.scheduledAt, todayEnd),
    ))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(medicationLog)
      .set({ status: 'skipped' })
      .where(eq(medicationLog.id, existing.id))
      .returning();
    return c.json({ data: updated });
  }

  const [row] = await db.insert(medicationLog).values({
    scheduleId,
    userId,
    scheduledAt,
    status: 'skipped',
    note: body.note ?? null,
  }).returning();

  return c.json({ data: row }, 201);
});

// ─── GET /history — история приёмов ──────────────────────────────────────────

aivitaMedicationsRouter.get('/history', async (c) => {
  const userId = c.get('aivitaUserId');
  const { from, to, limit: lim } = c.req.query();

  const conditions: ReturnType<typeof eq>[] = [eq(medicationLog.userId, userId)];
  if (from) conditions.push(gte(medicationLog.scheduledAt, new Date(from)) as never);
  if (to) conditions.push(lte(medicationLog.scheduledAt, new Date(to)) as never);

  const data = await db.select({
    log: medicationLog,
    medication: {
      title: medicationSchedule.title,
      dosage: medicationSchedule.dosage,
    },
  }).from(medicationLog)
    .innerJoin(medicationSchedule, eq(medicationLog.scheduleId, medicationSchedule.id))
    .where(and(...(conditions as Parameters<typeof and>)))
    .orderBy(desc(medicationLog.scheduledAt))
    .limit(parseInt(lim ?? '50', 10));

  return c.json({ data });
});

// ─── GET /stats — статистика соблюдения ──────────────────────────────────────

aivitaMedicationsRouter.get('/stats', async (c) => {
  const userId = c.get('aivitaUserId');
  const { period } = c.req.query();

  const days = period === 'month' ? 30 : 7;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const logs = await db.select().from(medicationLog)
    .where(and(
      eq(medicationLog.userId, userId),
      gte(medicationLog.scheduledAt, fromDate),
    ));

  const total = logs.length;
  const taken = logs.filter((l) => l.status === 'taken').length;
  const skipped = logs.filter((l) => l.status === 'skipped').length;
  const missed = logs.filter((l) => l.status === 'missed').length;
  const pending = logs.filter((l) => l.status === 'pending').length;
  const completed = total - pending;
  const percent = completed > 0 ? Math.round((taken / completed) * 100) : 100;

  return c.json({ data: { total, taken, skipped, missed, pending, percent, days } });
});

// ─── POST /push/register — зарегистрировать web push токен ───────────────────

aivitaMedicationsRouter.post('/push/register', async (c) => {
  const userId = c.get('aivitaUserId');
  const { token, platform } = await c.req.json() as { token: string; platform: string };
  if (!token || !platform) return c.json({ error: 'token and platform required' }, 400);

  // Upsert в существующую таблицу device tokens
  await db.insert(aivitaDeviceTokens)
    .values({ userId, pushToken: token, platform: platform === 'ios' ? 'ios' : 'android' })
    .onConflictDoUpdate({
      target: aivitaDeviceTokens.pushToken,
      set: { userId, platform: platform === 'ios' ? 'ios' : 'android', updatedAt: new Date() },
    });

  return c.json({ data: { success: true } });
});

// ─── DELETE /push/unregister ──────────────────────────────────────────────────

aivitaMedicationsRouter.delete('/push/unregister', async (c) => {
  const userId = c.get('aivitaUserId');
  const { token } = await c.req.json() as { token: string };
  if (token) {
    await db.delete(aivitaDeviceTokens)
      .where(and(eq(aivitaDeviceTokens.userId, userId), eq(aivitaDeviceTokens.pushToken, token)));
  }
  return c.json({ data: { success: true } });
});
