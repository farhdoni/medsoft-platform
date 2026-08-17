import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { ecosystemAppointments } from '@medsoft/db/schema/ecosystem-appointments';
import { and, eq } from 'drizzle-orm';
import { requirePartnerAuth } from '../../middleware/partner-auth.js';
import { resolvePatientLink } from '../../lib/identity-resolver.js';

// POST /ecosystem/v1/appointments — a partner clinic (e.g. MedSoft) pushes
// the fact that ITS OWN patient has an appointment with ITS OWN doctor. The
// doctor/slot belong to the partner, not AIVITA — AIVITA only resolves the
// patient identity and stores the fact. See ecosystem-appointments.ts for
// why this isn't the internal booking flow.
//
// Only externalId ever goes back to the partner — never the internal
// personId/uuid resolvePatientLink returns.

const router = new Hono();
router.use('*', requirePartnerAuth);

const hintsSchema = z.object({
  phone: z.string().optional(),
  telegramUserId: z.string().optional(),
  externalId: z.string().optional(),
}).default({});

const pushAppointmentSchema = z.object({
  partnerLocalId: z.string().min(1),
  partnerAppointmentId: z.string().min(1),
  scheduledAt: z.string().min(1),
  serviceLabel: z.string().optional(),
  doctorLabel: z.string().optional(),
  status: z.string().optional(),
  hints: hintsSchema,
});

router.post('/', zValidator('json', pushAppointmentSchema), async (c) => {
  const partner = c.get('partnerClinic');
  const body = c.req.valid('json');

  const scheduledAt = new Date(body.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    return c.json({ error: 'Invalid scheduledAt' }, 400);
  }

  const resolved = await resolvePatientLink(partner.code, body.partnerLocalId, body.hints);

  if (resolved.status === 'no_match') {
    return c.json({
      status: 'no_match',
      message: 'Patient not linked to an AIVITA account yet — resend once identified.',
    }, 202);
  }
  if (resolved.status === 'quarantine') {
    return c.json({
      status: 'quarantine',
      message: 'Patient link exists but is not confirmed yet.',
    }, 202);
  }
  if (resolved.status === 'ambiguous') {
    return c.json({
      status: 'ambiguous',
      message: 'Multiple AIVITA accounts matched this patient — resolve manually before pushing this appointment.',
    }, 409);
  }

  // resolved.status === 'linked' — only case that writes a row.
  const [inserted] = await db.insert(ecosystemAppointments).values({
    personId: resolved.personId,
    partnerCode: partner.code,
    partnerLocalId: body.partnerLocalId,
    partnerAppointmentId: body.partnerAppointmentId,
    scheduledAt,
    serviceLabel: body.serviceLabel ?? null,
    doctorLabel: body.doctorLabel ?? null,
    status: body.status ?? 'scheduled',
  })
    .onConflictDoNothing({
      target: [ecosystemAppointments.partnerCode, ecosystemAppointments.partnerAppointmentId],
    })
    .returning();

  if (inserted) {
    return c.json({
      externalId: resolved.externalId,
      appointment: {
        partnerAppointmentId: inserted.partnerAppointmentId,
        scheduledAt: inserted.scheduledAt.toISOString(),
        status: inserted.status,
      },
      duplicate: false,
    }, 201);
  }

  // Lost the race, or a genuine replay of an already-pushed appointment.
  const [existing] = await db.select().from(ecosystemAppointments)
    .where(and(
      eq(ecosystemAppointments.partnerCode, partner.code),
      eq(ecosystemAppointments.partnerAppointmentId, body.partnerAppointmentId),
    ))
    .limit(1);

  if (!existing) {
    // Unreachable: onConflictDoNothing only no-ops on the unique constraint
    // this exact query conflicts on.
    throw new Error('ecosystem appointment insert conflicted but no existing row found');
  }

  if (existing.personId !== resolved.personId) {
    // Partner reused partnerAppointmentId for a different local patient —
    // a real collision, not a replay. Never return the wrong patient's
    // externalId.
    return c.json({
      status: 'conflict',
      message: 'partnerAppointmentId already used for a different patient.',
    }, 409);
  }

  return c.json({
    externalId: resolved.externalId,
    appointment: {
      partnerAppointmentId: existing.partnerAppointmentId,
      scheduledAt: existing.scheduledAt.toISOString(),
      status: existing.status,
    },
    duplicate: true,
  }, 200);
});

export { router as ecosystemAppointmentsRouter };
