'use client';

import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

/** Register a native Expo push token via the authenticated proxy (cookie auth). */
async function registerNativePushToken(pushToken: string, platform: string) {
  const deviceId = `${platform}-${Date.now()}`;
  await fetch('/api/proxy/devices/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pushToken, platform, deviceId }),
  }).catch(() => {});
}

/**
 * Invisible component that:
 * 1. Registers the service worker and requests permission for web push.
 * 2. Listens for the native Expo push token injected by React Native WebView
 *    (window.__AIVITA_PUSH_TOKEN__ / 'aivita-push-token-ready' event)
 *    and registers it via the Next.js proxy (which has proper cookie auth).
 */
export default function PushManager() {
  // ── Native push token from React Native WebView ──────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    type AivitaWin = Window & { __AIVITA_PUSH_TOKEN__?: string; __AIVITA_PLATFORM__?: string };

    function handleNativeToken(e: Event) {
      const token = (e as CustomEvent<{ pushToken: string }>).detail?.pushToken;
      const platform = (window as unknown as AivitaWin).__AIVITA_PLATFORM__ ?? 'unknown';
      if (token) void registerNativePushToken(token, platform);
    }

    window.addEventListener('aivita-push-token-ready', handleNativeToken);

    // Token may already be present if injected before this component mounted
    const win = window as unknown as AivitaWin;
    const existing = win.__AIVITA_PUSH_TOKEN__;
    if (existing) void registerNativePushToken(existing, win.__AIVITA_PLATFORM__ ?? 'unknown');

    return () => window.removeEventListener('aivita-push-token-ready', handleNativeToken);
  }, []);

  // ── Web push via Service Worker ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (!('Notification' in window)) return;

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        if (Notification.permission === 'default') {
          await new Promise<void>((resolve) => setTimeout(resolve, 3000));
          await Notification.requestPermission();
        }

        if (Notification.permission !== 'granted') return;

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
