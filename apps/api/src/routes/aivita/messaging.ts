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

  // A direct conversation both of us already belong to, if there is one.
  const mine = await db
    .select({ id: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, me));

  if (mine.length > 0) {
    const shared = await db
      .select({ id: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.userId, otherId),
        inArray(conversationParticipants.conversationId, mine.map((r) => r.id)),
      ));

    if (shared.length > 0) {
      const [existing] = await db
        .select()
        .from(conversations)
        .where(and(
          inArray(conversations.id, shared.map((r) => r.id)),
          eq(conversations.type, 'direct'),
        ))
        .limit(1);
      if (existing) return c.json({ data: { ...existing, participant: other, created: false } });
    }
  }

  const [conv] = await db.insert(conversations).values({ type: 'direct' }).returning();
  await db.insert(conversationParticipants).values([
    { conversationId: conv.id, userId: me },
    { conversationId: conv.id, userId: otherId },
  ]);

  return c.json({ data: { ...conv, participant: other, created: true } }, 201);
});

// ─── GET /conversations ───────────────────────────────────────────────────────
// The caller's conversation list: the other party, the last message, and how
// many messages arrived after their last_read_at.

aivitaMessagingRouter.get('/conversations', async (c) => {
  const me = c.get('aivitaUserId');

  const myRows = await db
    .select({
      convId: conversationParticipants.conversationId,
      lastReadAt: conversationParticipants.lastReadAt,
    })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, me));

  if (myRows.length === 0) return c.json({ data: [] });

  const convIds = myRows.map((r) => r.convId);
  const readMap = new Map(myRows.map((r) => [r.convId, r.lastReadAt]));

  const convs = await db
    .select()
    .from(conversations)
    .where(inArray(conversations.id, convIds))
    .orderBy(desc(conversations.lastMessageAt));

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

  const data = await Promise.all(convs.map(async (conv) => {
    const [last] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conv.id), isNull(messages.deletedAt)))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    const lastReadAt = readMap.get(conv.id) ?? null;
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
    };
  }));

  return c.json({ data });
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

  const where = after
    ? and(
        eq(messages.conversationId, convId),
        gt(messages.createdAt, new Date(after)),
        isNull(messages.deletedAt),
      )
    : and(eq(messages.conversationId, convId), isNull(messages.deletedAt));

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

  const data = rows.reverse().map((m) => ({
    ...m,
    replyTo: m.replyToId ? quotedMap.get(m.replyToId) ?? null : null,
    reactions: reactionMap.get(m.id) ?? [],
  }));

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

aivitaMessagingRouter.post('/conversations/:id/messages', zValidator('json', sendSchema), async (c) => {
  const me = c.get('aivitaUserId');
  const convId = c.req.param('id');
  const body = c.req.valid('json');

  // A location message carries a pin instead of text or a file, so it needs
  // its own emptiness check rather than the content/attachment one.
  if (body.type === 'location') {
    if (body.locationLat === undefined || body.locationLng === undefined) {
      return c.json({ error: 'A location message needs locationLat and locationLng' }, 400);
    }
  } else if (!body.content && !body.attachmentUrl) {
    return c.json({ error: 'Message must carry content or an attachment' }, 400);
  }

  if (!(await participantOf(convId, me))) return c.json({ error: 'Forbidden' }, 403);

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
      return c.json({ error: 'Message not delivered — conversation is blocked' }, 403);
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
    if (!target) return c.json({ error: 'replyToId does not belong to this conversation' }, 400);
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
  // is already committed.
  const [sender] = await db.select(publicUser).from(aivitaUsers).where(eq(aivitaUsers.id, me)).limit(1);
  const title = sender?.name ?? (sender?.nickname ? '@' + sender.nickname : 'Новое сообщение');
  const preview = body.content ? body.content.slice(0, REPLY_PREVIEW_CHARS) : '📎 Вложение';
  for (const o of others) {
    void pushToUser(o.userId, title, preview, {
      conversationId: convId,
      messageId: msg.id,
      url: '/chat/' + convId,
    }).catch(() => {});
  }

  return c.json({ data: msg }, 201);
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
