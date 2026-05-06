import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { doctorSchedule, aivitaAppointments } from '@medsoft/db';
import { eq, and, gte, lte, ne, asc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorScheduleRouter = new Hono();

// GET / — моё расписание (auth required)
doctorScheduleRouter.get('/', requireAivitaAuth, async (c) => {
  const data = await db.select().from(doctorSchedule)
    .where(eq(doctorSchedule.doctorId, c.get('aivitaUserId')))
    .orderBy(asc(doctorSchedule.dayOfWeek));
  return c.json({ data });
});

// PUT / — обновить расписание (массив дней)
doctorScheduleRouter.put('/', requireAivitaAuth, async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { days } = await c.req.json() as {
    days: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      breakStart?: string;
      breakEnd?: string;
      slotDurationMinutes?: number;
      isActive?: boolean;
    }>;
  };

  await db.delete(doctorSchedule).where(eq(doctorSchedule.doctorId, doctorId));

  if (days?.length) {
    await db.insert(doctorSchedule).values(
      days.map(d => ({ doctorId, ...d }))
    );
  }

  const data = await db.select().from(doctorSchedule)
    .where(eq(doctorSchedule.doctorId, doctorId))
    .orderBy(asc(doctorSchedule.dayOfWeek));
  return c.json({ data });
});

// GET /slots?date=YYYY-MM-DD&doctorId=ID — свободные слоты (ПУБЛИЧНЫЙ)
doctorScheduleRouter.get('/slots', async (c) => {
  const { date, doctorId } = c.req.query();
  if (!date || !doctorId) return c.json({ error: 'date and doctorId required' }, 400);

  const jsDay = new Date(date).getDay(); // 0=вс, 1=пн
  const day = jsDay === 0 ? 6 : jsDay - 1; // 0=пн, ..., 6=вс

  const [schedule] = await db.select().from(doctorSchedule)
    .where(and(
      eq(doctorSchedule.doctorId, doctorId),
      eq(doctorSchedule.dayOfWeek, day),
      eq(doctorSchedule.isActive, true),
    )).limit(1);

  if (!schedule) return c.json({ data: [] });

  const start = parseTime(schedule.startTime);
  const end = parseTime(schedule.endTime);
  const breakS = schedule.breakStart ? parseTime(schedule.breakStart) : null;
  const breakE = schedule.breakEnd ? parseTime(schedule.breakEnd) : null;
  const dur = schedule.slotDurationMinutes;

  const slots: string[] = [];
  let current = start;
  while (current + dur <= end) {
    if (breakS !== null && breakE !== null && current >= breakS && current < breakE) {
      current = breakE;
      continue;
    }
    slots.push(formatTime(current));
    current += dur;
  }

  const dateStart = new Date(`${date}T00:00:00`);
  const dateEnd = new Date(`${date}T23:59:59`);
  const booked = await db.select({ scheduledAt: aivitaAppointments.scheduledAt })
    .from(aivitaAppointments)
    .where(and(
      eq(aivitaAppointments.doctorId, doctorId),
      gte(aivitaAppointments.scheduledAt, dateStart),
      lte(aivitaAppointments.scheduledAt, dateEnd),
      ne(aivitaAppointments.status, 'cancelled'),
    ));

  const bookedTimes = booked.map(b =>
    formatTime(b.scheduledAt.getHours() * 60 + b.scheduledAt.getMinutes())
  );

  const available = slots.filter(s => !bookedTimes.includes(s));
  return c.json({ data: available });
});

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
