import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { reminderSettings, customReminders } from '@medsoft/db';
import { eq, and } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const remindersRouter = new Hono();

remindersRouter.use('*', requireAivitaAuth);

// ─── Default settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  medication:  { enabled: true,  sound: 'medication', voice: true,  persistent: true  },
  appointment: { enabled: true,  sound: 'standard',   voice: true,  persistent: false },
  vitals:      { enabled: true,  sound: 'standard',   voice: true,  persistent: false },
  water:       { enabled: true,  sound: 'soft',       voice: false, persistent: false, intervalHours: 2 },
  nutrition:   { enabled: false, sound: 'soft',       voice: false, persistent: false },
  mood:        { enabled: true,  sound: 'soft',       voice: false, persistent: false, time: '21:00' },
  exercise:    { enabled: false, sound: 'soft',       voice: false, persistent: false },
  breathing:   { enabled: false, sound: 'soft',       voice: false, persistent: false },
  checkup:     { enabled: true,  sound: 'standard',   voice: false, persistent: false },
  custom:      { enabled: true,  sound: 'standard',   voice: false, persistent: false },
};

// ─── GET /reminders/settings ──────────────────────────────────────────────────

remindersRouter.get('/settings', async (c) => {
  const userId = c.get('aivitaUserId');

  const [row] = await db.select()
    .from(reminderSettings)
    .where(eq(reminderSettings.userId, userId))
    .limit(1);

  if (!row) {
    return c.json({
      data: {
        settings:           DEFAULT_SETTINGS,
        quietHoursStart:    '23:00',
        quietHoursEnd:      '07:00',
        globalVoiceEnabled: true,
        globalSoundEnabled: true,
        globalVolume:       80,
      },
    });
  }

  const mergedSettings = { ...DEFAULT_SETTINGS, ...(row.settings as Record<string, unknown>) };
  return c.json({
    data: {
      settings:           mergedSettings,
      quietHoursStart:    row.quietHoursStart,
      quietHoursEnd:      row.quietHoursEnd,
      globalVoiceEnabled: row.globalVoiceEnabled,
      globalSoundEnabled: row.globalSoundEnabled,
      globalVolume:       row.globalVolume,
    },
  });
});

// ─── PUT /reminders/settings ──────────────────────────────────────────────────

remindersRouter.put(
  '/settings',
  zValidator('json', z.object({
    settings:           z.record(z.unknown()).optional(),
    quietHoursStart:    z.string().regex(/^\d{2}:\d{2}$/).optional(),
    quietHoursEnd:      z.string().regex(/^\d{2}:\d{2}$/).optional(),
    globalVoiceEnabled: z.boolean().optional(),
    globalSoundEnabled: z.boolean().optional(),
    globalVolume:       z.number().int().min(0).max(100).optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body   = c.req.valid('json');

    const [existing] = await db.select({ id: reminderSettings.id })
      .from(reminderSettings)
      .where(eq(reminderSettings.userId, userId))
      .limit(1);

    const payload = {
      userId,
      ...(body.settings           !== undefined ? { settings: body.settings }                  : {}),
      ...(body.quietHoursStart    !== undefined ? { quietHoursStart: body.quietHoursStart }    : {}),
      ...(body.quietHoursEnd      !== undefined ? { quietHoursEnd: body.quietHoursEnd }        : {}),
      ...(body.globalVoiceEnabled !== undefined ? { globalVoiceEnabled: body.globalVoiceEnabled } : {}),
      ...(body.globalSoundEnabled !== undefined ? { globalSoundEnabled: body.globalSoundEnabled } : {}),
      ...(body.globalVolume       !== undefined ? { globalVolume: body.globalVolume }           : {}),
      updatedAt: new Date(),
    };

    let row;
    if (existing) {
      [row] = await db.update(reminderSettings)
        .set(payload)
        .where(eq(reminderSettings.id, existing.id))
        .returning();
    } else {
      [row] = await db.insert(reminderSettings).values(payload).returning();
    }

    return c.json({ data: row });
  }
);

// ─── GET /reminders/custom ────────────────────────────────────────────────────

remindersRouter.get('/custom', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select()
    .from(customReminders)
    .where(and(eq(customReminders.userId, userId), eq(customReminders.isActive, true)));
  return c.json({ data: rows });
});

// ─── POST /reminders/custom ───────────────────────────────────────────────────

remindersRouter.post(
  '/custom',
  zValidator('json', z.object({
    title:        z.string().min(1).max(200),
    time:         z.string().regex(/^\d{2}:\d{2}$/),
    repeat:       z.enum(['daily', 'weekdays', 'weekly', 'once']).optional().default('daily'),
    voiceEnabled: z.boolean().optional().default(false),
    voiceText:    z.string().max(300).optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body   = c.req.valid('json');
    const [row] = await db.insert(customReminders).values({ userId, ...body }).returning();
    return c.json({ data: row }, 201);
  }
);

// ─── PUT /reminders/custom/:id ────────────────────────────────────────────────

remindersRouter.put(
  '/custom/:id',
  zValidator('json', z.object({
    title:        z.string().min(1).max(200).optional(),
    time:         z.string().regex(/^\d{2}:\d{2}$/).optional(),
    repeat:       z.enum(['daily', 'weekdays', 'weekly', 'once']).optional(),
    voiceEnabled: z.boolean().optional(),
    voiceText:    z.string().max(300).optional(),
    isActive:     z.boolean().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const id     = Number(c.req.param('id'));
    const body   = c.req.valid('json');

    const [row] = await db.update(customReminders)
      .set(body)
      .where(and(eq(customReminders.id, id), eq(customReminders.userId, userId)))
      .returning();

    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json({ data: row });
  }
);

// ─── DELETE /reminders/custom/:id ────────────────────────────────────────────

remindersRouter.delete('/custom/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const id     = Number(c.req.param('id'));

  await db.update(customReminders)
    .set({ isActive: false })
    .where(and(eq(customReminders.id, id), eq(customReminders.userId, userId)));

  return c.json({ data: { deleted: true } });
});
