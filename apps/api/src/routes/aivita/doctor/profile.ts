import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { doctorProfiles } from '@medsoft/db';
import { eq } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorProfileRouter = new Hono();

doctorProfileRouter.use('*', requireAivitaAuth);

// GET / — мой профиль врача
doctorProfileRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const [profile] = await db.select().from(doctorProfiles)
    .where(eq(doctorProfiles.userId, userId)).limit(1);
  if (!profile) {
    const [newProfile] = await db.insert(doctorProfiles)
      .values({ userId }).returning();
    return c.json({ data: newProfile });
  }
  return c.json({ data: profile });
});

// PUT / — обновить профиль (partial merge)
doctorProfileRouter.put('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const body = await c.req.json() as Record<string, unknown>;
  delete body.id;
  delete body.userId;
  delete body.createdAt;
  delete body.verificationStatus;
  delete body.verifiedAt;
  delete body.verifiedBy;
  body.updatedAt = new Date();

  const [updated] = await db.update(doctorProfiles).set(body as any)
    .where(eq(doctorProfiles.userId, userId)).returning();
  if (!updated) {
    const [created] = await db.insert(doctorProfiles)
      .values({ userId, ...(body as object) } as any).returning();
    return c.json({ data: created });
  }
  return c.json({ data: updated });
});

// POST /certificates — добавить сертификат
doctorProfileRouter.post('/certificates', async (c) => {
  const userId = c.get('aivitaUserId');
  const cert = await c.req.json();
  const [profile] = await db.select().from(doctorProfiles)
    .where(eq(doctorProfiles.userId, userId)).limit(1);
  const certs = ((profile?.certificates ?? []) as Array<{ title: string; year?: number; scanUrl?: string }>);
  certs.push({ ...cert, addedAt: new Date().toISOString(), status: 'pending' } as any);
  const [updated] = await db.update(doctorProfiles)
    .set({ certificates: certs, updatedAt: new Date() })
    .where(eq(doctorProfiles.userId, userId)).returning();
  return c.json({ data: updated });
});

// DELETE /certificates/:index — удалить сертификат
doctorProfileRouter.delete('/certificates/:index', async (c) => {
  const userId = c.get('aivitaUserId');
  const index = parseInt(c.req.param('index'));
  const [profile] = await db.select().from(doctorProfiles)
    .where(eq(doctorProfiles.userId, userId)).limit(1);
  const certs = ((profile?.certificates ?? []) as Array<{ title: string; year?: number; scanUrl?: string }>);
  if (index >= 0 && index < certs.length) certs.splice(index, 1);
  const [updated] = await db.update(doctorProfiles)
    .set({ certificates: certs, updatedAt: new Date() })
    .where(eq(doctorProfiles.userId, userId)).returning();
  return c.json({ data: updated });
});

// GET /completion — процент заполненности профиля
doctorProfileRouter.get('/completion', async (c) => {
  const userId = c.get('aivitaUserId');
  const [p] = await db.select().from(doctorProfiles)
    .where(eq(doctorProfiles.userId, userId)).limit(1);
  if (!p) return c.json({ data: { percent: 0 } });

  const fields = [
    { filled: !!p.dateOfBirth, w: 2 },
    { filled: !!p.passportNumber, w: 3 },
    { filled: !!p.phone, w: 2 },
    { filled: !!p.photoUrl, w: 3 },
    { filled: !!p.specialization, w: 5 },
    { filled: !!p.experienceStartDate, w: 2 },
    { filled: !!p.bio, w: 2 },
    { filled: !!p.diplomaUniversity, w: 3 },
    { filled: !!p.diplomaScanUrl, w: 5 },
    { filled: ((p.certificates as object[]) ?? []).length > 0, w: 4 },
    { filled: !!p.city, w: 1 },
    { filled: ((p.languages as string[]) ?? []).length > 0, w: 1 },
    { filled: ((p.additionalSkills as string[]) ?? []).length > 0, w: 1 },
    { filled: ((p.diseasesTreated as string[]) ?? []).length > 0, w: 1 },
  ];
  const total = fields.reduce((s, f) => s + f.w, 0);
  const done = fields.filter(f => f.filled).reduce((s, f) => s + f.w, 0);
  return c.json({ data: { percent: Math.round((done / total) * 100) } });
});
