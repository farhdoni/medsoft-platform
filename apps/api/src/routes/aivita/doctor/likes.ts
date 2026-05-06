import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { aivitaLikes, doctorProfiles, aivitaUsers } from '@medsoft/db';
import { eq, and, sql } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorLikesRouter = new Hono();

// POST /toggle — поставить/убрать лайк врачу (auth required)
doctorLikesRouter.post('/toggle', requireAivitaAuth, async (c) => {
  const fromUserId = c.get('aivitaUserId');
  const { doctorId, type = 'like' } = await c.req.json() as { doctorId: string; type?: string };

  const [existing] = await db.select().from(aivitaLikes)
    .where(and(
      eq(aivitaLikes.fromUserId, fromUserId),
      eq(aivitaLikes.toUserId, doctorId),
      eq(aivitaLikes.type, type),
    )).limit(1);

  if (existing) {
    await db.delete(aivitaLikes).where(and(
      eq(aivitaLikes.fromUserId, fromUserId),
      eq(aivitaLikes.toUserId, doctorId),
      eq(aivitaLikes.type, type),
    ));
    if (type === 'like') {
      await db.update(doctorProfiles)
        .set({ likesCount: sql`GREATEST(likes_count - 1, 0)` })
        .where(eq(doctorProfiles.userId, doctorId));
    } else if (type === 'thank') {
      await db.update(doctorProfiles)
        .set({ thanksCount: sql`GREATEST(thanks_count - 1, 0)` })
        .where(eq(doctorProfiles.userId, doctorId));
    } else if (type === 'recommend') {
      await db.update(doctorProfiles)
        .set({ recommendsCount: sql`GREATEST(recommends_count - 1, 0)` })
        .where(eq(doctorProfiles.userId, doctorId));
    }
    return c.json({ data: { liked: false, type } });
  } else {
    await db.insert(aivitaLikes).values({ fromUserId, toUserId: doctorId, type });
    if (type === 'like') {
      await db.update(doctorProfiles)
        .set({ likesCount: sql`likes_count + 1` })
        .where(eq(doctorProfiles.userId, doctorId));
    } else if (type === 'thank') {
      await db.update(doctorProfiles)
        .set({ thanksCount: sql`thanks_count + 1` })
        .where(eq(doctorProfiles.userId, doctorId));
    } else if (type === 'recommend') {
      await db.update(doctorProfiles)
        .set({ recommendsCount: sql`recommends_count + 1` })
        .where(eq(doctorProfiles.userId, doctorId));
    }
    return c.json({ data: { liked: true, type } });
  }
});

// GET /check?doctorId=ID&type=like — проверить лайк (auth required)
doctorLikesRouter.get('/check', requireAivitaAuth, async (c) => {
  const fromUserId = c.get('aivitaUserId');
  const { doctorId, type = 'like' } = c.req.query();
  if (!doctorId) return c.json({ error: 'doctorId required' }, 400);

  const [existing] = await db.select().from(aivitaLikes)
    .where(and(
      eq(aivitaLikes.fromUserId, fromUserId),
      eq(aivitaLikes.toUserId, doctorId),
      eq(aivitaLikes.type, type),
    )).limit(1);
  return c.json({ data: { liked: !!existing } });
});

// GET /doctor/:id — кто лайкнул врача (публичный)
doctorLikesRouter.get('/doctor/:id', async (c) => {
  const toUserId = c.req.param('id');
  const data = await db.select({
    like: aivitaLikes,
    user: { id: aivitaUsers.id, name: aivitaUsers.name, avatarUrl: aivitaUsers.avatarUrl },
  }).from(aivitaLikes)
    .innerJoin(aivitaUsers, eq(aivitaLikes.fromUserId, aivitaUsers.id))
    .where(eq(aivitaLikes.toUserId, toUserId));
  return c.json({ data });
});
