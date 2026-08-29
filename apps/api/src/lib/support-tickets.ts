import { db } from '@medsoft/db';
import {
  aivitaUsers,
  adminUsers,
  conversationParticipants,
  messages,
  supportTickets,
  supportNotes,
  supportAudit,
  SLA_ESCALATION_MINUTES,
  type SupportAuditAction,
} from '@medsoft/db';
import { and, eq, gte, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { deliverMessage } from '../routes/aivita/messaging.js';
import { logger } from './logger.js';

/**
 * Жизненный цикл тикета поддержки.
 *
 * Тикет — надстройка над диалогом: сама переписка живёт в conversations/
 * messages и видна пользователю в мессенджере. Здесь только то, чего у
 * диалога нет — очередь, назначение, отметки SLA, оценка.
 *
 * Ни одна функция ниже не пишет в messages напрямую: всё, что должно дойти до
 * пользователя, уходит через deliverMessage — тот же путь, что у обычного
 * сообщения, со всеми правилами пуша.
 */

const SUPPORT_NICKNAME = (process.env.SUPPORT_USER_NICKNAME ?? 'aivita').toLowerCase();

/** Рабочие часы поддержки, местное время сервера. */
export const SUPPORT_HOURS = { from: 9, to: 21 };

export { SLA_ESCALATION_MINUTES };

/** Аккаунт @aivita. Резолвится по нику из env — id нигде не захардкожен. */
export async function getSupportUser(): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: aivitaUsers.id })
    .from(aivitaUsers)
    .where(eq(aivitaUsers.nickname, SUPPORT_NICKNAME))
    .limit(1);
  return row ?? null;
}

/** Собеседник поддержки в диалоге — для прямого чата ровно один. */
export async function counterpartOf(conversationId: string, supportUserId: string) {
  const [row] = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(and(
      eq(conversationParticipants.conversationId, conversationId),
      ne(conversationParticipants.userId, supportUserId),
    ))
    .limit(1);
  return row?.userId ?? null;
}

/**
 * Тикет для диалога, создавая его при первом обращении.
 *
 * Ленивое создание нужно, потому что диалог с поддержкой заводит сам
 * пользователь из мессенджера, и никакой админский код в этот момент не
 * исполняется. Бэкфилл в 0037 закрывает только то, что было до кабинета.
 *
 * Новый тикет всегда без назначения — это и есть очередь «Нераспределённые».
 */
export async function ensureTicket(conversationId: string) {
  const [existing] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.conversationId, conversationId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(supportTickets)
    .values({ conversationId, status: 'open' })
    .onConflictDoNothing({ target: supportTickets.conversationId })
    .returning();

  if (created) return created;

  // Гонка: кто-то создал тикет между SELECT и INSERT — перечитываем.
  const [raced] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.conversationId, conversationId))
    .limit(1);
  return raced;
}

export async function writeAudit(input: {
  operatorId: string | null;
  action: SupportAuditAction;
  targetUserId?: string | null;
  ticketId?: string | null;
  reason?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  await db.insert(supportAudit).values({
    operatorId: input.operatorId,
    action: input.action,
    targetUserId: input.targetUserId ?? null,
    ticketId: input.ticketId ?? null,
    reason: input.reason ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
  });
}

/** «Взять в работу»: тикет уходит из нераспределённых на текущего оператора. */
export async function assignToOperator(ticketId: string, operatorId: string) {
  const [updated] = await db
    .update(supportTickets)
    .set({ assignedOperatorId: operatorId, status: 'open', updatedAt: new Date() })
    .where(eq(supportTickets.id, ticketId))
    .returning();
  return updated;
}

/**
 * Первый ответ оператора. Ставится один раз за всё время жизни обращения и
 * НЕ сбрасывается при переоткрытии: это метка SLA на обращение, а не на
 * текущий круг переписки — иначе метрика «среднее время первого ответа»
 * улучшалась бы сама собой при каждом реопене.
 */
export async function markFirstResponse(ticketId: string) {
  await db
    .update(supportTickets)
    .set({ firstResponseAt: new Date(), updatedAt: new Date() })
    .where(and(eq(supportTickets.id, ticketId), isNull(supportTickets.firstResponseAt)));
}

/** Есть ли хоть один оператор на смене. Перерыв считается присутствием. */
export async function anyOperatorOnline(): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(adminUsers)
    .where(eq(adminUsers.shiftStatus, 'online'));
  return (row?.n ?? 0) > 0;
}

/** Кто-то на перерыве — вернётся сам, автоответ слать не нужно. */
export async function anyOperatorOnBreak(): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(adminUsers)
    .where(eq(adminUsers.shiftStatus, 'break'));
  return (row?.n ?? 0) > 0;
}

function withinSupportHours(now = new Date()): boolean {
  const h = now.getHours();
  return h >= SUPPORT_HOURS.from && h < SUPPORT_HOURS.to;
}

/**
 * Сообщение пользователя в диалог поддержки.
 *
 * Два правила ТЗ:
 *   — закрытый тикет открывается заново, но assigned_operator_id СОХРАНЯЕТСЯ:
 *     оператор уже знает контекст, возвращать обращение в общую очередь
 *     значило бы заставить кого-то читать переписку заново;
 *   — автоответ вне часов уходит РОВНО ОДИН РАЗ на тикет (auto_reply_sent_at),
 *     иначе каждое сообщение в нерабочее время порождало бы ещё одно.
 */
export async function onUserMessage(conversationId: string) {
  const ticket = await ensureTicket(conversationId);
  if (!ticket) return null;

  if (ticket.status === 'closed') {
    await db
      .update(supportTickets)
      .set({ status: 'open', closedAt: null, updatedAt: new Date() })
      .where(eq(supportTickets.id, ticket.id));
  }

  const shouldAutoReply =
    !ticket.autoReplySentAt &&
    !(await anyOperatorOnline()) &&
    !(await anyOperatorOnBreak()) &&
    !withinSupportHours();

  if (shouldAutoReply) {
    const support = await getSupportUser();
    if (support) {
      const sent = await deliverMessage(conversationId, support.id, {
        type: 'text',
        content: `Мы получили ваш вопрос и ответим в рабочее время (${SUPPORT_HOURS.from}:00–${SUPPORT_HOURS.to}:00).`,
      });
      if (sent.ok) {
        await db
          .update(supportTickets)
          .set({ autoReplySentAt: new Date(), updatedAt: new Date() })
          .where(eq(supportTickets.id, ticket.id));
      } else {
        logger.warn({ conversationId, error: sent.error }, '[Support] автоответ не ушёл');
      }
    }
  }

  return ticket;
}

/** Внутренняя заметка. Живёт в support_notes и в messages не попадает никогда. */
export async function addNote(ticketId: string, operatorId: string | null, text: string) {
  const [note] = await db
    .insert(supportNotes)
    .values({ ticketId, operatorId, text })
    .returning();
  return note;
}

/**
 * Передача обращения другому оператору: смена назначения, служебная заметка с
 * комментарием и запись в аудит. Заметка нужна, чтобы принимающий увидел
 * контекст в треде, а аудит — чтобы постфактум было видно, кто и почему отдал.
 */
export async function transferTicket(input: {
  ticketId: string;
  fromOperatorId: string;
  toOperatorId: string;
  comment: string;
  targetUserId: string | null;
}) {
  const [before] = await db
    .select({ assigned: supportTickets.assignedOperatorId })
    .from(supportTickets)
    .where(eq(supportTickets.id, input.ticketId))
    .limit(1);

  await db
    .update(supportTickets)
    .set({ assignedOperatorId: input.toOperatorId, updatedAt: new Date() })
    .where(eq(supportTickets.id, input.ticketId));

  await addNote(input.ticketId, input.fromOperatorId, `Передано другому оператору. ${input.comment}`.trim());

  await writeAudit({
    operatorId: input.fromOperatorId,
    action: 'transfer',
    ticketId: input.ticketId,
    targetUserId: input.targetUserId,
    reason: input.comment,
    oldValue: before?.assigned ?? null,
    newValue: input.toOperatorId,
  });
}

/**
 * Закрытие обращения: статус, отметка времени и CSAT-сообщение пользователю.
 *
 * Запрос оценки идёт обычным сообщением от @aivita, а не отдельной сущностью:
 * пользователь отвечает на него в том же чате, и ответ ложится в rating.
 */
export async function closeTicket(ticketId: string, operatorId: string, conversationId: string, targetUserId: string | null) {
  await db
    .update(supportTickets)
    .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
    .where(eq(supportTickets.id, ticketId));

  const support = await getSupportUser();
  if (support) {
    await deliverMessage(conversationId, support.id, {
      type: 'text',
      content: 'Оцените, пожалуйста, ответ поддержки от 1 до 5 — это поможет нам стать лучше.',
    });
  }

  await writeAudit({
    operatorId,
    action: 'close',
    ticketId,
    targetUserId,
  });
}

export async function reopenTicket(ticketId: string, operatorId: string, targetUserId: string | null) {
  await db
    .update(supportTickets)
    .set({ status: 'open', closedAt: null, updatedAt: new Date() })
    .where(eq(supportTickets.id, ticketId));

  await writeAudit({ operatorId, action: 'reopen', ticketId, targetUserId });
}

/**
 * Сколько минут обращение ждёт первого ответа. null, если ответ уже был или
 * ждать нечего. Порог эскалации — SLA_ESCALATION_MINUTES.
 */
export function waitingMinutes(ticket: { firstResponseAt: Date | null; createdAt: Date }): number | null {
  if (ticket.firstResponseAt) return null;
  return Math.floor((Date.now() - ticket.createdAt.getTime()) / 60_000);
}

export function isEscalated(ticket: { firstResponseAt: Date | null; createdAt: Date }): boolean {
  const w = waitingMinutes(ticket);
  return w !== null && w >= SLA_ESCALATION_MINUTES;
}

/** KPI шапки — считаются из БД, без единой заглушки. */
export async function supportKpi() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [solved] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(supportTickets)
    .where(and(eq(supportTickets.status, 'closed'), gte(supportTickets.closedAt, startOfDay)));

  const [avgFirst] = await db
    .select({
      m: sql<number | null>`avg(extract(epoch from (${supportTickets.firstResponseAt} - ${supportTickets.createdAt})) / 60)`,
    })
    .from(supportTickets)
    .where(isNotNull(supportTickets.firstResponseAt));

  const [active] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(supportTickets)
    .where(eq(supportTickets.status, 'open'));

  return {
    solvedToday: solved?.n ?? 0,
    avgFirstResponseMin: avgFirst?.m == null ? null : Math.round(Number(avgFirst.m)),
    activeCount: active?.n ?? 0,
  };
}

/** Число сообщений в диалоге — для карточки пользователя. */
export async function messageCount(conversationId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));
  return row?.n ?? 0;
}
