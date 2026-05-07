import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  aivitaUsers,
  healthProfiles,
  allergies,
  chronicConditions,
  sosEvents,
} from '@medsoft/db';
import { eq, desc, and } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const sosRouter = new Hono();
sosRouter.use('*', requireAivitaAuth);

// POST /trigger — create SOS event with GPS + medical data
sosRouter.post('/trigger', async (c) => {
  const userId = c.get('aivitaUserId');
  const body = await c.req.json().catch(() => ({})) as any;
  const { latitude, longitude } = body;

  const [user] = await db.select({ name: aivitaUsers.name })
    .from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);

  const [profile] = await db.select({
    bloodType: healthProfiles.bloodType,
    emergencyContactName: healthProfiles.emergencyContactName,
    emergencyContactPhone: healthProfiles.emergencyContactPhone,
  }).from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1);

  const allergyRows = await db.select({ allergen: allergies.allergen })
    .from(allergies).where(eq(allergies.userId, userId));
  const chronicRows = await db.select({ name: chronicConditions.name })
    .from(chronicConditions).where(eq(chronicConditions.userId, userId));

  const medicalData = {
    blood_group: profile?.bloodType || 'не указано',
    allergies: allergyRows.length ? allergyRows.map(a => a.allergen).join(', ') : 'нет',
    chronic_diseases: chronicRows.length ? chronicRows.map(r => r.name).join(', ') : 'нет',
  };

  const emergencyName = profile?.emergencyContactName || 'не указан';
  const emergencyPhone = profile?.emergencyContactPhone || null;

  const [event] = await db.insert(sosEvents).values({
    userId,
    latitude: latitude != null ? String(latitude) : null,
    longitude: longitude != null ? String(longitude) : null,
    emergencyContactName: emergencyName,
    emergencyContactPhone: emergencyPhone,
    medicalDataSent: medicalData,
  }).returning();

  if (emergencyPhone) {
    try {
      const smsText = [
        `🚨 SOS от ${user?.name || 'Пациент Aivita'}!`,
        latitude && longitude ? `📍 https://maps.google.com/?q=${latitude},${longitude}` : '',
        `🩸 Кровь: ${medicalData.blood_group}`,
        `⚠️ Аллергии: ${medicalData.allergies}`,
        `📞 Скорая: 103`,
      ].filter(Boolean).join('\n');

      const eskizToken = process.env.ESKIZ_TOKEN;
      if (eskizToken) {
        await fetch('https://notify.eskiz.uz/api/message/sms/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${eskizToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile_phone: emergencyPhone.replace(/[^0-9]/g, ''),
            message: smsText,
            from: 'Aivita',
          }),
        });
      } else {
        console.log('[SOS] SMS would be sent to', emergencyPhone, ':', smsText);
      }
      await db.update(sosEvents).set({ smsSent: true }).where(eq(sosEvents.id, event.id));
    } catch (err) {
      console.error('[SOS] SMS error:', err);
    }
  }

  return c.json({ data: event });
});

// GET /history
sosRouter.get('/history', async (c) => {
  const userId = c.get('aivitaUserId');
  const data = await db.select().from(sosEvents)
    .where(eq(sosEvents.userId, userId))
    .orderBy(desc(sosEvents.createdAt)).limit(20);
  return c.json({ data });
});

// PUT /:id/resolve
sosRouter.put('/:id/resolve', async (c) => {
  const userId = c.get('aivitaUserId');
  await db.update(sosEvents)
    .set({ resolvedAt: new Date() })
    .where(and(eq(sosEvents.id, c.req.param('id')), eq(sosEvents.userId, userId)));
  return c.json({ data: { success: true } });
});

export default sosRouter;
