import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { userDevices } from '@medsoft/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaUserDevicesRouter = new Hono();

aivitaUserDevicesRouter.use('*', requireAivitaAuth);

// ─── Device catalog (static) ───────────────────────────────────────────────────

const DEVICE_CATALOG = [
  {
    type: 'xiaomi_band',
    name: 'Xiaomi Mi Band / Redmi Band',
    icon: 'xiaomi',
    metrics: ['heart_rate', 'steps', 'sleep_hours', 'spo2'],
    status: 'available',
    connectMethod: 'google_fit',
    instructions: [
      'Установите приложение Mi Fitness на телефон',
      'Синхронизируйте браслет с Mi Fitness',
      'В настройках Mi Fitness подключите Google Fit',
      'Вернитесь и нажмите "Подключить через Google Fit"',
    ],
  },
  {
    type: 'samsung_galaxy_watch',
    name: 'Samsung Galaxy Watch / Fit',
    icon: 'samsung',
    metrics: ['heart_rate', 'steps', 'sleep_hours', 'blood_pressure', 'spo2'],
    status: 'available',
    connectMethod: 'google_fit',
    instructions: [
      'Откройте Samsung Health на телефоне',
      'Перейдите в Настройки → Подключённые сервисы',
      'Включите синхронизацию с Google Fit',
      'Вернитесь и нажмите "Подключить через Google Fit"',
    ],
  },
  {
    type: 'google_fit',
    name: 'Google Fit',
    icon: 'google',
    metrics: ['heart_rate', 'steps', 'sleep_hours', 'weight'],
    status: 'available',
    connectMethod: 'oauth',
    instructions: [],
  },
  {
    type: 'huawei_band',
    name: 'Huawei Band / Watch',
    icon: 'huawei',
    metrics: ['heart_rate', 'steps', 'sleep_hours', 'spo2'],
    status: 'coming_soon',
    connectMethod: 'huawei_health_api',
    instructions: [],
  },
  {
    type: 'apple_health',
    name: 'Apple Health',
    icon: 'apple',
    metrics: ['heart_rate', 'steps', 'sleep_hours', 'weight', 'spo2'],
    status: 'coming_soon',
    connectMethod: 'healthkit',
    instructions: [],
  },
  {
    type: 'garmin',
    name: 'Garmin',
    icon: 'garmin',
    metrics: ['heart_rate', 'steps', 'sleep_hours', 'spo2'],
    status: 'coming_soon',
    connectMethod: 'garmin_api',
    instructions: [],
  },
];

// ─── GET /devices/catalog ──────────────────────────────────────────────────────

aivitaUserDevicesRouter.get('/catalog', async (c) => {
  return c.json({ data: DEVICE_CATALOG });
});

// ─── GET /devices ──────────────────────────────────────────────────────────────

aivitaUserDevicesRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(userDevices)
    .where(eq(userDevices.userId, userId))
    .orderBy(desc(userDevices.connectedAt));
  return c.json({ data: rows });
});

// ─── POST /devices ─────────────────────────────────────────────────────────────

aivitaUserDevicesRouter.post(
  '/',
  zValidator('json', z.object({
    type: z.string().min(1),
    name: z.string().min(1),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    const [row] = await db.insert(userDevices).values({
      userId,
      type: body.type,
      name: body.name,
      status: 'connected',
      accessToken: body.accessToken ?? null,
      refreshToken: body.refreshToken ?? null,
      metadata: body.metadata ?? null,
      connectedAt: new Date(),
    }).returning();

    return c.json({ data: row }, 201);
  }
);

// ─── POST /devices/:id/sync ────────────────────────────────────────────────────

aivitaUserDevicesRouter.post('/:id/sync', async (c) => {
  const userId = c.get('aivitaUserId');
  const id = c.req.param('id');

  const [device] = await db.select().from(userDevices)
    .where(and(eq(userDevices.id, id), eq(userDevices.userId, userId)));

  if (!device) return c.json({ error: 'Device not found' }, 404);

  await db.update(userDevices)
    .set({ lastSyncAt: new Date() })
    .where(eq(userDevices.id, id));

  return c.json({ data: { synced: true, lastSyncAt: new Date() } });
});

// ─── DELETE /devices/:id ───────────────────────────────────────────────────────

aivitaUserDevicesRouter.delete('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const id = c.req.param('id');

  await db.delete(userDevices)
    .where(and(eq(userDevices.id, id), eq(userDevices.userId, userId)));

  return c.json({ data: { success: true } });
});
