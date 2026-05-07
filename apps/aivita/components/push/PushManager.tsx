'use client';

import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

/**
 * Invisible component that registers the service worker and
 * requests permission for web push notifications.
 * Placed in the app layout so it runs on every authenticated page.
 */
export default function PushManager() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (!('Notification' in window)) return;

    async function setup() {
      try {
        // Register (or re-use existing) service worker
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // Request permission if not yet asked
        if (Notification.permission === 'default') {
          // Small delay to not prompt immediately on page load
          await new Promise<void>((resolve) => setTimeout(resolve, 3000));
          await Notification.requestPermission();
        }

        if (Notification.permission !== 'granted') return;

        // Try to get a push subscription (VAPID not configured → skip silently)
        try {
          const sub = await reg.pushManager.getSubscription();
          const endpoint = sub?.endpoint;
          if (endpoint) {
            await fetch(`${API}/v1/aivita/medications/push/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ token: endpoint, platform: 'web' }),
            }).catch(() => {});
          }
        } catch {
          // VAPID not set up — that's fine, in-app reminders still work
        }
      } catch (err) {
        console.warn('[PushManager] Setup failed:', err);
      }
    }

    void setup();
  }, []);

  return null;
}
