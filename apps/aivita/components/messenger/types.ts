// Shapes returned by /v1/aivita/messaging (apps/api/src/routes/aivita/messaging.ts),
// reached from the client through /api/proxy/messaging/*.
//
// Field names here mirror the API exactly — the API returns drizzle rows, so
// they are camelCase (replyToId, lastMessageAt, unreadCount), NOT the snake_case
// of the underlying columns. Keep them in sync with the route file.

export type MessengerUser = {
  id: string;
  nickname: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export type ReactionAggregate = {
  emoji: string;
  count: number;
  /** True when the caller is one of the people who reacted with this emoji. */
  reacted: boolean;
};

export type ReplyQuote = {
  id: string;
  sender: MessengerUser;
  /** Null when the quoted message was deleted. */
  content: string | null;
};

export type MessengerMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'voice' | 'file' | 'image' | 'location';
  content: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  /** Voice length in whole seconds (migration 0034). */
  durationSeconds: number | null;
  /** Still frame for a GIF/image, separate from the played asset (0034). */
  previewUrl: string | null;
  replyToId: string | null;
  deletedAt: string | null;
  createdAt: string;
  /** Present on GET /conversations/:id/messages, absent on POST responses. */
  replyTo?: ReplyQuote | null;
  reactions?: ReactionAggregate[];
};

export type MessengerConversation = {
  id: string;
  type: 'direct' | 'group' | 'channel';
  status: 'active' | 'archived';
  lastMessageAt: string | null;
  createdAt: string;
  participant: MessengerUser | null;
  lastMessage: MessengerMessage | null;
  unreadCount: number;
};

/** Every messaging endpoint wraps its payload in { data }. */
export type ApiEnvelope<T> = { data: T; error?: string };

/** One GIF from the provider, as /api/gif normalises it. */
export type GifItem = {
  id: string;
  /** Animated file — what the bubble plays. */
  url: string;
  /** Static thumbnail — what the picker grid shows. */
  preview: string;
  /** Animated thumbnail — played only while a grid tile is hovered. */
  thumb: string;
  width: number;
  height: number;
  description: string;
};

/** A sticker chosen from a pack under public/stickers/. */
export type StickerRef = {
  url: string;
  name: string;
  pack: string;
};

/**
 * Marker mime for stickers. They ride on message_type 'image' but must render
 * bare — no bubble, no chrome — so the thread keys off this exact value.
 */
export const STICKER_MIME = 'image/sticker+svg';
