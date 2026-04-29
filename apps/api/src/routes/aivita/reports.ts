import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import {
  doctorReports, healthScores, systemTestResults, healthProfiles,
  chronicConditions, allergies, medicalHistory, vitals,
} from '@medsoft/db';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaReportsRouter = new Hono();

aivitaReportsRouter.use('*', requireAivitaAuth);

// ─── List reports ──────────────────────────────────────────────────────────────
aivitaReportsRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(doctorReports)
    .where(eq(doctorReports.userId, userId))
    .orderBy(desc(doctorReports.createdAt))
    .limit(20);
  return c.json({ data: rows });
});

// ─── Get single report ─────────────────────────────────────────────────────────
aivitaReportsRouter.get('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  const report = await db.query.doctorReports.findFirst({
    where: and(eq(doctorReports.id, id), eq(doctorReports.userId, userId)),
  });
  if (!report) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: report });
});

// ─── Get by share token (public) ───────────────────────────────────────────────
aivitaReportsRouter.get('/shared/:token', async (c) => {
  const { token } = c.req.param();
  const report = await db.query.doctorReports.findFirst({
    where: eq(doctorReports.shareToken, token),
  });

  if (!report) return c.json({ error: 'Not found' }, 404);

  if (report.shareTokenExpiresAt && report.shareTokenExpiresAt < new Date()) {
    return c.json({ error: 'Link expired' }, 410);
  }

  // Increment view count
  await db.update(doctorReports)
    .set({
      viewedCount: (report.viewedCount ?? 0) + 1,
      lastViewedAt: new Date(),
    })
    .where(eq(doctorReports.id, report.id));

  return c.json({ data: report });
});

// ─── Generate new report ───────────────────────────────────────────────────────
aivitaReportsRouter.post('/generate', async (c) => {
  const userId = c.get('aivitaUserId');

  // Collect snapshot data
  const [profile, allergyRows, chronicRows, historyRows, latestVital, latestScore] =
    await Promise.all([
      db.query.healthProfiles.findFirst({ where: eq(healthProfiles.userId, userId) }),
      db.select().from(allergies).where(and(eq(allergies.userId, userId), isNull(allergies.deletedAt))),
      db.select().from(chronicConditions).where(and(eq(chronicConditions.userId, userId), isNull(chronicConditions.deletedAt))),
      db.select().from(medicalHistory).where(and(eq(medicalHistory.userId, userId), isNull(medicalHistory.deletedAt))),
      db.query.vitals.findFirst({ where: eq(vitals.userId, userId), orderBy: desc(vitals.recordedAt) }),
      db.query.healthScores.findFirst({ where: eq(healthScores.userId, userId), orderBy: desc(healthScores.calculatedAt) }),
    ]);

  const reportNumber = `AR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const shareToken = `sh_${Math.random().toString(36).slice(2, 18)}`;
  const shareExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const snapshotData = {
    patient: {
      birthDate: profile?.birthDate,
      gender: profile?.gender,
      bloodType: profile?.bloodType,
      heightCm: profile?.heightCm,
      weightKg: profile?.weightKg,
      healthScore: latestScore?.totalScore ?? null,
    },
    allergies: allergyRows,
    chronic: chronicRows,
    history: historyRows,
    vitals: latestVital ?? null,
  };

  // fileUrl is a required field — placeholder for PDF generation
  const fileUrl = `https://api.aivita.uz/v1/aivita/reports/shared/${shareToken}/pdf`;

  const [report] = await db.insert(doctorReports).values({
    userId,
    reportNumber,
    fileUrl,
    snapshotData,
    shareToken,
    shareTokenExpiresAt: shareExpires,
  }).returning();

  return c.json({ data: report }, 201);
});
