'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { saveAge } from './actions';

const C = {
  bg: '#f4f3ef', card: '#ffffff', border: '#e8e4dc', accent: '#9c5e6c', soft: '#f3e7ea',
  text: '#2a2540', text2: '#6a6580', muted: '#9a96a8',
};
const MIN_AGE = 12;
const MAX_AGE = 90;
const clamp = (n: number) => Math.max(MIN_AGE, Math.min(MAX_AGE, n));

export default function OnboardingAgePage() {
  const t = useTranslations('app.onboarding');
  const locale = useLocale();
  const [age, setAge] = useState(30);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(() => { void saveAge(locale, age); });
  }

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
        <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.5, margin: '0 0 24px' }}>{t('age.sub')}</p>

        {/* Stepper */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <div style={{ fontSize: 40 }}>🎂</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <button onClick={() => setAge((a) => clamp(a - 1))} aria-label="−"
              style={{ width: 52, height: 52, borderRadius: 16, border: `1px solid ${C.border}`, background: C.card, fontSize: 26, color: C.text, cursor: 'pointer' }}>−</button>
            <div style={{ minWidth: 96, textAlign: 'center' }}>
              <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1 }}>{age}</div>
              <div style={{ fontSize: 13, color: C.muted, fontWeight: 600, marginTop: 4 }}>{t('age.unit')}</div>
            </div>
            <button onClick={() => setAge((a) => clamp(a + 1))} aria-label="+"
              style={{ width: 52, height: 52, borderRadius: 16, border: `1px solid ${C.border}`, background: C.card, fontSize: 26, color: C.text, cursor: 'pointer' }}>+</button>
          </div>
          <input type="range" min={MIN_AGE} max={MAX_AGE} value={age} onChange={(e) => setAge(clamp(Number(e.target.value)))}
            style={{ width: '100%', maxWidth: 300, accentColor: C.accent }} aria-label={t('age.title')} />
        </div>

        <div style={{ marginTop: 24 }}>
          <button onClick={submit} disabled={pending}
            style={{ width: '100%', height: 54, border: 'none', borderRadius: 16, background: C.accent, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: pending ? 'default' : 'pointer', boxShadow: '0 10px 24px rgba(156,94,108,.32)', opacity: pending ? 0.7 : 1 }}>
            {t('age.cont')}
          </button>
        </div>
      </div>
    </div>
  );
}
