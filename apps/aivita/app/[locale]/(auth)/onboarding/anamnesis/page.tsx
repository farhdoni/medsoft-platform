'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const C = {
  bg: '#f4f3ef', card: '#ffffff', border: '#e8e4dc', accent: '#9c5e6c', soft: '#f3e7ea',
  text: '#2a2540', text2: '#6a6580', muted: '#9a96a8',
};

export default function OnboardingAnamnesisPage() {
  const t = useTranslations('app.onboarding');
  const chips = t.raw('ana.chips') as string[];
  const [selected, setSelected] = useState<number[]>([]);

  function toggle(i: number) {
    setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "var(--font-app), system-ui, sans-serif", color: C.text }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Link href="../onboarding/age" aria-label="Назад"
            style={{ width: 40, height: 40, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 18, display: 'grid', placeItems: 'center', textDecoration: 'none' }}>‹</Link>
          <div style={{ flex: 1, height: 6, background: '#eee9e2', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '67%', background: C.accent, borderRadius: 6 }} />
          </div>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>4 / 6</span>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: C.accent, margin: '16px 0 6px' }}>{t('ana.eyebrow')}</p>
        <h1 style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2, margin: '0 0 6px' }}>
          {t('ana.title')} <span style={{ fontStyle: 'italic', color: C.accent, fontWeight: 500 }}>{t('ana.titleEm')}</span>
        </h1>
        <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.5, margin: '0 0 18px' }}>{t('ana.sub')}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {chips.map((c, i) => {
            const on = selected.includes(i);
            return (
              <button key={i} onClick={() => toggle(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 14, fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .15s',
                  border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.soft : C.card, color: on ? C.accent : C.text,
                }}>
                {on && <span>✓</span>}{c}
              </button>
            );
          })}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, fontSize: 12, color: C.text2, lineHeight: 1.5, marginBottom: 14 }}>
          🔒 {t('ana.privacy')}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Link href="../onboarding/lifestyle"
            style={{ width: '100%', height: 54, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, textDecoration: 'none', color: '#fff', background: C.accent, boxShadow: '0 10px 24px rgba(156,94,108,.32)' }}>
            {t('ana.cont')}
          </Link>
          <Link href="../onboarding/lifestyle"
            style={{ width: '100%', height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: C.text2, textDecoration: 'none' }}>
            {t('ana.skip')}
          </Link>
        </div>
      </div>
    </div>
  );
}
