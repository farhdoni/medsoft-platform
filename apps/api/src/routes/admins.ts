import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { adminUsers } from '@medsoft/db';
import { eq, sql } from 'drizzle-orm';
import { createAdminSchema } from '@medsoft/shared';
import { requireAuth, requireRole } from '../middleware/auth';
import { logAudit } from '../services/audit';

export const adminsRouter = new Hono();
adminsRouter.use('*', requireAuth, requireRole('superadmin'));

adminsRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1);
  const limit = Math.min(Number(c.req.query('limit') || 50), 100);
  const offset = (page - 1) * limit;
  const [rows, [{ count }]] = await Promise.all([
    db.select({ id: adminUsers.id, email: adminUsers.email, fullName: adminUsers.fullName, role: adminUsers.role, isActive: adminUsers.isActive, lastLoginAt: adminUsers.lastLoginAt, createdAt: adminUsers.createdAt }).from(adminUsers).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(adminUsers),
  ]);
  return c.json({ data: rows, total: count, page, limit });
});

adminsRouter.post('/', zValidator('json', createAdminSchema), async (c) => {
  const data = c.req.valid('json');
  const actor = c.get('admin' as never) as { id: string };
  const [row] = await db.insert(adminUsers).values({ ...data, email: data.email.toLowerCase() }).returning({ id: adminUsers.id, email: adminUsers.email, fullName: adminUsers.fullName, role: adminUsers.role });
  await logAudit(actor.id, 'admin.create', 'admin_user', row.id);
  return c.json(row, 201);
});

adminsRouter.patch('/:id', zValidator('json', z.object({ isActive: z.boolean().optional(), role: z.enum(['admin', 'viewer']).optional() })), async (c) => {
  const data = c.req.valid('json');
  const actor = c.get('admin' as never) as { id: string };
  const [row] = await db.update(adminUsers).set({ ...data, updatedAt: new Date() }).where(eq(adminUsers.id, c.req.param('id'))).returning({ id: adminUsers.id, email: adminUsers.email, isActive: adminUsers.isActive, role: adminUsers.role });
  await logAudit(actor.id, 'admin.update', 'admin_user', c.req.param('id'));
  return c.json(row);
});

adminsRouter.delete('/:id', async (c) => {
  const actor = c.get('admin' as never) as { id: string };
  await db.update(adminUsers).set({ isActive: false, updatedAt: new Date() }).where(eq(adminUsers.id, c.req.param('id')));
  await logAudit(actor.id, 'admin.delete', 'admin_user', c.req.param('id'));
  return c.json({ message: 'Deactivated' });
});
