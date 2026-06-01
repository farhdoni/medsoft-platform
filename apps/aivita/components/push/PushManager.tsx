'use client';

import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

// VAPID public key (set in Coolify env: NEXT_PUBLIC_VAPID_PUBLIC_KEY)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a URL-safe base64 string to Uint8Array.
 * Required by pushManager.subscribe({ applicationServerKey }) in all browsers.
 * A plain string is accepted by Chrome but rejected by Firefox/Safari.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

/** Register a native Expo push token via the authenticated proxy (cookie auth). */
async function registerNativePushToken(pushToken: string, platform: string) {
  const deviceId = `${platform}-${Date.now()}`;
  await fetch('/api/proxy/devices/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pushToken, platform, deviceId }),
  }).catch(() => {});
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Invisible component that:
 * 1. Registers the native Expo push token injected by React Native WebView.
 * 2. Subscribes the browser to Web Push (VAPID) and stores the full
 *    PushSubscription object (not just endpoint) so the server can sign & send.
 */
export default function PushManager() {
  // ── Native push token from React Native WebView ────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    type AivitaWin = Window & { __AIVITA_PUSH_TOKEN__?: string; __AIVITA_PLATFORM__?: string };

    function handleNativeToken(e: Event) {
      const token = (e as CustomEvent<{ pushToken: string }>).detail?.pushToken;
      const platform = (window as unknown as AivitaWin).__AIVITA_PLATFORM__ ?? 'unknown';
      if (token) void registerNativePushToken(token, platform);
    }

    window.addEventListener('aivita-push-token-ready', handleNativeToken);

    // Token may already be present if injected before component mounted
    const win = window as unknown as AivitaWin;
    if (win.__AIVITA_PUSH_TOKEN__) {
      void registerNativePushToken(
        win.__AIVITA_PUSH_TOKEN__,
        win.__AIVITA_PLATFORM__ ?? 'unknown'
      );
    }

    return () => window.removeEventListener('aivita-push-token-ready', handleNativeToken);
  }, []);

  // ── Web push via Service Worker + VAPID ───────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (!('Notification' in window)) return;
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[PushManager] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — web push disabled');
      return;
    }

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        if (Notification.permission === 'default') {
          // Small delay so we don't ask immediately on page load
          await new Promise<void>((resolve) => setTimeout(resolve, 3000));
          await Notification.requestPermission();
        }

        if (Notification.permission !== 'granted') return;

        // Get existing subscription or create a new one with VAPID key
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            // Must be ArrayBuffer/Uint8Array for cross-browser compatibility.
            // Cast .buffer to ArrayBuffer to satisfy TS strict lib typing.
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
          });
        }

        // Store the full PushSubscription JSON (endpoint + p256dh + auth keys)
        // The server needs all three to sign and send web-push messages.
        await fetch(`${API}/v1/aivita/medications/push/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            token:    JSON.stringify(sub.toJSON()),
            platform: 'web',
          }),
        }).catch(() => {});
      } catch (err) {
        console.warn('[PushManager] Web push setup failed:', err);
      }
    }

    void setup();
  }, []);

  return null;
}
