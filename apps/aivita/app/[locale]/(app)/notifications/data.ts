import { cookies } from 'next/headers';
import { api } from '@/lib/api-client';

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string | null;
  link: string | null;
  isRead: boolean;
  isArchived: boolean;
  priority: string;
  createdAt: string;
  // legacy
  readAt?: string | null;
  payload?: { screen?: string; params?: Record<string, unknown> } | null;
}

export async function loadNotificationsData() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';

  const res = await api.notifications.list(sessionCookie);
  const notifications: NotificationRecord[] =
    'data' in res ? (res.data as NotificationRecord[]) : [];

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead && !n.readAt).length,
  };
}
