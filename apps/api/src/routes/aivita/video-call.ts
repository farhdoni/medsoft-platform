import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { videoCalls, aivitaUsers, doctorProfiles, doctorMessages, doctorConversations } from '@medsoft/db';
import { eq, and, or, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { createNotification } from '../../lib/notification-service.js';

export const videoCallRouter = new Hono();

videoCallRouter.use('*', requireAivitaAuth);

// POST /create — doctor creates a video call (notifies patient + posts to conversation)
videoCallRouter.post('/create', async (c) => {
  const doctorId = c.get('aivitaUserId');

  const [me] = await db.select({ role: aivitaUsers.role, name: aivitaUsers.name })
    .from(aivitaUsers).where(eq(aivitaUsers.id, doctorId)).limit(1);
  if (me?.role !== 'doctor') return c.json({ error: 'Only doctors can initiate calls' }, 403);

  const body = await c.req.json() as { patientId: string; convId?: string; scheduledAt?: string };
  const { patientId, convId, scheduledAt } = body;
  if (!patientId) return c.json({ error: 'patientId required' }, 400);

  const roomId = `aivita-${doctorId.slice(0, 8)}-${Date.now()}`;
  const joinUrl = `https://meet.jit.si/${roomId}`;

  const [call] = await db.insert(videoCalls).values({
    roomId,
    doctorId,
    patientId,
    conversationId: convId ?? null,
    status: 'scheduled',
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
  }).returning();

  // Get doctor name for notification
  const [profile] = await db.select({ specialization: doctorProfiles.specialization })
    .from(doctorProfiles).where(eq(doctorProfiles.userId, doctorId)).limit(1);
  const specLabel = profile?.specialization ? ` (${profile.specialization})` : '';

  // Notify patient
  await createNotification(
    patientId,
    'action_required',
    '📹 Входящий видеозвонок',
    `Доктор ${me.name}${specLabel} приглашает вас на видеоконсультацию`,
    {
      link: `/video-call/${roomId}?callId=${call.id}`,
      priority: 'urgent',
      metadata: { callId: call.id, roomId, type: 'video_call' },
    }
  ).catch(() => {});

  // Post video_call message to conversation if convId provided
  if (convId) {
    await db.insert(doctorMessages).values({
      conversationId: convId,
      senderId: doctorId,
      senderRole: 'doctor',
      type: 'video_call',
      content: '📹 Видеоконсультация',
      metadata: { callId: call.id, roomId, joinUrl, status: 'scheduled' },
    }).catch(() => {});
    await db.update(doctorConversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(doctorConversations.id, convId))
      .catch(() => {});
  }

  return c.json({ data: { id: call.id, roomId, joinUrl } });
});

// GET /active — get active/scheduled call for current user
videoCallRouter.get('/active', async (c) => {
  const userId = c.get('aivitaUserId');

  const [call] = await db.select().from(videoCalls)
    .where(
      and(
        or(eq(videoCalls.doctorId, userId), eq(videoCalls.patientId, userId)),
        or(eq(videoCalls.status, 'scheduled'), eq(videoCalls.status, 'active'))
      )
    )
    .orderBy(desc(videoCalls.createdAt))
    .limit(1);

  if (!call) return c.json({ data: null });

  // Enrich with other user name
  const otherId = call.doctorId === userId ? call.patientId : call.doctorId;
  const [other] = await db.select({ id: aivitaUsers.id, name: aivitaUsers.name })
    .from(aivitaUsers).where(eq(aivitaUsers.id, otherId)).limit(1);

  return c.json({ data: { ...call, otherUser: other ?? null } });
});

// GET /history — call history for current user
videoCallRouter.get('/history', async (c) => {
  const userId = c.get('aivitaUserId');

  const calls = await db.select().from(videoCalls)
    .where(or(eq(videoCalls.doctorId, userId), eq(videoCalls.patientId, userId)))
    .orderBy(desc(videoCalls.createdAt))
    .limit(50);

  return c.json({ data: calls });
});

// GET /:id — get call details
videoCallRouter.get('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const callId = c.req.param('id');

  const [call] = await db.select().from(videoCalls)
    .where(eq(videoCalls.id, callId)).limit(1);

  if (!call) return c.json({ error: 'Not found' }, 404);
  if (call.doctorId !== userId && call.patientId !== userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const otherId = call.doctorId === userId ? call.patientId : call.doctorId;
  const [other] = await db.select({ id: aivitaUsers.id, name: aivitaUsers.name, avatarUrl: aivitaUsers.avatarUrl })
    .from(aivitaUsers).where(eq(aivitaUsers.id, otherId)).limit(1);

  return c.json({ data: { ...call, otherUser: other ?? null } });
});

// POST /:id/join — mark call as active
videoCallRouter.post('/:id/join', async (c) => {
  const userId = c.get('aivitaUserId');
  const callId = c.req.param('id');

  const [call] = await db.select().from(videoCalls)
    .where(eq(videoCalls.id, callId)).limit(1);
  if (!call) return c.json({ error: 'Not found' }, 404);
  if (call.doctorId !== userId && call.patientId !== userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await db.update(videoCalls)
    .set({ status: 'active', startedAt: new Date() })
    .where(eq(videoCalls.id, callId));

  // Update message metadata if conversation exists
  if (call.conversationId) {
    await db.update(doctorMessages)
      .set({ metadata: { callId, roomId: call.roomId, joinUrl: `https://meet.jit.si/${call.roomId}`, status: 'active' } })
      .where(and(eq(doctorMessages.conversationId, call.conversationId), eq(doctorMessages.type, 'video_call')))
      .catch(() => {});
  }

  return c.json({ data: { ok: true } });
});

// POST /:id/end — complete the call
videoCallRouter.post('/:id/end', async (c) => {
  const userId = c.get('aivitaUserId');
  const callId = c.req.param('id');

  const [call] = await db.select().from(videoCalls)
    .where(eq(videoCalls.id, callId)).limit(1);
  if (!call) return c.json({ error: 'Not found' }, 404);
  if (call.doctorId !== userId && call.patientId !== userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const endedAt = new Date();
  const duration = call.startedAt
    ? Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000)
    : 0;

  await db.update(videoCalls)
    .set({ status: 'completed', endedAt, duration })
    .where(eq(videoCalls.id, callId));

  // Update message metadata
  if (call.conversationId) {
    await db.update(doctorMessages)
      .set({ metadata: { callId, roomId: call.roomId, joinUrl: `https://meet.jit.si/${call.roomId}`, status: 'completed', duration } })
      .where(and(eq(doctorMessages.conversationId, call.conversationId), eq(doctorMessages.type, 'video_call')))
      .catch(() => {});
  }

  return c.json({ data: { ok: true, duration } });
});

// PUT /:id/notes — doctor saves notes after call
videoCallRouter.put('/:id/notes', async (c) => {
  const userId = c.get('aivitaUserId');
  const callId = c.req.param('id');
  const { notes } = await c.req.json() as { notes: string };

  const [call] = await db.select().from(videoCalls)
    .where(and(eq(videoCalls.id, callId), eq(videoCalls.doctorId, userId))).limit(1);
  if (!call) return c.json({ error: 'Not found' }, 404);

  await db.update(videoCalls).set({ notes }).where(eq(videoCalls.id, callId));
  return c.json({ data: { ok: true } });
});
