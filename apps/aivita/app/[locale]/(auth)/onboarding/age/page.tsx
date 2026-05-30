'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const C = {
  bg: '#f4f3ef', card: '#ffffff', border: '#e8e4dc', accent: '#9c5e6c', soft: '#f3e7ea',
  text: '#2a2540', text2: '#6a6580', muted: '#9a96a8',
};
const OPTIONS = [
  { value: '18-29', emoji: '🌱' },
  { value: '30-44', emoji: '⚡' },
  { value: '45-59', emoji: '🌿' },
  { value: '60+', emoji: '🌳' },
];

export default function OnboardingAgePage() {
  const t = useTranslations('app.onboarding');
  const labels = t.raw('age.opts') as Array<{ label: string; sub: string }>;
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Outfit', system-ui, sans-serif", color: C.text }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Link href="../onboarding/welcome" aria-label="Назад"
            style={{ width: 40, height: 40, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 18, display: 'grid', placeItems: 'center', textDecoration: 'none' }}>‹</Link>
          <div style={{ flex: 1, height: 6, background: '#eee9e2', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '33%', background: C.accent, borderRadius: 6 }} />
          </div>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>2 / 6</span>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: C.accent, margin: '16px 0 6px' }}>{t('age.eyebrow')}</p>
        <h1 style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2, margin: '0 0 6px' }}>
          {t('age.title')} <span style={{ fontStyle: 'italic', color: C.accent, fontWeight: 500 }}>{t('age.titleEm')}</span>
        </h1>
        <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.5, margin: '0 0 20px' }}>{t('age.sub')}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {OPTIONS.map((o, i) => {
            const on = selected === o.value;
            return (
              <button key={o.value} onClick={() => setSelected(o.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, height: 64, padding: '0 16px', borderRadius: 18, cursor: 'pointer',
                  fontFamily: 'inherit', border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.soft : C.card, transition: 'all .15s',
                }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 20, background: on ? '#fff' : '#f0ece5' }}>{o.emoji}</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{labels[i]?.label}</div>
                  <div style={{ fontSize: 12, color: C.text2 }}>{labels[i]?.sub}</div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${on ? C.accent : '#d8d2c8'}`, display: 'grid', placeItems: 'center' }}>
                  {on && <div style={{ width: 9, height: 9, borderRadius: '50%', background: C.accent }} />}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 24 }}>
          <Link href={selected ? '../onboarding/anamnesis' : '#'}
            onClick={(e) => { if (!selected) e.preventDefault(); }}
            style={{
              width: '100%', height: 54, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 600, textDecoration: 'none', color: '#fff',
              background: selected ? C.accent : '#cdbcc2',
              boxShadow: selected ? '0 10px 24px rgba(156,94,108,.32)' : 'none',
              pointerEvents: selected ? 'auto' : 'none',
            }}>
            {t('age.cont')}
          </Link>
        </div>
      </div>
    </div>
  );
}
