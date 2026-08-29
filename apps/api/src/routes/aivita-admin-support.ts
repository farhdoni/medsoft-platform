import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import {
  db,
  aivitaUsers,
  adminUsers,
  conversations,
  conversationParticipants,
  messages,
  messageReports,
  userBlocks,
  medicalCards,
  supportTickets,
  supportNotes,
  supportTemplates,
  supportAudit,
} from '@medsoft/db';
import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { requireAuth, requireOperator, requireSuperadmin } from '../middleware/auth.js';
import { deliverMessage } from './aivita/messaging.js';
import { handleUpload } from './aivita/upload.js';
import {
  SLA_ESCALATION_MINUTES,
  assignToOperator,
  closeTicket,
  counterpartOf,
  ensureTicket,
  getSupportUser,
  isEscalated,
  markFirstResponse,
  messageCount,
  addNote,
  reopenTicket,
  supportKpi,
  transferTicket,
  waitingMinutes,
  writeAudit,
} from '../lib/support-tickets.js';

/**
 * Кабинет поддержки и модерации.
 *
 * Отдельный роутер, а не блок внутри aivita-admin: тут своя ступень доступа
 * (оператор или выше) и своя модель — тикет поверх диалога. Пути те же, что
 * были, так что фронт не переписывается ради переезда.
 *
 * Правило, которое важнее остальных: всё, что должно дойти до пользователя,
 * уходит через deliverMessage — тот же путь, что у обычного сообщения. Ни
 * одного прямого insert в messages и ни одного прямого вызова пуша здесь нет.
 */
export const aivitaAdminSupportRouter = new Hono();
aivitaAdminSupportRouter.use('*', requireAuth);
aivitaAdminSupportRouter.use('*', requireOperator);

const r = aivitaAdminSupportRouter;

// ─── Загрузка вложений оператора ──────────────────────────────────────────────
// Тот же обработчик, что у пациента, но под guard'ом кабинета: пациентская
// сессия у оператора отсутствует, и общий роут отдавал бы ему 401.
r.post('/upload', handleUpload);

// ─── Очереди и список обращений ───────────────────────────────────────────────

/** Три очереди читаются одним предикатом по (status, assigned_operator_id). */
const queueSchema = z.enum(['mine', 'unassigned', 'archive']).optional();

r.get('/conversations', async (c) => {
  const operatorId = c.get('adminId');
  const queue = queueSchema.parse(c.req.query('queue') ?? undefined) ?? 'mine';
  const support = await getSupportUser();
  if (!support) return c.json({ data: [], kpi: await supportKpi() });

  const where =
    queue === 'archive'
      ? eq(supportTickets.status, 'closed')
      : queue === 'unassigned'
        ? and(eq(supportTickets.status, 'open'), isNull(supportTickets.assignedOperatorId))
        : and(eq(supportTickets.status, 'open'), eq(supportTickets.assignedOperatorId, operatorId));

  const tickets = await db.select().from(supportTickets).where(where).orderBy(desc(supportTickets.updatedAt));
  if (tickets.length === 0) return c.json({ data: [], kpi: await supportKpi() });

  const convIds = tickets.map((t) => t.conversationId);

  const partners = await db
    .select({
      conversationId: conversationParticipants.conversationId,
      id: aivitaUsers.id,
      name: aivitaUsers.name,
      nickname: aivitaUsers.nickname,
    })
    .from(conversationParticipants)
    .innerJoin(aivitaUsers, eq(aivitaUsers.id, conversationParticipants.userId))
    .where(and(
      inArray(conversationParticipants.conversationId, convIds),
      ne(conversationParticipants.userId, support.id),
    ));

  const data = await Promise.all(tickets.map(async (t) => {
    const partner = partners.find((p) => p.conversationId === t.conversationId) ?? null;
    const [last] = await db
      .select({ content: messages.content, createdAt: messages.createdAt })
      .from(messages)
      .where(and(eq(messages.conversationId, t.conversationId), isNull(messages.deletedAt)))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    return {
      ticketId: t.id,
      conversationId: t.conversationId,
      status: t.status,
      assignedOperatorId: t.assignedOperatorId,
      rating: t.rating,
      name: partner?.name ?? 'Пользователь',
      nick: partner?.nickname ? '@' + partner.nickname : null,
      preview: last?.content ?? '',
      lastAt: last?.createdAt ?? t.createdAt,
      waitingMinutes: waitingMinutes(t),
      escalated: isEscalated(t),
    };
  }));

  return c.json({ data, kpi: await supportKpi(), slaMinutes: SLA_ESCALATION_MINUTES });
});

// ─── Тред: сообщения + заметки ────────────────────────────────────────────────

r.get('/conversations/:id/messages', async (c) => {
  const conversationId = c.req.param('id');
  const ticket = await ensureTicket(conversationId);
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);

  const rows = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      content: messages.content,
      type: messages.type,
      createdAt: messages.createdAt,
      deletedAt: messages.deletedAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  const notes = await db
    .select()
    .from(supportNotes)
    .where(eq(supportNotes.ticketId, ticket.id))
    .orderBy(supportNotes.createdAt);

  return c.json({
    data: {
      ticket,
      messages: rows,
      // Заметки отдаются ТОЛЬКО здесь, в админской выдаче. В пользовательский
      // ответ они не попадают ни при каких условиях: они лежат в отдельной
      // таблице, которую пользовательский маршрут не читает вовсе.
      notes,
    },
  });
});

// ─── Ответ пользователю ───────────────────────────────────────────────────────

const replySchema = z.object({ content: z.string().min(1).max(4000) });

r.post('/conversations/:id/messages', zValidator('json', replySchema), async (c) => {
  const conversationId = c.req.param('id');
  const operatorId = c.get('adminId');
  const { content } = c.req.valid('json');

  const support = await getSupportUser();
  if (!support) return c.json({ error: 'Support user not found' }, 404);

  const ticket = await ensureTicket(conversationId);
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);

  // Тот же путь, что у обычного сообщения: вставка, lastMessageAt и пуш с
  // гейтингом по muted/quiet-hours/preview.
  const sent = await deliverMessage(conversationId, support.id, { type: 'text', content });
  if (!sent.ok) return c.json({ error: sent.error }, sent.status);

  await markFirstResponse(ticket.id);

  return c.json({ data: sent.message }, 201);
});

// ─── Внутренняя заметка ───────────────────────────────────────────────────────

const noteSchema = z.object({ text: z.string().min(1).max(4000) });

r.post('/conversations/:id/notes', zValidator('json', noteSchema), async (c) => {
  const ticket = await ensureTicket(c.req.param('id'));
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);
  const note = await addNote(ticket.id, c.get('adminId'), c.req.valid('json').text);
  return c.json({ data: note }, 201);
});

// ─── Взять в работу ───────────────────────────────────────────────────────────

r.post('/conversations/:id/assign', async (c) => {
  const ticket = await ensureTicket(c.req.param('id'));
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);
  const updated = await assignToOperator(ticket.id, c.get('adminId'));
  return c.json({ data: updated });
});

// ─── Передача другому оператору ───────────────────────────────────────────────

const transferSchema = z.object({
  toOperatorId: z.string().uuid(),
  comment: z.string().min(1).max(1000),
});

r.post('/conversations/:id/transfer', zValidator('json', transferSchema), async (c) => {
  const conversationId = c.req.param('id');
  const { toOperatorId, comment } = c.req.valid('json');

  const ticket = await ensureTicket(conversationId);
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);

  const [target] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.id, toOperatorId)).limit(1);
  if (!target) return c.json({ error: 'Operator not found' }, 404);

  const support = await getSupportUser();
  const partnerId = support ? await counterpartOf(conversationId, support.id) : null;

  await transferTicket({
    ticketId: ticket.id,
    fromOperatorId: c.get('adminId'),
    toOperatorId,
    comment,
    targetUserId: partnerId,
  });

  return c.json({ success: true });
});

// ─── Закрытие и переоткрытие ──────────────────────────────────────────────────

const statusSchema = z.object({ status: z.enum(['open', 'closed']) });

r.patch('/conversations/:id/status', zValidator('json', statusSchema), async (c) => {
  const conversationId = c.req.param('id');
  const operatorId = c.get('adminId');
  const { status } = c.req.valid('json');

  const ticket = await ensureTicket(conversationId);
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);

  const support = await getSupportUser();
  const partnerId = support ? await counterpartOf(conversationId, support.id) : null;

  if (status === 'closed') {
    await closeTicket(ticket.id, operatorId, conversationId, partnerId);
  } else {
    await reopenTicket(ticket.id, operatorId, partnerId);
  }

  return c.json({ success: true });
});

// ─── CSAT ─────────────────────────────────────────────────────────────────────

const ratingSchema = z.object({ rating: z.number().int().min(1).max(5) });

r.patch('/conversations/:id/rating', zValidator('json', ratingSchema), async (c) => {
  const ticket = await ensureTicket(c.req.param('id'));
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);
  await db
    .update(supportTickets)
    .set({ rating: c.req.valid('json').rating, updatedAt: new Date() })
    .where(eq(supportTickets.id, ticket.id));
  return c.json({ success: true });
});

// ─── Смена оператора ──────────────────────────────────────────────────────────

const shiftSchema = z.object({ shiftStatus: z.enum(['offline', 'online', 'break']) });

r.patch('/shift', zValidator('json', shiftSchema), async (c) => {
  await db
    .update(adminUsers)
    .set({ shiftStatus: c.req.valid('json').shiftStatus })
    .where(eq(adminUsers.id, c.get('adminId')));
  return c.json({ success: true });
});

// ─── Карточка пользователя ────────────────────────────────────────────────────

r.get('/users/:id/card', async (c) => {
  const userId = c.req.param('id');

  const [user] = await db
    .select({
      id: aivitaUsers.id,
      name: aivitaUsers.name,
      nickname: aivitaUsers.nickname,
      phone: aivitaUsers.phone,
      plan: aivitaUsers.plan,
      locale: aivitaUsers.locale,
      createdAt: aivitaUsers.createdAt,
      lastLoginAt: aivitaUsers.lastLoginAt,
    })
    .from(aivitaUsers)
    .where(eq(aivitaUsers.id, userId))
    .limit(1);
  if (!user) return c.json({ error: 'User not found' }, 404);

  // card_code показывается текстом: страницы анкеты в админке нет, и кнопка
  // «Открыть анкету» вела бы в никуда.
  const [card] = await db
    .select({ cardCode: medicalCards.cardCode })
    .from(medicalCards)
    .where(eq(medicalCards.userId, userId))
    .limit(1);

  const [dialogs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));

  const [complaints] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(messageReports)
    .innerJoin(messages, eq(messages.id, messageReports.messageId))
    .where(eq(messages.senderId, userId));

  const [blocked] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(userBlocks)
    .where(eq(userBlocks.blockedId, userId));

  return c.json({
    data: {
      ...user,
      cardCode: card?.cardCode ?? null,
      profileFilled: !!card,
      dialogs: dialogs?.n ?? 0,
      complaints: complaints?.n ?? 0,
      blocked: (blocked?.n ?? 0) > 0,
    },
  });
});

// ─── Блокировка и разблокировка ───────────────────────────────────────────────

const blockSchema = z.object({
  reason: z.string().min(1).max(200),
  comment: z.string().max(1000).optional(),
});

r.post('/users/:id/block', zValidator('json', blockSchema), async (c) => {
  const userId = c.req.param('id');
  const { reason, comment } = c.req.valid('json');
  const support = await getSupportUser();
  if (!support) return c.json({ error: 'Support user not found' }, 404);

  await db
    .insert(userBlocks)
    .values({ blockerId: support.id, blockedId: userId })
    .onConflictDoNothing();

  await writeAudit({
    operatorId: c.get('adminId'),
    action: 'block',
    targetUserId: userId,
    reason,
    newValue: comment ?? null,
  });

  return c.json({ success: true });
});

r.post('/users/:id/unblock', zValidator('json', blockSchema.partial({ reason: true })), async (c) => {
  const userId = c.req.param('id');
  const support = await getSupportUser();
  if (!support) return c.json({ error: 'Support user not found' }, 404);

  await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.blockerId, support.id), eq(userBlocks.blockedId, userId)));

  await writeAudit({
    operatorId: c.get('adminId'),
    action: 'unblock',
    targetUserId: userId,
    reason: c.req.valid('json').reason ?? null,
  });

  return c.json({ success: true });
});

// ─── Жалобы ───────────────────────────────────────────────────────────────────

r.get('/reports', async (c) => {
  const rows = await db
    .select({
      id: messageReports.id,
      reason: messageReports.reason,
      status: messageReports.status,
      createdAt: messageReports.createdAt,
      messageId: messageReports.messageId,
      content: messages.content,
      reporterId: messageReports.reporterId,
      authorId: messages.senderId,
    })
    .from(messageReports)
    .innerJoin(messages, eq(messages.id, messageReports.messageId))
    .orderBy(desc(messageReports.createdAt));

  return c.json({ data: rows });
});

const reportPatchSchema = z.object({ status: z.enum(['reviewed', 'dismissed']) });

r.patch('/reports/:id', zValidator('json', reportPatchSchema), async (c) => {
  const id = c.req.param('id');
  const { status } = c.req.valid('json');

  const [row] = await db
    .update(messageReports)
    .set({ status, reviewedAt: new Date() })
    .where(eq(messageReports.id, id))
    .returning({ messageId: messageReports.messageId });

  if (row) {
    const [msg] = await db.select({ senderId: messages.senderId }).from(messages).where(eq(messages.id, row.messageId)).limit(1);
    await writeAudit({
      operatorId: c.get('adminId'),
      action: 'resolve_report',
      targetUserId: msg?.senderId ?? null,
      newValue: status,
    });
  }

  return c.json({ success: true });
});

// ─── Шаблоны ──────────────────────────────────────────────────────────────────

r.get('/templates', async (c) => {
  const rows = await db.select().from(supportTemplates).orderBy(supportTemplates.createdAt);
  return c.json({ data: rows });
});

const templateSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
});

r.post('/templates', zValidator('json', templateSchema), async (c) => {
  const [row] = await db
    .insert(supportTemplates)
    .values({ ...c.req.valid('json'), createdBy: c.get('adminId') })
    .returning();
  return c.json({ data: row }, 201);
});

r.put('/templates/:id', zValidator('json', templateSchema), async (c) => {
  const [row] = await db
    .update(supportTemplates)
    .set({ ...c.req.valid('json'), updatedAt: new Date() })
    .where(eq(supportTemplates.id, c.req.param('id')))
    .returning();
  if (!row) return c.json({ error: 'Template not found' }, 404);
  return c.json({ data: row });
});

// ─── Операторы (для модалки передачи) ─────────────────────────────────────────

r.get('/operators', async (c) => {
  const rows = await db
    .select({
      id: adminUsers.id,
      fullName: adminUsers.fullName,
      shiftStatus: adminUsers.shiftStatus,
    })
    .from(adminUsers)
    .where(eq(adminUsers.isActive, true));
  return c.json({ data: rows });
});

// ─── Журнал аудита ────────────────────────────────────────────────────────────

r.get('/audit', async (c) => {
  const rows = await db
    .select()
    .from(supportAudit)
    .orderBy(desc(supportAudit.createdAt))
    .limit(200);
  return c.json({ data: rows });
});

// ─── Действия супер-админа ────────────────────────────────────────────────────
//
// Телефон, пароль и тариф пользователя правит только superadmin и только с
// ПОВТОРНЫМ вводом своего пароля в самом запросе. Сессии тут недостаточно:
// это необратимые действия над чужим аккаунтом, и открытая вкладка не должна
// быть достаточным условием. Каждое действие ложится в support_audit со
// старым и новым значением — иначе разобрать инцидент постфактум нечем.

const REAUTH_FAIL = { error: 'Re-authentication failed' } as const;

async function reauth(adminId: string, password: string): Promise<boolean> {
  const [admin] = await db
    .select({ hash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1);
  if (!admin?.hash) return false;
  return bcrypt.compare(password, admin.hash);
}

const phoneSchema = z.object({ password: z.string().min(1), phone: z.string().min(5).max(32) });

r.patch('/users/:id/phone', requireSuperadmin, zValidator('json', phoneSchema), async (c) => {
  const adminId = c.get('adminId');
  const { password, phone } = c.req.valid('json');
  if (!(await reauth(adminId, password))) return c.json(REAUTH_FAIL, 403);

  const userId = c.req.param('id');
  const [before] = await db.select({ phone: aivitaUsers.phone }).from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  if (!before) return c.json({ error: 'User not found' }, 404);

  await db.update(aivitaUsers).set({ phone }).where(eq(aivitaUsers.id, userId));
  await writeAudit({
    operatorId: adminId,
    action: 'change_phone',
    targetUserId: userId,
    oldValue: before.phone,
    newValue: phone,
  });

  return c.json({ success: true });
});

const planSchema = z.object({ password: z.string().min(1), plan: z.string().min(1).max(40) });

r.patch('/users/:id/plan', requireSuperadmin, zValidator('json', planSchema), async (c) => {
  const adminId = c.get('adminId');
  const { password, plan } = c.req.valid('json');
  if (!(await reauth(adminId, password))) return c.json(REAUTH_FAIL, 403);

  const userId = c.req.param('id');
  const [before] = await db.select({ plan: aivitaUsers.plan }).from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  if (!before) return c.json({ error: 'User not found' }, 404);

  await db.update(aivitaUsers).set({ plan }).where(eq(aivitaUsers.id, userId));
  await writeAudit({
    operatorId: adminId,
    action: 'change_plan',
    targetUserId: userId,
    oldValue: before.plan,
    newValue: plan,
  });

  return c.json({ success: true });
});

const resetSchema = z.object({ password: z.string().min(1), newPassword: z.string().min(8).max(128) });

r.post('/users/:id/reset-password', requireSuperadmin, zValidator('json', resetSchema), async (c) => {
  const adminId = c.get('adminId');
  const { password, newPassword } = c.req.valid('json');
  if (!(await reauth(adminId, password))) return c.json(REAUTH_FAIL, 403);

  const userId = c.req.param('id');
  const [target] = await db.select({ id: aivitaUsers.id }).from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  if (!target) return c.json({ error: 'User not found' }, 404);

  await db
    .update(aivitaUsers)
    .set({ passwordHash: await bcrypt.hash(newPassword, 12) })
    .where(eq(aivitaUsers.id, userId));

  // Значения пароля в журнал не пишутся — ни старое, ни новое. Факта и автора
  // достаточно, а хеш в аудите был бы просто ещё одним местом его утечки.
  await writeAudit({
    operatorId: adminId,
    action: 'reset_password',
    targetUserId: userId,
  });

  return c.json({ success: true });
});
