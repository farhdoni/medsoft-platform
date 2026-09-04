/**
 * Split out of aivita-admin.ts (docs/routes-split-plan.md) — the
 * "aivita:doctors_read/manage" group (5 routes). Still mounted at
 * /v1/aivita-admin, so external paths are unchanged. No permission
 * checks added here.
 */
import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { aivitaUsers, doctorProfiles } from '@medsoft/db';
import { eq, ilike, and, desc, count } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { randomBytes, randomInt } from 'crypto';
import { auditLog } from './aivita-admin-audit.js';

const router = new Hono();
router.use('*', requireAuth);

// GET /v1/aivita-admin/aivita-doctors — list all aivita doctors
router.get('/aivita-doctors', async (c) => {
  const { page = '1', limit = '25', search = '', status = '' } = c.req.query();
  const offset = (Number(page) - 1) * Number(limit);

  const conds = [];
  if (search) conds.push(ilike(aivitaUsers.name, `%${search}%`));
  if (status) conds.push(eq(doctorProfiles.verificationStatus, status));

  const rows = await db
    .select({
      userId: doctorProfiles.userId,
      name: aivitaUsers.name,
      email: aivitaUsers.email,
      phone: aivitaUsers.phone,
      specialization: doctorProfiles.specialization,
      city: doctorProfiles.city,
      verificationStatus: doctorProfiles.verificationStatus,
      diplomaVerified: doctorProfiles.diplomaVerified,
      licenseVerified: doctorProfiles.licenseVerified,
      showInCatalog: doctorProfiles.showInCatalog,
      isActive: doctorProfiles.isActive,
      rating: doctorProfiles.rating,
      totalConsultations: doctorProfiles.totalConsultations,
      consultationPrice: doctorProfiles.consultationPrice,
      createdAt: doctorProfiles.createdAt,
      verifiedAt: doctorProfiles.verifiedAt,
      rejectionReason: doctorProfiles.rejectionReason,
    })
    .from(doctorProfiles)
    .innerJoin(aivitaUsers, eq(doctorProfiles.userId, aivitaUsers.id))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(doctorProfiles.createdAt))
    .limit(Number(limit))
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(doctorProfiles)
    .innerJoin(aivitaUsers, eq(doctorProfiles.userId, aivitaUsers.id))
    .where(conds.length > 0 ? and(...conds) : undefined);

  return c.json({ data: rows, total, page: Number(page), limit: Number(limit) });
});

// GET /v1/aivita-admin/aivita-doctors/:id — single doctor full profile
router.get('/aivita-doctors/:id', async (c) => {
  const { id } = c.req.param();

  const [row] = await db
    .select({
      profile: doctorProfiles,
      name: aivitaUsers.name,
      email: aivitaUsers.email,
      phone: aivitaUsers.phone,
      avatarUrl: aivitaUsers.avatarUrl,
    })
    .from(doctorProfiles)
    .innerJoin(aivitaUsers, eq(doctorProfiles.userId, aivitaUsers.id))
    .where(eq(doctorProfiles.userId, id))
    .limit(1);

  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: row });
});

// PATCH /v1/aivita-admin/aivita-doctors/:id/verify — approve or reject
router.patch('/aivita-doctors/:id/verify', async (c) => {
  const adminId = c.get('adminId') as string;
  const { id } = c.req.param();
  const { action, reason } = await c.req.json() as { action: 'approve' | 'reject'; reason?: string };

  if (!['approve', 'reject'].includes(action)) {
    return c.json({ error: 'action must be approve or reject' }, 400);
  }

  const verificationStatus = action === 'approve' ? 'verified' : 'rejected';
  const now = new Date();

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ verificationStatus: doctorProfiles.verificationStatus })
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, id))
      .limit(1);

    // Первое подтверждение открывает карточку в публичном каталоге. Если
    // врач уже был verified и админ повторно жмёт approve (например, после
    // правки профиля), не трогаем showInCatalog — не перезаписываем выбор,
    // который врач мог сам сделать в настройках видимости.
    const justVerified = action === 'approve' && current?.verificationStatus !== 'verified';

    await tx.update(doctorProfiles)
      .set({
        verificationStatus,
        verifiedAt: action === 'approve' ? now : null,
        verifiedBy: action === 'approve' ? adminId : null,
        rejectionReason: action === 'reject' ? (reason ?? 'Отклонено администратором') : null,
        ...(justVerified ? { showInCatalog: true, isActive: true } : {}),
        ...(action === 'reject' ? { showInCatalog: false } : {}),
        updatedAt: now,
      })
      .where(eq(doctorProfiles.userId, id));
  });

  await auditLog(adminId, `doctor_${action}`, 'doctor_profile', id, { reason }, c.req);

  return c.json({ data: { verificationStatus, userId: id } });
});

// PATCH /v1/aivita-admin/aivita-doctors/:id/catalog — toggle showInCatalog / isActive
router.patch('/aivita-doctors/:id/catalog', async (c) => {
  const adminId = c.get('adminId') as string;
  const { id } = c.req.param();
  const body = await c.req.json() as { showInCatalog?: boolean; isActive?: boolean };

  await db.update(doctorProfiles)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(doctorProfiles.userId, id));

  await auditLog(adminId, 'doctor_catalog_update', 'doctor_profile', id, body as Record<string, unknown>, c.req);

  return c.json({ data: { updated: true } });
});

// POST /v1/aivita-admin/aivita-doctors — create a doctor account (admin)
router.post('/aivita-doctors', async (c) => {
  const adminId = c.get('adminId') as string;
  const body = await c.req.json() as {
    name: string;
    email: string;
    phone?: string;
    specialization?: string;
    password?: string;
  };

  const { name, email, phone, specialization, password: providedPassword } = body;
  if (!name?.trim() || !email?.trim()) {
    return c.json({ error: 'name and email are required' }, 400);
  }

  // Check email uniqueness
  const existing = await db.query.aivitaUsers.findFirst({
    where: eq(aivitaUsers.email, email.trim().toLowerCase()),
  });
  if (existing) return c.json({ error: 'email_taken' }, 409);

  // Generate password if not provided
  const plainPassword = providedPassword?.trim() || randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  // Generate unique nickname
  const base = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 16) || 'doctor';
  const suffix = randomInt(1000, 9999);
  const nickname = `${base}_${suffix}`;

  const now = new Date();

  const [user] = await db.insert(aivitaUsers).values({
    email: email.trim().toLowerCase(),
    nickname,
    name: name.trim(),
    passwordHash,
    provider: 'email',
    locale: 'ru',
    role: 'doctor',
    plan: 'free',
    referralCode: `DR${suffix}`,
    emailVerified: now, // auto-verify since admin created
  }).returning();

  await db.insert(doctorProfiles).values({
    userId: user.id,
    specialization: specialization?.trim() ?? null,
    phone: phone?.trim() ?? null,
    verificationStatus: 'not_verified',
  });

  await auditLog(adminId, 'doctor_create', 'aivita_user', user.id, { email, name, specialization }, c.req);

  return c.json({
    data: {
      userId: user.id,
      email: user.email,
      name: user.name,
      password: plainPassword,
      specialization: specialization ?? null,
    },
  }, 201);
});

export { router as aivitaAdminDoctorsRouter };
