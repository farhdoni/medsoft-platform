import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { doctorConversations, doctorMessages, aivitaUsers, doctorProfiles, medicationSchedule, drugInteractions } from '@medsoft/db';
import { eq, and, desc, gt, not, sql, or, ilike } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { createNotification } from '../../lib/notification-service.js';

// ─── Drug interaction helper ──────────────────────────────────────────────────

async function checkPrescriptionInteractions(
  patientId: string,
  doctorId: string,
  newDrug: string,
  convId: string,
): Promise<void> {
  const meds = await db.select({ title: medicationSchedule.title })
    .from(medicationSchedule)
    .where(and(eq(medicationSchedule.userId, patientId), eq(medicationSchedule.isActive, true)));

  const patientDrugs = [...new Set(meds.map((m) => m.title))];
  if (patientDrugs.length === 0) return;

  for (const existing of patientDrugs) {
    const [row] = await db.select().from(drugInteractions)
      .where(or(
        and(ilike(drugInteractions.drug1, `%${newDrug}%`), ilike(drugInteractions.drug2, `%${existing}%`)),
        and(ilike(drugInteractions.drug1, `%${existing}%`), ilike(drugInteractions.drug2, `%${newDrug}%`)),
      ))
      .limit(1);

    if (!row) continue;
    if (row.severity !== 'critical' && row.severity !== 'major') continue;

    const icon = row.severity === 'critical' ? '⛔' : '⚠️';
    const sevLabel = row.severity === 'critical' ? 'КРИТИЧНОЕ' : 'Серьёзное';
    const warningText = `${icon} Взаимодействие лекарств: **${row.drug1}** + **${row.drug2}** — ${sevLabel}.\n\n${row.description ?? ''}\n\n💡 ${row.recommendation ?? ''}`;

    // System warning message visible to both doctor and patient
    await db.insert(doctorMessages).values({
      conversationId: convId,
      senderId: doctorId,
      senderRole: 'doctor',
      type: 'drug_warning',
      content: warningText,
      metadata: {
        drug1: row.drug1,
        drug2: row.drug2,
        severity: row.severity,
        isSystemWarning: true,
      },
    });

    await db.update(doctorConversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(doctorConversations.id, convId));

    // Notify only the doctor
    const notifTitle = row.severity === 'critical'
      ? `⛔ Критическое взаимодействие: ${row.drug1} + ${row.drug2}`
      : `⚠️ Серьёзное взаимодействие: ${row.drug1} + ${row.drug2}`;
    await createNotification(
      doctorId,
      'action_required',
      notifTitle,
      `Рассмотрите замену. ${row.recommendation ?? ''}`.slice(0, 120),
      { priority: row.severity === 'critical' ? 'urgent' : 'high', link: `/doctor-chats` },
    ).catch(() => {});
  }
}

export const conversationsRouter = new Hono();

conversationsRouter.use('*', requireAivitaAuth);

// ─── GET / ─────────────────────────────────────────────────────────────────────
// List conversations for current user (patient sees own, doctor sees own)
// Returns: conversation + otherUser (name/avatar) + lastMessage + unreadCount
conversationsRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const [me] = await db.select({ role: aivitaUsers.role })
    .from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  const isDoctor = me?.role === 'doctor';

  const convs = await db.select().from(doctorConversations)
    .where(
      isDoctor
        ? eq(doctorConversations.doctorId, userId)
        : eq(doctorConversations.patientId, userId)
    )
    .orderBy(desc(doctorConversations.lastMessageAt));

  const enriched = await Promise.all(convs.map(async (conv) => {
    const otherId = isDoctor ? conv.patientId : conv.doctorId;

    const [[other], [lastMsg], [{ unread }]] = await Promise.all([
      db.select({
        id: aivitaUsers.id,
        name: aivitaUsers.name,
        avatarUrl: aivitaUsers.avatarUrl,
        role: aivitaUsers.role,
      }).from(aivitaUsers).where(eq(aivitaUsers.id, otherId)).limit(1),

      db.select().from(doctorMessages)
        .where(eq(doctorMessages.conversationId, conv.id))
        .orderBy(desc(doctorMessages.createdAt)).limit(1),

      db.select({ unread: sql<number>`cast(count(*) as int)` })
        .from(doctorMessages)
        .where(and(
          eq(doctorMessages.conversationId, conv.id),
          eq(doctorMessages.isRead, false),
          not(eq(doctorMessages.senderId, userId)),
        )),
    ]);

    // For doctors get specialization from profile
    let specialization: string | null = null;
    if (!isDoctor && conv.doctorId) {
      const [prof] = await db.select({ spec: doctorProfiles.specialization })
        .from(doctorProfiles).where(eq(doctorProfiles.userId, conv.doctorId)).limit(1);
      specialization = prof?.spec ?? null;
    }

    return {
      ...conv,
      otherUser: other ? { ...other, specialization } : null,
      lastMessage: lastMsg ?? null,
      unreadCount: unread ?? 0,
    };
  }));

  return c.json({ data: enriched });
});

// ─── POST / ────────────────────────────────────────────────────────────────────
// Create conversation (patient → doctor). Returns existing if already active.
conversationsRouter.post('/', async (c) => {
  const patientId = c.get('aivitaUserId');
  const { doctorId } = await c.req.json() as { doctorId: string };

  if (!doctorId) return c.json({ error: 'doctorId required' }, 400);

  const [doctor] = await db.select({ role: aivitaUsers.role })
    .from(aivitaUsers).where(eq(aivitaUsers.id, doctorId)).limit(1);
  if (!doctor || doctor.role !== 'doctor') {
    return c.json({ error: 'Doctor not found' }, 404);
  }

  // Return existing active conversation if exists
  const [existing] = await db.select().from(doctorConversations)
    .where(and(
      eq(doctorConversations.patientId, patientId),
      eq(doctorConversations.doctorId, doctorId),
    )).limit(1);

  if (existing) return c.json({ data: existing });

  const [conv] = await db.insert(doctorConversations)
    .values({ patientId, doctorId })
    .returning();

  return c.json({ data: conv }, 201);
});

// ─── GET /:id/messages ─────────────────────────────────────────────────────────
// Fetch messages. Supports ?after=ISO for polling new messages only.
conversationsRouter.get('/:id/messages', async (c) => {
  const userId = c.get('aivitaUserId');
  const convId = c.req.param('id');
  const limit  = Math.min(parseInt(c.req.query('limit') ?? '60'), 100);
  const offset = parseInt(c.req.query('offset') ?? '0');
  const after  = c.req.query('after');

  const [conv] = await db.select().from(doctorConversations)
    .where(eq(doctorConversations.id, convId)).limit(1);
  if (!conv || (conv.patientId !== userId && conv.doctorId !== userId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const whereClause = after
    ? and(
        eq(doctorMessages.conversationId, convId),
        gt(doctorMessages.createdAt, new Date(after)),
      )
    : eq(doctorMessages.conversationId, convId);

  const msgs = await db.select().from(doctorMessages)
    .where(whereClause)
    .orderBy(desc(doctorMessages.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: msgs.reverse() });
});

// ─── POST /:id/messages ────────────────────────────────────────────────────────
conversationsRouter.post('/:id/messages', async (c) => {
  const userId = c.get('aivitaUserId');
  const convId = c.req.param('id');

  const [conv] = await db.select().from(doctorConversations)
    .where(eq(doctorConversations.id, convId)).limit(1);
  if (!conv || (conv.patientId !== userId && conv.doctorId !== userId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const [me] = await db.select({ role: aivitaUsers.role })
    .from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  const senderRole = me?.role === 'doctor' ? 'doctor' : 'patient';

  type MsgBody = {
    type?: string; content?: string;
    attachmentUrl?: string; attachmentName?: string; attachmentMime?: string;
    metadata?: Record<string, unknown>;
  };
  const body = await c.req.json() as MsgBody;

  const [msg] = await db.insert(doctorMessages)
    .values({
      conversationId: convId,
      senderId: userId,
      senderRole,
      type: body.type ?? 'text',
      content: body.content ?? null,
      attachmentUrl:  body.attachmentUrl  ?? null,
      attachmentName: body.attachmentName ?? null,
      attachmentMime: body.attachmentMime ?? null,
      metadata: body.metadata ?? null,
    })
    .returning();

  await db.update(doctorConversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(doctorConversations.id, convId));

  // Auto drug-check: prescription from doctor → check against patient's current meds
  if (senderRole === 'doctor' && conv.patientId && (body.type === 'prescription' || body.type === 'medication')) {
    const drugName = (body.metadata?.drugName as string | undefined)
      ?? (body.metadata?.title as string | undefined)
      ?? (body.content ?? '');
    if (drugName.trim()) {
      checkPrescriptionInteractions(conv.patientId, userId, drugName.trim(), convId).catch(() => {});
    }
  }

  // Notify recipient: doctor → notify patient, patient → notify doctor
  const recipientId = senderRole === 'doctor' ? conv.patientId : conv.doctorId;
  if (recipientId) {
    const [sender] = await db.select({ name: aivitaUsers.name, nickname: aivitaUsers.nickname })
      .from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
    const senderName = sender?.name ?? sender?.nickname ?? (senderRole === 'doctor' ? 'Врач' : 'Пациент');
    await createNotification(
      recipientId,
      'message_new',
      'Новое сообщение',
      `${senderName}: ${(body.content ?? '').slice(0, 80) || 'отправил вложение'}`,
      { link: `/chats/${convId}` }
    ).catch(() => {});
  }

  return c.json({ data: msg }, 201);
});

// ─── PUT /:id/read ─────────────────────────────────────────────────────────────
// Mark all messages from the OTHER user as read
conversationsRouter.put('/:id/read', async (c) => {
  const userId = c.get('aivitaUserId');
  const convId = c.req.param('id');

  const [conv] = await db.select().from(doctorConversations)
    .where(eq(doctorConversations.id, convId)).limit(1);
  if (!conv || (conv.patientId !== userId && conv.doctorId !== userId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await db.update(doctorMessages)
    .set({ isRead: true })
    .where(and(
      eq(doctorMessages.conversationId, convId),
      not(eq(doctorMessages.senderId, userId)),
      eq(doctorMessages.isRead, false),
    ));

  return c.json({ data: { ok: true } });
});

// ─── POST /:id/close ──────────────────────────────────────────────────────────
// Only the doctor can close a conversation
conversationsRouter.post('/:id/close', async (c) => {
  const userId = c.get('aivitaUserId');
  const convId = c.req.param('id');

  const [conv] = await db.select().from(doctorConversations)
    .where(eq(doctorConversations.id, convId)).limit(1);
  if (!conv || conv.doctorId !== userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await db.update(doctorConversations)
    .set({ status: 'closed' })
    .where(eq(doctorConversations.id, convId));

  return c.json({ data: { ok: true } });
});
