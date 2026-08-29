import type { MessengerUser } from './types';

const WEEKDAYS_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Conversation-list timestamp: today → HH:MM, yesterday → «вчера», within the
 * last week → weekday, older → DD.MM.YY.
 */
export function formatListTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);

  if (days <= 0) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  if (days === 1) return 'вчера';
  if (days < 7) return WEEKDAYS_RU[d.getDay()];
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Time shown inside a message bubble. */
export function formatBubbleTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/** Day separator label inside a thread. */
export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : startOfDay(d).toString();
}

/** Up to two letters for the avatar fallback. */
export function initialsOf(user: MessengerUser | null): string {
  const raw = (user?.name ?? user?.nickname ?? '').trim();
  if (!raw) return '··';
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return raw.slice(0, 2).toUpperCase();
}

export function displayName(user: MessengerUser | null): string {
  return user?.name?.trim() || (user?.nickname ? '@' + user.nickname : 'Собеседник');
}

/** One-line preview of a conversation's last message. */
export function previewOf(
  content: string | null,
  type: string | undefined,
  hasAttachment: boolean,
): string {
  if (content && content.trim()) return content.replace(/\s+/g, ' ').trim();
  if (type === 'image') return '📷 Фото';
  if (type === 'voice') return '🎤 Голосовое сообщение';
  if (type === 'location') return '📍 Локация';
  if (hasAttachment || type === 'file') return '📎 Файл';
  return 'Сообщение';
}

/** Human file size for the attachment card. */
export function formatBytes(bytes: number | null): string {
  if (!bytes || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/** Voice length as m:ss. */
export function formatDuration(seconds: number | null): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
