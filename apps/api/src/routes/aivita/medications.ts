import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  medicationSchedule,
  medicationLog,
  aivitaDeviceTokens,
  aivitaUsers,
  familyMembers,
  pharmacyProducts,
  pharmacyBranches,
  pharmacies,
} from '@medsoft/db';
import { eq, and, desc, asc, gte, lte, ilike, or, ne, inArray } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import Anthropic from '@anthropic-ai/sdk';

export const aivitaMedicationsRouter = new Hono();

aivitaMedicationsRouter.use('*', requireAivitaAuth);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── GET / — лекарства (фильтр по status) ───────────────────────────────────
// ?status=active            → активные (default)
// ?status=paused,completed  → завершённые/на паузе
// ?status=all               → все

aivitaMedicationsRouter.get('/', async (c) => {
  const userId     = c.get('aivitaUserId');
  const statusParam = c.req.query('status') ?? 'active';

  const allowedStatuses = ['active', 'paused', 'completed'];
  const statuses: string[] = statusParam === 'all'
    ? allowedStatuses
    : statusParam.split(',').filter(s => allowedStatuses.includes(s));

  const data = await db.select().from(medicationSchedule)
    .where(and(
      eq(medicationSchedule.userId, userId),
      statuses.length === 1
        ? eq(medicationSchedule.status, statuses[0]!)
        : inArray(medicationSchedule.status, statuses),
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
    persistentReminder?: boolean;
    prescriptionId?: string;
    sideEffects?: string[];
    contraindications?: string[];
    foodInstruction?: string;
    remainingPills?: number;
    source?: string;
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
    persistentReminder: body.persistentReminder ?? false,
    sideEffects: body.sideEffects ?? [],
    contraindications: body.contraindications ?? [],
    foodInstruction: body.foodInstruction ?? null,
    remainingPills: body.remainingPills ?? null,
    source: body.source ?? 'manual',
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

  if (existing.createdBy === 'doctor') {
    const [updated] = await db.update(medicationSchedule)
      .set({
        reminderEnabled: typeof body.reminderEnabled === 'boolean' ? body.reminderEnabled : existing.reminderEnabled,
        reminderMinutesBefore: typeof body.reminderMinutesBefore === 'number' ? body.reminderMinutesBefore : existing.reminderMinutesBefore,
        remainingPills: typeof body.remainingPills === 'number' ? body.remainingPills : existing.remainingPills,
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

  // Sync isActive with status for backwards compatibility
  if (typeof body.status === 'string') {
    (body as Record<string, unknown>).isActive = body.status === 'active';
  }

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
    await db.update(medicationSchedule)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(medicationSchedule.id, id));
    return c.json({ data: { success: true, deactivated: true } });
  }

  await db.delete(medicationSchedule).where(eq(medicationSchedule.id, id));
  return c.json({ data: { success: true, deleted: true } });
});

// ─── POST /bulk-add — добавить список лекарств из AI-чата ───────────────────

aivitaMedicationsRouter.post('/bulk-add', async (c) => {
  const userId = c.get('aivitaUserId');
  const body = await c.req.json() as {
    medications: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      times?: string[];
      durationDays?: number | null;
      foodInstruction?: string | null;
    }>;
  };

  if (!Array.isArray(body.medications) || body.medications.length === 0) {
    return c.json({ error: 'medications array is required' }, 400);
  }

  const startDate = new Date().toISOString().split('T')[0];
  const added: Array<{ id: string; name: string }> = [];

  for (const med of body.medications.slice(0, 20)) {
    if (!med.name?.trim()) continue;
    try {
      const [row] = await db.insert(medicationSchedule).values({
        userId,
        title: med.name.trim(),
        dosage: med.dosage ?? null,
        frequency: med.frequency ?? '1 раз в день',
        times: Array.isArray(med.times) ? med.times : [],
        durationDays: med.durationDays ?? null,
        startDate,
        foodInstruction: med.foodInstruction ?? null,
        source: 'chat',
        createdBy: 'patient',
        reminderEnabled: true,
        reminderMinutesBefore: 5,
        sideEffects: [],
        contraindications: [],
      }).returning();
      added.push({ id: row.id, name: row.title });
    } catch { /* skip individual failures */ }
  }

  return c.json({ data: { added: added.length, medications: added } }, 201);
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
    foodInstruction: string | null;
    sideEffects: string[];
    contraindications: string[];
    remainingPills: number | null;
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
    if (times.length === 0) times.push('08:00');

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
        foodInstruction: med.foodInstruction ?? null,
        sideEffects: (med.sideEffects as string[]) ?? [],
        contraindications: (med.contraindications as string[]) ?? [],
        remainingPills: med.remainingPills ?? null,
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

  let logRow;
  if (existing) {
    const [updated] = await db.update(medicationLog)
      .set({ status: 'taken', takenAt: new Date() })
      .where(eq(medicationLog.id, existing.id))
      .returning();
    logRow = updated;
  } else {
    const [row] = await db.insert(medicationLog).values({
      scheduleId,
      userId,
      scheduledAt,
      status: 'taken',
      takenAt: new Date(),
      note: body.note ?? null,
    }).returning();
    logRow = row;
  }

  // Decrease remaining pills if tracked
  if (med.remainingPills !== null && med.remainingPills > 0) {
    await db.update(medicationSchedule)
      .set({ remainingPills: med.remainingPills - 1, updatedAt: new Date() })
      .where(eq(medicationSchedule.id, scheduleId));
  }

  // Update streak
  await updateStreak(userId);

  return c.json({ data: logRow });
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

// ─── GET /log — журнал за период (для 7-дневной шкалы) ───────────────────────

aivitaMedicationsRouter.get('/log', async (c) => {
  const userId = c.get('aivitaUserId');
  const { dateFrom, dateTo } = c.req.query();

  const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : new Date();

  const logs = await db.select({
    log: medicationLog,
    title: medicationSchedule.title,
    dosage: medicationSchedule.dosage,
  }).from(medicationLog)
    .innerJoin(medicationSchedule, eq(medicationLog.scheduleId, medicationSchedule.id))
    .where(and(
      eq(medicationLog.userId, userId),
      gte(medicationLog.scheduledAt, fromDate),
      lte(medicationLog.scheduledAt, toDate),
    ))
    .orderBy(asc(medicationLog.scheduledAt));

  // Group by date
  const byDate: Record<string, typeof logs> = {};
  for (const row of logs) {
    const d = new Date(row.log.scheduledAt).toISOString().split('T')[0];
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(row);
  }

  return c.json({ data: byDate });
});

// ─── POST /log — создать запись в журнале ────────────────────────────────────

aivitaMedicationsRouter.post('/log', async (c) => {
  const userId = c.get('aivitaUserId');
  const body = await c.req.json() as {
    scheduleId: string;
    scheduledAt: string;
    status: 'taken' | 'skipped' | 'missed';
    note?: string;
  };

  if (!body.scheduleId || !body.scheduledAt || !body.status) {
    return c.json({ error: 'scheduleId, scheduledAt, status are required' }, 400);
  }

  const [med] = await db.select().from(medicationSchedule)
    .where(and(eq(medicationSchedule.id, body.scheduleId), eq(medicationSchedule.userId, userId)))
    .limit(1);
  if (!med) return c.json({ error: 'Medication not found' }, 404);

  const scheduledAt = new Date(body.scheduledAt);
  const dayStart = new Date(scheduledAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(scheduledAt);
  dayEnd.setHours(23, 59, 59, 999);

  // Check for existing log on same day for same schedule
  const [existing] = await db.select().from(medicationLog)
    .where(and(
      eq(medicationLog.scheduleId, body.scheduleId),
      eq(medicationLog.userId, userId),
      gte(medicationLog.scheduledAt, dayStart),
      lte(medicationLog.scheduledAt, dayEnd),
    ))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(medicationLog)
      .set({
        status: body.status,
        takenAt: body.status === 'taken' ? new Date() : null,
        note: body.note ?? existing.note,
      })
      .where(eq(medicationLog.id, existing.id))
      .returning();
    if (body.status === 'taken') await updateStreak(userId);
    return c.json({ data: updated });
  }

  const [row] = await db.insert(medicationLog).values({
    scheduleId: body.scheduleId,
    userId,
    scheduledAt,
    status: body.status,
    takenAt: body.status === 'taken' ? new Date() : null,
    note: body.note ?? null,
  }).returning();

  if (body.status === 'taken') await updateStreak(userId);
  return c.json({ data: row }, 201);
});

// ─── GET /stats — статистика соблюдения ──────────────────────────────────────

aivitaMedicationsRouter.get('/stats', async (c) => {
  const userId = c.get('aivitaUserId');
  const { period } = c.req.query();

  const days = period === 'month' ? 30 : 7;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const [logs, user] = await Promise.all([
    db.select().from(medicationLog).where(and(
      eq(medicationLog.userId, userId),
      gte(medicationLog.scheduledAt, fromDate),
    )),
    db.select({
      currentStreak: aivitaUsers.currentStreak,
      longestStreak: aivitaUsers.longestStreak,
      streakBadges: aivitaUsers.streakBadges,
    }).from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1),
  ]);

  const total = logs.length;
  const taken = logs.filter((l) => l.status === 'taken').length;
  const skipped = logs.filter((l) => l.status === 'skipped').length;
  const missed = logs.filter((l) => l.status === 'missed').length;
  const pending = logs.filter((l) => l.status === 'pending').length;
  const completed = total - pending;
  const percent = completed > 0 ? Math.round((taken / completed) * 100) : 100;

  const streak = user[0] ?? { currentStreak: 0, longestStreak: 0, streakBadges: [] };

  return c.json({
    data: {
      total, taken, skipped, missed, pending, percent, days,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      streakBadges: streak.streakBadges,
    },
  });
});

// ─── POST /parse-receipt — OCR рецепта через Claude Vision ───────────────────

aivitaMedicationsRouter.post('/parse-receipt', async (c) => {
  const body = await c.req.json() as {
    imageData: string;     // base64
    mediaType?: string;    // 'image/jpeg' | 'image/png' | 'image/webp'
  };

  if (!body.imageData) return c.json({ error: 'imageData is required' }, 400);

  const mediaType = (body.mediaType ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: body.imageData },
          },
          {
            type: 'text',
            text: `Это фото медицинского рецепта. Прочти КАЖДУЮ строку внимательно, включая рукописный текст.

Рукописные названия лекарств часто выглядят как: торговые названия (Зугрель, Тромбопол, Конкор, Роксера, Амлодипин, Эринит, Ношпалгин) или дозировки (10мг, 75мг, 2.5мг, 1 мад, 1 таб, 2 кап и т.д.).

Для каждого лекарства извлеки:
- name: точное название как написано
- dosage: дозировка ("10мг", "1 таблетка", "1 мад", "2 кап" и т.д.)
- frequency: частота ("1 раз в день", "2 раза в день", "утром и вечером" и т.д.)
- durationDays: курс в днях (число или null если не указано)
- times: массив времён ["08:00"] вычисленных из частоты
- foodInstruction: одно из "before" | "after" | "during" | "no_alcohol" | null
- instructions: прочие указания или null

Верни ТОЛЬКО JSON массив без пояснений и без markdown блоков:
[{"name":"...","dosage":"...","frequency":"...","durationDays":null,"times":["08:00"],"foodInstruction":null,"instructions":null}]

Если слово нечитаемо — добавь запись с name "[нечитаемо]".
Если рецепт содержит 0 лекарств — верни пустой массив [].`,
          },
        ],
      }],
    });

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Strip markdown code fences if present
    const text = rawText.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();

    type MedItem = { name: string; dosage: string; frequency: string; durationDays: number | null; times: string[]; foodInstruction: string | null; instructions: string | null };
    let parsed: MedItem[] = [];

    // Try direct parse first (Claude returned clean JSON)
    try {
      const direct = JSON.parse(text) as MedItem[] | { medications?: MedItem[]; data?: MedItem[] };
      if (Array.isArray(direct)) {
        parsed = direct;
      } else if (Array.isArray(direct?.medications)) {
        parsed = direct.medications as MedItem[];
      } else if (Array.isArray((direct as { data?: MedItem[] })?.data)) {
        parsed = (direct as { data: MedItem[] }).data;
      }
    } catch {
      // Fallback: regex extract array
      const arrMatch = text.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try { parsed = JSON.parse(arrMatch[0]) as MedItem[]; } catch { parsed = []; }
      }
    }

    return c.json({ data: parsed, raw: parsed.length === 0 ? rawText : undefined });
  } catch (err: unknown) {
    // Anthropic bad-request (e.g. corrupt image, "Could not process image") →
    // return empty list so frontend shows "no meds found" instead of error banner
    const status = (err as { status?: number })?.status;
    if (status === 400 || status === 422) {
      console.warn('parse-receipt: Anthropic rejected image (400/422):', String(err));
      return c.json({ data: [], raw: undefined });
    }
    console.error('parse-receipt error:', err);
    return c.json({ error: 'AI recognition failed', detail: String(err) }, 500);
  }
});

// ─── POST /identify — определить таблетку по фото ────────────────────────────

aivitaMedicationsRouter.post('/identify', async (c) => {
  const body = await c.req.json() as {
    imageData: string;
    mediaType?: string;
  };

  if (!body.imageData) return c.json({ error: 'imageData is required' }, 400);

  const mediaType = (body.mediaType ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: body.imageData },
          },
          {
            type: 'text',
            text: `Определи что это за таблетка, капсула или лекарство на фото.

Верни JSON объект:
{
  "name": "Название препарата (или null если не определить)",
  "activeIngredient": "Действующее вещество",
  "dosage": "Дозировка если видна",
  "description": "Краткое описание что это",
  "sideEffects": ["основные побочные эффекты"],
  "contraindications": ["основные противопоказания"],
  "confidence": "high|medium|low"
}

Только JSON, без пояснений.`,
          },
        ],
      }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return c.json({ data: null, raw: text });

    const parsed = JSON.parse(jsonMatch[0]) as {
      name: string | null;
      activeIngredient: string;
      dosage: string;
      description: string;
      sideEffects: string[];
      contraindications: string[];
      confidence: string;
    };

    return c.json({ data: parsed });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 400 || status === 422) {
      console.warn('identify: Anthropic rejected image:', String(err));
      return c.json({ data: null });
    }
    console.error('identify error:', err);
    return c.json({ error: 'AI identification failed' }, 500);
  }
});

// ─── GET /family — лекарства членов семьи ────────────────────────────────────

aivitaMedicationsRouter.get('/family', async (c) => {
  const userId = c.get('aivitaUserId');

  // Получить членов семьи с аккаунтами
  const members = await db.select({
    memberId: familyMembers.id,
    memberUserId: familyMembers.memberUserId,
    memberName: familyMembers.memberName,
    memberRelation: familyMembers.memberRelation,
  }).from(familyMembers)
    .where(and(
      eq(familyMembers.ownerId, userId),
    ));

  const today = new Date().toISOString().split('T')[0];
  const todayStart = new Date(`${today}T00:00:00`);
  const todayEnd = new Date(`${today}T23:59:59`);

  const result = await Promise.all(members.map(async (m) => {
    if (!m.memberUserId) {
      return { ...m, medications: [], todayStats: { taken: 0, pending: 0, total: 0 } };
    }

    const meds = await db.select().from(medicationSchedule)
      .where(and(
        eq(medicationSchedule.userId, m.memberUserId),
        eq(medicationSchedule.isActive, true),
      ));

    const logs = await db.select().from(medicationLog)
      .where(and(
        eq(medicationLog.userId, m.memberUserId),
        gte(medicationLog.scheduledAt, todayStart),
        lte(medicationLog.scheduledAt, todayEnd),
      ));

    const taken = logs.filter((l) => l.status === 'taken').length;
    const total = meds.reduce((sum, med) => sum + ((med.times as string[]).length || 1), 0);
    const pending = total - taken;

    return {
      ...m,
      medications: meds.map((med) => ({
        id: med.id,
        title: med.title,
        dosage: med.dosage,
        times: med.times,
        endDate: med.endDate,
      })),
      todayStats: { taken, pending, total },
    };
  }));

  return c.json({ data: result });
});

// ─── GET /pharmacy/search — поиск аптек ──────────────────────────────────────

aivitaMedicationsRouter.get('/pharmacy/search', async (c) => {
  const { drug } = c.req.query();
  if (!drug || drug.trim().length < 2) {
    return c.json({ error: 'drug query is required (min 2 chars)' }, 400);
  }

  const results = await db.select({
    productId: pharmacyProducts.id,
    productName: pharmacyProducts.name,
    dosage: pharmacyProducts.dosage,
    form: pharmacyProducts.form,
    price: pharmacyProducts.price,
    oldPrice: pharmacyProducts.oldPrice,
    stock: pharmacyProducts.stock,
    pharmacyId: pharmacies.id,
    pharmacyName: pharmacies.name,
    branchId: pharmacyBranches.id,
    address: pharmacyBranches.address,
    lat: pharmacyBranches.lat,
    lon: pharmacyBranches.lon,
    phone: pharmacyBranches.phone,
  }).from(pharmacyProducts)
    .innerJoin(pharmacies, eq(pharmacyProducts.pharmacyId, pharmacies.id))
    .leftJoin(pharmacyBranches, eq(pharmacyProducts.branchId, pharmacyBranches.id))
    .where(and(
      or(
        ilike(pharmacyProducts.name, `%${drug}%`),
        ilike(pharmacyProducts.innName, `%${drug}%`),
      ),
      eq(pharmacyProducts.isActive, true),
      eq(pharmacies.status, 'active'),
    ))
    .orderBy(asc(pharmacyProducts.price))
    .limit(20);

  // Mark best price
  const withBestPrice = results.map((r, i) => ({
    ...r,
    isBestPrice: i === 0 && results.length > 1,
  }));

  return c.json({ data: withBestPrice });
});

// ─── POST /export-pdf — экспорт отчёта ───────────────────────────────────────

aivitaMedicationsRouter.post('/export-pdf', async (c) => {
  const userId = c.get('aivitaUserId');

  const [user, meds, logs] = await Promise.all([
    db.select({ name: aivitaUsers.name, email: aivitaUsers.email }).from(aivitaUsers)
      .where(eq(aivitaUsers.id, userId)).limit(1),
    db.select().from(medicationSchedule)
      .where(and(eq(medicationSchedule.userId, userId), eq(medicationSchedule.isActive, true))),
    db.select({
      log: medicationLog,
      title: medicationSchedule.title,
    }).from(medicationLog)
      .innerJoin(medicationSchedule, eq(medicationLog.scheduleId, medicationSchedule.id))
      .where(and(
        eq(medicationLog.userId, userId),
        gte(medicationLog.scheduledAt, (() => {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          return d;
        })()),
      ))
      .orderBy(desc(medicationLog.scheduledAt))
      .limit(200),
  ]);

  const userName = user[0]?.name ?? 'Пациент';
  const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Отчёт о лекарствах — ${userName}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #222; }
  h1 { color: #9c5e6c; border-bottom: 2px solid #9c5e6c; padding-bottom: 8px; }
  h2 { color: #555; margin-top: 32px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #f4f3ef; padding: 8px 12px; text-align: left; font-size: 13px; }
  td { padding: 7px 12px; border-bottom: 1px solid #e8e4dc; font-size: 13px; }
  .taken { color: #3a7a5a; } .missed { color: #c0392b; } .skipped { color: #888; }
  .footer { margin-top: 48px; font-size: 11px; color: #999; border-top: 1px solid #e8e4dc; padding-top: 16px; }
</style>
</head>
<body>
<h1>📋 Отчёт о лекарствах</h1>
<p><strong>Пациент:</strong> ${userName}</p>
<p><strong>Дата:</strong> ${date}</p>
<p><strong>Период:</strong> последние 30 дней</p>

<h2>Активные лекарства</h2>
<table>
<tr><th>Название</th><th>Дозировка</th><th>Частота</th><th>Курс</th><th>Инструкция</th></tr>
${meds.map((m) => `
<tr>
  <td>${m.title}</td>
  <td>${m.dosage ?? '—'}</td>
  <td>${m.frequency}</td>
  <td>${m.startDate}${m.endDate ? ` — ${m.endDate}` : ' (постоянно)'}</td>
  <td>${m.instructions ?? '—'}</td>
</tr>`).join('')}
</table>

<h2>История приёмов (последние 30 дней)</h2>
<table>
<tr><th>Дата и время</th><th>Лекарство</th><th>Статус</th></tr>
${logs.slice(0, 100).map((r) => `
<tr>
  <td>${new Date(r.log.scheduledAt).toLocaleString('ru-RU')}</td>
  <td>${r.title}</td>
  <td class="${r.log.status}">${r.log.status === 'taken' ? '✓ Принял' : r.log.status === 'missed' ? '✗ Пропущено' : '— Пропустил'}</td>
</tr>`).join('')}
</table>

<div class="footer">
  Сгенерировано aivita.uz · ${date} · MedSoft Platform
</div>
</body>
</html>`;

  return c.json({
    data: {
      html,
      filename: `medications-report-${new Date().toISOString().split('T')[0]}.html`,
    },
  });
});

// ─── POST /push/register ──────────────────────────────────────────────────────

aivitaMedicationsRouter.post('/push/register', async (c) => {
  const userId = c.get('aivitaUserId');
  const { token, platform } = await c.req.json() as { token: string; platform: string };
  if (!token || !platform) return c.json({ error: 'token and platform required' }, 400);

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

// ─── Helper: обновить streak пользователя ────────────────────────────────────

async function updateStreak(userId: string): Promise<void> {
  try {
    const [user] = await db.select({
      currentStreak: aivitaUsers.currentStreak,
      longestStreak: aivitaUsers.longestStreak,
      streakBadges: aivitaUsers.streakBadges,
    }).from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);

    if (!user) return;

    // Check if all meds for yesterday were taken
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yd = yesterday.toISOString().split('T')[0];
    const ydStart = new Date(`${yd}T00:00:00`);
    const ydEnd = new Date(`${yd}T23:59:59`);

    const ydLogs = await db.select().from(medicationLog)
      .where(and(
        eq(medicationLog.userId, userId),
        gte(medicationLog.scheduledAt, ydStart),
        lte(medicationLog.scheduledAt, ydEnd),
      ));

    const allTaken = ydLogs.length > 0 && ydLogs.every((l) => l.status === 'taken');

    const newStreak = allTaken ? (user.currentStreak ?? 0) + 1 : 1;
    const newLongest = Math.max(newStreak, user.longestStreak ?? 0);

    // Check for new badges
    const badges = [...((user.streakBadges as Array<{ id: string; name: string; icon: string; earnedAt: string }>) ?? [])];
    const BADGE_MILESTONES = [
      { days: 7, id: 'streak_7', name: '7 дней!', icon: '🔥' },
      { days: 14, id: 'streak_14', name: '2 недели!', icon: '💪' },
      { days: 30, id: 'streak_30', name: '1 месяц!', icon: '🏆' },
      { days: 90, id: 'streak_90', name: '3 месяца!', icon: '🎖️' },
    ];
    for (const milestone of BADGE_MILESTONES) {
      if (newStreak >= milestone.days && !badges.find((b) => b.id === milestone.id)) {
        badges.push({ id: milestone.id, name: milestone.name, icon: milestone.icon, earnedAt: new Date().toISOString() });
      }
    }

    await db.update(aivitaUsers)
      .set({ currentStreak: newStreak, longestStreak: newLongest, streakBadges: badges, updatedAt: new Date() })
      .where(eq(aivitaUsers.id, userId));
  } catch (err) {
    console.error('updateStreak error:', err);
  }
}
