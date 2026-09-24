'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { resolveScreenName, setActiveCounter, trackHit, trackScreenView } from '@/lib/analytics/metrika';
import { CONSENT_EVENT, readConsent } from '@/lib/analytics/consent';

/**
 * Loads the Yandex Metrika tag and auto-tracks screen views by route.
 *
 * Mounted once in app/[locale]/layout.tsx, so it covers every page —
 * authenticated app screens and the public sign-in/sign-up/pricing funnel
 * alike — the same way InstallPrompt is mounted there.
 *
 * webvisor / clickmap / trackLinks are OFF, matching the CRM's posture
 * (D3 in this same round of work): Webvisor records DOM interactions
 * verbatim, including form-field content, and this app's screens routinely
 * show medical-card values, symptom descriptions and chat text. The "never
 * content, only structure" rule extends to Metrika's own init options here,
 * not just to the params this file passes to reachGoal.
 *
 * Loads ONLY after the visitor accepted analytics cookies (ConsentBanner /
 * the landing's banner — one shared `aivita_consent` cookie on .aivita.uz).
 *
 * counterId comes from landing_config.yandex_metrika_id (fetched server-side
 * in the layout) — no separate config for this app, reusing the same value
 * aivita.uz's landing already reads from.
 */
export function AivitaMetrika({ counterId }: { counterId: number | null }) {
  const pathname = usePathname();
  const [granted, setGranted] = useState(false);
  const active = granted ? counterId : null;

  useEffect(() => {
    setGranted(readConsent() === 'granted');
    const onChange = (e: Event) => setGranted((e as CustomEvent).detail === 'granted');
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  useEffect(() => {
    setActiveCounter(active);
  }, [active]);

  useEffect(() => {
    if (active === null || !pathname) return;
    trackHit(pathname);
    trackScreenView(resolveScreenName(pathname));
  }, [active, pathname]);

  if (active === null) return null;

  return (
    <Script
      id="yandex-metrika"
      src="https://mc.yandex.ru/metrika/tag.js"
      strategy="afterInteractive"
      onLoad={() => {
        window.ym?.(active, 'init', {
          clickmap: false,
          trackLinks: false,
          accurateTrackBounce: true,
          webvisor: false,
        });
        if (pathname) {
          trackHit(pathname);
          trackScreenView(resolveScreenName(pathname));
        }
      }}
    />
  );
}

export default AivitaMetrika;
