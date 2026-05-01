import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@medsoft/db';
import { adminUsers } from '@medsoft/db';
import { eq, ilike, and, or } from 'drizzle-orm';
import { requireAuth, requireSuperadmin } from '../middleware/auth.js';
import { createAdminSchema, updateAdminSchema, adminFiltersSchema } from '@medsoft/shared';

const router = new Hono();

// /me is accessible to any authenticated admin (not just superadmin)
router.get('/me', requireAuth, async (c) => {
  const adminId = c.get('adminId');
  const rows = await db
    .select({ id: adminUsers.id, email: adminUsers.email, fullName: adminUsers.fullName, role: adminUsers.role, isActive: adminUsers.isActive })
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1);
  if (!rows[0]) return c.json({ error: 'Not found' }, 404);
  return c.json(rows[0]);
});

router.use('*', requireAuth, requireSuperadmin);

router.get('/', zValidator('query', adminFiltersSchema), async (c) => {
  const { search, role, isActive, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (search) {
    conditions.push(or(
      ilike(adminUsers.fullName, `%${search}%`),
      ilike(adminUsers.email, `%${search}%`),
    )!);
  }
  if (role) conditions.push(eq(adminUsers.role, role));
  if (isActive !== undefined) conditions.push(eq(adminUsers.isActive, isActive));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, total] = await Promise.all([
    db.select({
      id: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
    }).from(adminUsers).where(where).limit(limit).offset(offset).orderBy(adminUsers.createdAt),
    db.$count(adminUsers, where),
  ]);

  return c.json({ data: rows, total: Number(total), page, limit });
});

router.get('/:id', async (c) => {
  const row = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, c.req.param('id')),
    columns: { totpSecret: false, backupCodesHash: false },
  });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.post('/', zValidator('json', createAdminSchema), async (c) => {
  const data = c.req.valid('json');
  const [row] = await db.insert(adminUsers).values(data).returning({
    id: adminUsers.id,
    email: adminUsers.email,
    fullName: adminUsers.fullName,
    role: adminUsers.role,
    isActive: adminUsers.isActive,
    createdAt: adminUsers.createdAt,
  });
  return c.json(row, 201);
});

router.patch('/:id', zValidator('json', updateAdminSchema), async (c) => {
  const data = c.req.valid('json');
  const [row] = await db.update(adminUsers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(adminUsers.id, c.req.param('id')))
    .returning({
      id: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      updatedAt: adminUsers.updatedAt,
    });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.delete('/:id', async (c) => {
  const selfId = c.get('adminId');
  if (selfId === c.req.param('id')) {
    return c.json({ error: 'Cannot delete yourself' }, 400);
  }
  const [row] = await db.update(adminUsers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(adminUsers.id, c.req.param('id')))
    .returning({ id: adminUsers.id });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

export { router as adminsRouter };
