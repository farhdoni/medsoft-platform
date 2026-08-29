import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  db,
  conversations,
  conversationParticipants,
  messages,
  userBlocks,
  messageReports,
  messageReactions,
  aivitaUsers,
  aivitaDeviceTokens,
} from '@medsoft/db';
import { and, desc, eq, gt, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import {
  sendPushNotification,
  sendWebPushNotification,
} from '../../lib/push-notifications.js';
import { decidePush } from '../../lib/quiet-hours.js';
import { getSupportUser, onUserMessage } from '../../lib/support-tickets.js';
import { logger } from '../../lib/logger.js';

// AV Chat — open messenger between AIVITA users. Replaces the legacy
// doctor-patient chat (routes/aivita/conversations.ts, dropped together with
// its doctor_conversations/doctor_messages tables in migration 0025).
//
// Two things here are deliberate and should not be "improved" casually:
//
//  1. GET /search matches nickname EXACTLY, never as a prefix or substring.
//     Partial search over a user directory is an enumeration oracle: it lets
//     anyone harvest the user base a few keystrokes at a time. You have to
//     already know the whole @username to find someone.
//
//  2. Blocking is checked in BOTH directions on send. A blocking B means
//     neither can put a message in front of the other, so B cannot route
//     around the block by being the one who writes.

export const aivitaMessagingRouter = new Hono();
aivitaMessagingRouter.use('*', requireAivitaAuth);

const REPLY_PREVIEW_CHARS = 120;

type PublicUser = {
  id: string;
  nickname: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type QuotedRef = {
  id: string;
  sender: PublicUser;
  content: string | null;
};

/** Public-safe projection of a user — never leaks email/phone/externalId. */
const publicUser = {
  id: aivitaUsers.id,
  nickname: aivitaUsers.nickname,
  name: aivitaUsers.name,
  avatarUrl: aivitaUsers.avatarUrl,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

/** The caller's participant row, or null when they are not in the conversation. */
async function participantOf(convId: string, userId: string) {
  const [row] = await db
    .select()
    .from(conversationParticipants)
    .where(and(
      eq(conversationParticipants.conversationId, convId),
      eq(conversationParticipants.userId, userId),
    ))
    .limit(1);
  return row ?? null;
}

/** True when either user has blocked the other. */
async function blockExists(a: string, b: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(or(
      and(eq(userBlocks.blockerId, a), eq(userBlocks.blockedId, b)),
      and(eq(userBlocks.blockerId, b), eq(userBlocks.blockedId, a)),
    ))
    .limit(1);
  return !!row;
}

/** Push to one user across their registered devices, Expo and web alike. */
async function pushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const tokens = await db
    .select({ pushToken: aivitaDeviceTokens.pushToken, platform: aivitaDeviceTokens.platform })
    .from(aivitaDeviceTokens)
    .where(eq(aivitaDeviceTokens.userId, userId));

  if (tokens.length === 0) return;

  const expo = tokens.filter((t) => t.platform !== 'web').map((t) => t.pushToken);
  const web = tokens.filter((t) => t.platform === 'web');

  await Promise.all([
    sendPushNotification(expo, title, body, data),
    ...web.map((t) => sendWebPushNotification(t.pushToken, title, body, data)),
  ]);
}

/**
 * The support account is identified by nickname, from SUPPORT_USER_NICKNAME,
 * so no user id is baked into the code and the account can be reseeded.
 */
const SUPPORT_NICKNAME = (process.env.SUPPORT_USER_NICKNAME ?? 'aivita').toLowerCase();

export function isSupportNickname(nickname: string | null): boolean {
  return !!nickname && nickname.toLowerCase() === SUPPORT_NICKNAME;
}

async function userIsSupport(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ nickname: aivitaUsers.nickname })
    .from(aivitaUsers)
    .where(eq(aivitaUsers.id, userId))
    .limit(1);
  return isSupportNickname(row?.nickname ?? null);
}

/** The 1:1 conversation these two already share, if any. */
async function directConversationBetween(a: string, b: string) {
  const mine = await db
    .select({ id: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, a));
  if (mine.length === 0) return null;

  const shared = await db
    .select({ id: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(and(
      eq(conversationParticipants.userId, b),
      inArray(conversationParticipants.conversationId, mine.map((r) => r.id)),
    ));
  if (shared.length === 0) return null;

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(
      inArray(conversations.id, shared.map((r) => r.id)),
      eq(conversations.type, 'direct'),
    ))
    .limit(1);
  return conv ?? null;
}

/**
 * Everything AV Chat stores per account lives in one avChat block inside the
 * aivita_users.preferences jsonb — no columns, no migration. Defaults are
 * applied on read so an account that never opened the settings screen behaves
 * like the documented default.
 */
export type AvChatSettings = {
  restrictNewChats: boolean;
  notifPreview: boolean;
  quietHours: boolean;
};

const SETTINGS_DEFAULTS: AvChatSettings = {
  restrictNewChats: false,
  notifPreview: true,
  quietHours: false,
};

async function readAvChatSettings(userId: string): Promise<AvChatSettings> {
  const [row] = await db
    .select({ preferences: aivitaUsers.preferences })
    .from(aivitaUsers)
    .where(eq(aivitaUsers.id, userId))
    .limit(1);
  const stored = (row?.preferences as { avChat?: Partial<AvChatSettings> } | null)?.avChat ?? {};
  return { ...SETTINGS_DEFAULTS, ...stored };
}

async function restrictsNewChats(userId: string): Promise<boolean> {
  return (await readAvChatSettings(userId)).restrictNewChats;
}

// ─── POST /conversations ──────────────────────────────────────────────────────
// Start or fetch the 1:1 conversation with another user. Idempotent: calling
// it twice returns the same conversation rather than creating a second one.

const startSchema = z.object({ userId: z.string().uuid() });

aivitaMessagingRouter.post('/conversations', zValidator('json', startSchema), async (c) => {
  const me = c.get('aivitaUserId');
  const otherId = c.req.valid('json').userId;

  if (otherId === me) return c.json({ error: 'Cannot open a conversation with yourself' }, 400);

  const [other] = await db.select(publicUser).from(aivitaUsers).where(eq(aivitaUsers.id, otherId)).limit(1);
  if (!other) return c.json({ error: 'User not found' }, 404);

  if (await blockExists(me, otherId)) {
    return c.json({ error: 'Conversation unavailable' }, 403);
  }

  const otherIsSupport = isSupportNickname(other.nickname);
  const iAmSupport = await userIsSupport(me);

  // "Only people I already talk to" gates NEW conversations only, and never
  // applies to support in either direction: someone must always be able to
  // reach help, and help must always be able to answer.
  if (!otherIsSupport && !iAmSupport && (await restrictsNewChats(otherId))) {
    if (!(await directConversationBetween(me, otherId))) {
      return c.json({ error: 'User is not accepting new conversations', code: 'restricted' }, 403);
    }
  }

  const existing = await directConversationBetween(me, otherId);
  if (existing) return c.json({ data: { ...existing, participant: other, created: false } });

  const [conv] = await db.insert(conversations).values({ type: 'direct' }).returning();
  await db.insert(conversationParticipants).values([
    { conversationId: conv.id, userId: me },
    { conversationId: conv.id, userId: otherId },
  ]);

  // A support conversation opens with a greeting from support, written
  // server-side: whoever asks for help should land on something rather than
  // an empty screen.
  if (otherIsSupport) {
    await db.insert(messages).values({
      conversationId: conv.id,
      senderId: otherId,
      type: 'text',
      content: 'Здравствуйте! Опишите вопрос — поможем. Можно приложить скриншот 📎',
    });
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conv.id));
  }

  return c.json({ data: { ...conv, participant: other, created: true } }, 201);
});

// ─── GET /conversations ───────────────────────────────────────────────────────
// The caller's conversation list: the other party, the last message, and how
// many messages arrived after their last_read_at.

// ?archived=1 returns only the archived chats; by default they are hidden.
// A new message never un-archives a conversation — archiving is a decision
// about attention, not a snooze, which is the behaviour people expect from
// every other messenger.
aivitaMessagingRouter.get('/conversations', async (c) => {
  const me = c.get('aivitaUserId');
  const wantArchived = c.req.query('archived') === '1';

  const myRows = await db
    .select({
      convId: conversationParticipants.conversationId,
      lastReadAt: conversationParticipants.lastReadAt,
      pinnedAt: conversationParticipants.pinnedAt,
      mutedUntil: conversationParticipants.mutedUntil,
      archivedAt: conversationParticipants.archivedAt,
    })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, me));

  const visible = myRows.filter((r) => (wantArchived ? r.archivedAt !== null : r.archivedAt === null));
  if (visible.length === 0) return c.json({ data: [] });

  const convIds = visible.map((r) => r.convId);
  const prefsMap = new Map(visible.map((r) => [r.convId, r]));

  const convs = await db
    .select()
    .from(conversations)
    .where(inArray(conversations.id, convIds));

  const others = await db
    .select({
      convId: conversationParticipants.conversationId,
      user: publicUser,
    })
    .from(conversationParticipants)
    .innerJoin(aivitaUsers, eq(aivitaUsers.id, conversationParticipants.userId))
    .where(and(
      inArray(conversationParticipants.conversationId, convIds),
      ne(conversationParticipants.userId, me),
    ));
  const otherMap = new Map(others.map((r) => [r.convId, r.user]));

  const now = Date.now();

  const data = await Promise.all(convs.map(async (conv) => {
    const [last] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conv.id), isNull(messages.deletedAt)))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    const prefs = prefsMap.get(conv.id);
    const lastReadAt = prefs?.lastReadAt ?? null;
    const [unread] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(
        eq(messages.conversationId, conv.id),
        ne(messages.senderId, me),
        isNull(messages.deletedAt),
        lastReadAt ? gt(messages.createdAt, lastReadAt) : undefined,
      ));

    return {
      ...conv,
      participant: otherMap.get(conv.id) ?? null,
      lastMessage: last ?? null,
      unreadCount: unread?.n ?? 0,
      pinned: prefs?.pinnedAt != null,
      pinnedAt: prefs?.pinnedAt ?? null,
      // An expired mute simply stops counting — nothing has to clear it.
      muted: prefs?.mutedUntil != null && prefs.mutedUntil.getTime() > now,
      mutedUntil: prefs?.mutedUntil ?? null,
      archived: prefs?.archivedAt != null,
    };
  }));

  // Pinned block first, most recently pinned on top; everything else by
  // recency. Sorted here rather than in SQL because the pin lives on the
  // participant row while the recency lives on the conversation.
  data.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.pinned && b.pinned) {
      return (b.pinnedAt?.getTime() ?? 0) - (a.pinnedAt?.getTime() ?? 0);
    }
    const at = a.lastMessageAt?.getTime() ?? 0;
    const bt = b.lastMessageAt?.getTime() ?? 0;
    return bt - at;
  });

  return c.json({ data });
});

// ─── PUT /conversations/:id/prefs ─────────────────────────────────────────────
// Pin, mute and archive are one participant’s view of a chat, so this only
// ever writes the caller’s own row.

const convPrefsSchema = z.object({
  pinned: z.boolean().optional(),
  muted: z.boolean().optional(),
  archived: z.boolean().optional(),
});

// "Muted" with no end date is stored as a far-future instant rather than a
// sentinel, so the push path can compare one column against now() and needs
// no special case for forever.
const MUTE_FOREVER = new Date('2099-12-31T00:00:00.000Z');

aivitaMessagingRouter.put('/conversations/:id/prefs', zValidator('json', convPrefsSchema), async (c) => {
  const me = c.get('aivitaUserId');
  const convId = c.req.param('id');
  const patch = c.req.valid('json');

  const row = await participantOf(convId, me);
  if (!row) return c.json({ error: 'Forbidden' }, 403);

  const now = new Date();
  const set: Record<string, Date | null> = {};
  if (patch.pinned !== undefined) set.pinnedAt = patch.pinned ? now : null;
  if (patch.muted !== undefined) set.mutedUntil = patch.muted ? MUTE_FOREVER : null;
  if (patch.archived !== undefined) set.archivedAt = patch.archived ? now : null;

  if (Object.keys(set).length > 0) {
    await db.update(conversationParticipants)
      .set(set)
      .where(and(
        eq(conversationParticipants.conversationId, convId),
        eq(conversationParticipants.userId, me),
      ));
  }

  const updated = await participantOf(convId, me);
  return c.json({
    data: {
      conversationId: convId,
      pinned: updated?.pinnedAt != null,
      muted: updated?.mutedUntil != null && updated.mutedUntil.getTime() > Date.now(),
      archived: updated?.archivedAt != null,
    },
  });
});

// ─── GET /conversations/:id/messages ──────────────────────────────────────────
// History with ?limit&offset, plus ?after=ISO to poll only what is new — the
// pagination contract the old conversations.ts route exposed, kept so the
// client's polling loop does not have to change shape.
//
// Each message carries its expanded reply_to quote and an aggregate of
// reactions (emoji, how many, and whether the caller is one of them).

aivitaMessagingRouter.get('/conversations/:id/messages', async (c) => {
  const me = c.get('aivitaUserId');
  const convId = c.req.param('id');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '60'), 100);
  const offset = parseInt(c.req.query('offset') ?? '0');
  const after = c.req.query('after');

  if (!(await participantOf(convId, me))) return c.json({ error: 'Forbidden' }, 403);

  // Deleted messages are still selected here — they render as a tombstone.
  // The conversation list and the unread count still skip them.
  const where = after
    ? and(eq(messages.conversationId, convId), gt(messages.createdAt, new Date(after)))
    : eq(messages.conversationId, convId);

  const rows = await db
    .select()
    .from(messages)
    .where(where)
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset);

  const ids = rows.map((m) => m.id);

  // Quoted messages, one query for the whole page.
  const quotedIds = [...new Set(rows.map((m) => m.replyToId).filter((v): v is string => !!v))];
  const quotedMap = new Map<string, QuotedRef>();
  if (quotedIds.length > 0) {
    const quoted = await db
      .select({
        id: messages.id,
        content: messages.content,
        deletedAt: messages.deletedAt,
        sender: publicUser,
      })
      .from(messages)
      .innerJoin(aivitaUsers, eq(aivitaUsers.id, messages.senderId))
      .where(inArray(messages.id, quotedIds));

    for (const q of quoted) {
      quotedMap.set(q.id, {
        id: q.id,
        sender: q.sender,
        // A deleted message still anchors the reply, but its text is gone.
        content: q.deletedAt ? null : (q.content ?? '').slice(0, REPLY_PREVIEW_CHARS),
      });
    }
  }

  // Reactions for the whole page, aggregated in memory — a page is <=100 rows.
  const reactionMap = new Map<string, { emoji: string; count: number; reacted: boolean }[]>();
  if (ids.length > 0) {
    const reactions = await db
      .select({
        messageId: messageReactions.messageId,
        emoji: messageReactions.emoji,
        userId: messageReactions.userId,
      })
      .from(messageReactions)
      .where(inArray(messageReactions.messageId, ids));

    for (const r of reactions) {
      const list = reactionMap.get(r.messageId) ?? [];
      const hit = list.find((x) => x.emoji === r.emoji);
      if (hit) {
        hit.count += 1;
        hit.reacted = hit.reacted || r.userId === me;
      } else {
        list.push({ emoji: r.emoji, count: 1, reacted: r.userId === me });
      }
      reactionMap.set(r.messageId, list);
    }
  }

  // A deleted message stays in the thread as a tombstone so replies and
  // reactions pointing at it still make sense — but nothing of what it said
  // survives the response: no content, no attachment, no coordinates.
  const data = rows.reverse().map((m) => {
    const base = {
      ...m,
      replyTo: m.replyToId ? quotedMap.get(m.replyToId) ?? null : null,
      reactions: reactionMap.get(m.id) ?? [],
    };
    if (!m.deletedAt) return { ...base, deleted: false };
    return {
      ...base,
      deleted: true,
      content: null,
      attachmentUrl: null,
      attachmentName: null,
      attachmentMime: null,
      attachmentSize: null,
      previewUrl: null,
      durationSeconds: null,
      locationLat: null,
      locationLng: null,
    };
  });

  return c.json({ data });
});

// ─── POST /conversations/:id/messages ─────────────────────────────────────────

const sendSchema = z.object({
  content: z.string().min(1).max(4000).optional(),
  type: z.enum(['text', 'voice', 'file', 'image', 'location']).default('text'),
  replyToId: z.string().uuid().optional(),
  attachmentUrl: z.string().url().optional(),
  attachmentName: z.string().optional(),
  attachmentMime: z.string().optional(),
  attachmentSize: z.number().int().optional(),
  // Voice length; previewUrl is a GIF/image still frame (migration 0034).
  durationSeconds: z.number().int().positive().max(3600).optional(),
  previewUrl: z.string().url().optional(),
  // A single pin (migration 0035). Ranges are the real ones, not a rough
  // sanity check: anything outside them is not a point on Earth.
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
});

/**
 * Единственный путь, которым сообщение попадает в диалог.
 *
 * Кабинет поддержки отвечает от @aivita через эту же функцию, а не своей
 * веткой. Иначе разъезжается всё, что висит на отправке: lastMessageAt,
 * непрочитанные у получателя и — главное — гейтинг пуша, который решает
 * decidePush по muted, quiet hours и настройке превью. Прошлая админская
 * реализация дёргала pushToUser напрямую и все три правила игнорировала.
 */
export type DeliverInput = z.infer<typeof sendSchema>;
export type DeliverResult =
  | { ok: true; message: typeof messages.$inferSelect }
  | { ok: false; status: 400 | 403; error: string };

export async function deliverMessage(
  convId: string,
  me: string,
  body: DeliverInput,
): Promise<DeliverResult> {
    // A location message carries a pin instead of text or a file, so it needs
  // its own emptiness check rather than the content/attachment one.
  if (body.type === 'location') {
    if (body.locationLat === undefined || body.locationLng === undefined) {
      return { ok: false as const, status: 400, error: 'A location message needs locationLat and locationLng' };
    }
  } else if (!body.content && !body.attachmentUrl) {
    return { ok: false as const, status: 400, error: 'Message must carry content or an attachment' };
  }

  if (!(await participantOf(convId, me))) return { ok: false as const, status: 403, error: 'Forbidden' };

  // Everyone else in the conversation — for a direct chat, exactly one person.
  const others = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(and(
      eq(conversationParticipants.conversationId, convId),
      ne(conversationParticipants.userId, me),
    ));

  for (const o of others) {
    if (await blockExists(me, o.userId)) {
      // Deliberately the same message whichever direction the block runs, so
      // the response does not disclose who blocked whom.
      return { ok: false as const, status: 403, error: 'Message not delivered — conversation is blocked' };
    }
  }

  // A quote must point at a message in this same conversation, otherwise a
  // reply could be used to pull text out of a chat the caller cannot read.
  if (body.replyToId) {
    const [target] = await db
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.id, body.replyToId), eq(messages.conversationId, convId)))
      .limit(1);
    if (!target) return { ok: false as const, status: 400, error: 'replyToId does not belong to this conversation' };
  }

  const [msg] = await db.insert(messages).values({
    conversationId: convId,
    senderId: me,
    type: body.type,
    content: body.content ?? null,
    replyToId: body.replyToId ?? null,
    attachmentUrl: body.attachmentUrl ?? null,
    attachmentName: body.attachmentName ?? null,
    attachmentMime: body.attachmentMime ?? null,
    attachmentSize: body.attachmentSize ?? null,
    durationSeconds: body.durationSeconds ?? null,
    previewUrl: body.previewUrl ?? null,
    locationLat: body.locationLat ?? null,
    locationLng: body.locationLng ?? null,
  }).returning();

  await db.update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, convId));

  // Push the other side. Never let a push failure fail the send — the message
  // is already committed, and delivery is a separate concern from storage.
  //
  // Three things can silence or trim it, all decided in decidePush():
  // the recipient muted this conversation, their quiet hours are running in
  // their own timezone, or they asked not to see message text on the lock
  // screen. A suppressed push changes nothing else — the message is stored
  // and their unread count still rises.
  const [sender] = await db.select(publicUser).from(aivitaUsers).where(eq(aivitaUsers.id, me)).limit(1);
  const senderName = sender?.name ?? (sender?.nickname ? '@' + sender.nickname : 'Новое сообщение');
  const fullPreview = body.content ? body.content.slice(0, REPLY_PREVIEW_CHARS) : '📎 Вложение';

  for (const o of others) {
    void (async () => {
      const [recipient] = await db
        .select({ timezone: aivitaUsers.timezone })
        .from(aivitaUsers)
        .where(eq(aivitaUsers.id, o.userId))
        .limit(1);

      const seat = await participantOf(convId, o.userId);
      const settings = await readAvChatSettings(o.userId);

      const decision = decidePush({
        now: new Date(),
        mutedUntil: seat?.mutedUntil ?? null,
        quietHours: settings.quietHours,
        notifPreview: settings.notifPreview,
        timeZone: recipient?.timezone,
      });

      if (!decision.send) {
        logger.info({ conversationId: convId, recipient: o.userId, reason: decision.reason }, '[Push] suppressed');
        return;
      }

      // Without preview the notification says only that something arrived —
      // no text, no sender name, no file name.
      const title = decision.preview ? senderName : 'Новое сообщение';
      const bodyText = decision.preview ? fullPreview : 'Новое сообщение';
      logger.info({ conversationId: convId, recipient: o.userId, preview: decision.preview }, '[Push] sending');

      await pushToUser(o.userId, title, bodyText, {
        conversationId: convId,
        messageId: msg.id,
        url: '/chat/' + convId,
      });
    })().catch(() => {});
  }

  return { ok: true as const, message: msg };
}

aivitaMessagingRouter.post('/conversations/:id/messages', zValidator('json', sendSchema), async (c) => {
  const convId = c.req.param('id');
  const me = c.get('aivitaUserId');
  const result = await deliverMessage(convId, me, c.req.valid('json'));
  if (!result.ok) return c.json({ error: result.error }, result.status);

  // Диалог с поддержкой ведёт себя как тикет: закрытый переоткрывается (с
  // сохранением оператора), а вне рабочих часов уходит один автоответ.
  // Проверка «отправитель не поддержка» здесь не косметическая: автоответ
  // шлёт та же deliverMessage, и без неё он вызвал бы сам себя.
  void (async () => {
    if (await userIsSupport(me)) return;
    const support = await getSupportUser();
    if (!support) return;
    if (!(await participantOf(convId, support.id))) return;
    await onUserMessage(convId);
  })().catch((err) => logger.warn({ err, conversationId: convId }, '[Support] обработка тикета не удалась'));

  return c.json({ data: result.message }, 201);
});

// ─── PUT /conversations/:id/read ──────────────────────────────────────────────

aivitaMessagingRouter.put('/conversations/:id/read', async (c) => {
  const me = c.get('aivitaUserId');
  const convId = c.req.param('id');

  if (!(await participantOf(convId, me))) return c.json({ error: 'Forbidden' }, 403);

  const now = new Date();
  await db.update(conversationParticipants)
    .set({ lastReadAt: now })
    .where(and(
      eq(conversationParticipants.conversationId, convId),
      eq(conversationParticipants.userId, me),
    ));

  return c.json({ data: { lastReadAt: now.toISOString() } });
});

// ─── Reactions ────────────────────────────────────────────────────────────────
// One reaction per user per message: reacting again replaces the previous
// emoji rather than stacking, which is what UNIQUE(message_id, user_id) in
// migration 0025 enforces.

const reactSchema = z.object({ emoji: z.string().min(1).max(16) });

aivitaMessagingRouter.post('/messages/:id/reactions', zValidator('json', reactSchema), async (c) => {
  const me = c.get('aivitaUserId');
  const messageId = c.req.param('id');
  const { emoji } = c.req.valid('json');

  const [msg] = await db.select({ conversationId: messages.conversationId })
    .from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!msg) return c.json({ error: 'Message not found' }, 404);
  if (!(await participantOf(msg.conversationId, me))) return c.json({ error: 'Forbidden' }, 403);

  const [row] = await db.insert(messageReactions)
    .values({ messageId, userId: me, emoji })
    .onConflictDoUpdate({
      target: [messageReactions.messageId, messageReactions.userId],
      set: { emoji, createdAt: new Date() },
    })
    .returning();

  return c.json({ data: row });
});

aivitaMessagingRouter.delete('/messages/:id/reactions', async (c) => {
  const me = c.get('aivitaUserId');
  const messageId = c.req.param('id');

  const [msg] = await db.select({ conversationId: messages.conversationId })
    .from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!msg) return c.json({ error: 'Message not found' }, 404);
  if (!(await participantOf(msg.conversationId, me))) return c.json({ error: 'Forbidden' }, 403);

  await db.delete(messageReactions).where(and(
    eq(messageReactions.messageId, messageId),
    eq(messageReactions.userId, me),
  ));

  return c.json({ data: { ok: true } });
});

// ─── DELETE /messages/:id ─────────────────────────────────────────────────────
// Soft delete, author only. The row survives so replies and reactions that
// point at it still resolve, but GET history blanks every field that carried
// what the message actually said.

aivitaMessagingRouter.delete('/messages/:id', async (c) => {
  const me = c.get('aivitaUserId');
  const messageId = c.req.param('id');

  const [msg] = await db
    .select({ id: messages.id, senderId: messages.senderId, deletedAt: messages.deletedAt })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!msg) return c.json({ error: 'Message not found' }, 404);
  // Only the author. Deleting someone else's words is moderation, not a
  // chat feature — that is what the report flow is for.
  if (msg.senderId !== me) return c.json({ error: 'Only the author can delete a message' }, 403);

  if (!msg.deletedAt) {
    await db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, messageId));
  }

  return c.json({ data: { id: messageId, deleted: true } });
});

// ─── Chat settings ────────────────────────────────────────────────────────────
// avChat preferences live inside the aivita_users.preferences jsonb, so there
// is no column and no migration. Written with a merge, never a replace: the
// same blob holds notification, theme and unit settings owned by other screens.

aivitaMessagingRouter.get('/settings', async (c) => {
  const me = c.get('aivitaUserId');
  return c.json({
    data: {
      ...(await readAvChatSettings(me)),
      supportNickname: SUPPORT_NICKNAME,
    },
  });
});

// Every field optional: the settings screen sends only the switch that moved,
// so one toggle can never clobber another.
const settingsSchema = z.object({
  restrictNewChats: z.boolean().optional(),
  notifPreview: z.boolean().optional(),
  quietHours: z.boolean().optional(),
});

aivitaMessagingRouter.put('/settings', zValidator('json', settingsSchema), async (c) => {
  const me = c.get('aivitaUserId');
  const patch = c.req.valid('json');

  const [row] = await db
    .select({ preferences: aivitaUsers.preferences })
    .from(aivitaUsers)
    .where(eq(aivitaUsers.id, me))
    .limit(1);

  // Merge, never replace: the same blob holds notification, theme and unit
  // settings owned by other screens.
  const current = (row?.preferences ?? {}) as Record<string, unknown>;
  const avChat = (current.avChat ?? {}) as Record<string, unknown>;
  const merged = { ...avChat, ...patch };

  await db.update(aivitaUsers)
    .set({
      preferences: { ...current, avChat: merged } as typeof aivitaUsers.$inferInsert.preferences,
      updatedAt: new Date(),
    })
    .where(eq(aivitaUsers.id, me));

  return c.json({ data: { ...SETTINGS_DEFAULTS, ...merged } });
});

// ─── Blocking ─────────────────────────────────────────────────────────────────

const blockSchema = z.object({ userId: z.string().uuid() });

// GET /block — who the caller has blocked, with enough profile to render the
// settings list. Only the caller's own blocks: nobody may ask who blocked THEM,
// which would turn the endpoint into a way to probe other people's choices.
aivitaMessagingRouter.get('/block', async (c) => {
  const me = c.get('aivitaUserId');

  const rows = await db
    .select({
      id: userBlocks.id,
      createdAt: userBlocks.createdAt,
      user: publicUser,
    })
    .from(userBlocks)
    .innerJoin(aivitaUsers, eq(aivitaUsers.id, userBlocks.blockedId))
    .where(eq(userBlocks.blockerId, me))
    .orderBy(desc(userBlocks.createdAt));

  return c.json({ data: rows });
});

aivitaMessagingRouter.post('/block', zValidator('json', blockSchema), async (c) => {
  const me = c.get('aivitaUserId');
  const { userId } = c.req.valid('json');
  if (userId === me) return c.json({ error: 'Cannot block yourself' }, 400);

  const [row] = await db.insert(userBlocks)
    .values({ blockerId: me, blockedId: userId })
    .onConflictDoNothing({ target: [userBlocks.blockerId, userBlocks.blockedId] })
    .returning();

  return c.json({ data: row ?? { blockerId: me, blockedId: userId, alreadyBlocked: true } }, 201);
});

aivitaMessagingRouter.delete('/block/:userId', async (c) => {
  const me = c.get('aivitaUserId');
  const userId = c.req.param('userId');

  await db.delete(userBlocks).where(and(
    eq(userBlocks.blockerId, me),
    eq(userBlocks.blockedId, userId),
  ));

  return c.json({ data: { ok: true } });
});

// ─── Reporting ────────────────────────────────────────────────────────────────

const reportSchema = z.object({
  messageId: z.string().uuid(),
  reason: z.string().min(1).max(1000),
});

aivitaMessagingRouter.post('/report', zValidator('json', reportSchema), async (c) => {
  const me = c.get('aivitaUserId');
  const { messageId, reason } = c.req.valid('json');

  const [msg] = await db.select({ conversationId: messages.conversationId })
    .from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!msg) return c.json({ error: 'Message not found' }, 404);
  if (!(await participantOf(msg.conversationId, me))) return c.json({ error: 'Forbidden' }, 403);

  const [row] = await db.insert(messageReports)
    .values({ messageId, reporterId: me, reason })
    .returning();

  return c.json({ data: row }, 201);
});

// ─── GET /search ──────────────────────────────────────────────────────────────
// EXACT @username only — see the note at the top of this file. A prefix or
// ILIKE match here would turn this endpoint into a user-directory scraper.

aivitaMessagingRouter.get('/search', async (c) => {
  const me = c.get('aivitaUserId');
  const raw = (c.req.query('q') ?? '').trim();
  const nickname = raw.startsWith('@') ? raw.slice(1) : raw;

  if (!nickname) return c.json({ error: 'q is required' }, 400);

  const [user] = await db
    .select(publicUser)
    .from(aivitaUsers)
    .where(eq(aivitaUsers.nickname, nickname))
    .limit(1);

  // Same empty answer for "no such user", "that's you" and "blocked", so the
  // response cannot be used to probe which of the three is the case.
  if (!user || user.id === me) return c.json({ data: null });
  if (await blockExists(me, user.id)) return c.json({ data: null });

  return c.json({ data: user });
});
