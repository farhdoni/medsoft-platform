'use client';

import * as React from 'react';
import { Plate } from '@/components/soft3d/Surfaces';
import { Well } from '@/components/soft3d/Surfaces';
import { Button3D } from '@/components/soft3d/Button3D';
import { LadderProgress } from '@/components/soft3d/LadderProgress';
import { RadioPill } from '@/components/soft3d/RadioPill';

interface Strings {
  backAriaLabel: string; stepLabel: string; title: string; subtitle: string;
  sexLabel: string; male: string; female: string;
  ageLabel: string; agePlaceholder: string; noteText: string; continueButton: string;
}

export function Q1Client({ locale, strings: s }: { locale: string; strings: Strings }) {
  const [gender, setGender] = React.useState<'male' | 'female'>('male');
  const [age, setAge] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);

  const ageNum = Number(age);
  const ageValid = age.trim() !== '' && Number.isInteger(ageNum) && ageNum >= 1 && ageNum <= 120;

  async function submit() {
    if (!ageValid) return;
    setSaving(true);
    setError(false);
    try {
      const res = await fetch('/api/proxy/onboarding-ladder/q1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, age: ageNum }),
      });
      if (!res.ok) { setError(true); setSaving(false); return; }
      window.location.href = `/${locale}/onboarding/r1`;
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)', display: 'flex', flexDirection: 'column' }}>
      <LadderProgress filledCount={1} stepLabel={s.stepLabel} backHref={`/${locale}/onboarding/consent`} backAriaLabel={s.backAriaLabel} />

      <div style={{ padding: '32px 22px 0 22px' }}>
        <h1 style={{ margin: 0, fontSize: 27, lineHeight: 1.2, fontWeight: 800, color: 'var(--s3-ink)', letterSpacing: '-0.02em' }}>{s.title}</h1>
        <p style={{ margin: '10px 0 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{s.subtitle}</p>
      </div>

      <Plate grain style={{ margin: '22px 18px 0 18px', borderRadius: 28, padding: '24px 22px' }}>
        <fieldset style={{ margin: 0, padding: 0, border: 'none' }}>
          <legend style={{ padding: 0, fontSize: 13, fontWeight: 700, color: 'var(--s3-ink)' }}>{s.sexLabel}</legend>
          <div style={{ marginTop: 11, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <RadioPill
              name="sex" value="male" label={s.male} checked={gender === 'male'} onChange={() => setGender('male')}
              icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={gender === 'male' ? '#fff' : '#8A8494'} strokeWidth={2} aria-hidden="true"><circle cx="10" cy="14" r="6" /><path d="M14.5 9.5L20 4M15 4h5v5" /></svg>}
            />
            <RadioPill
              name="sex" value="female" label={s.female} checked={gender === 'female'} onChange={() => setGender('female')}
              icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={gender === 'female' ? '#fff' : '#8A8494'} strokeWidth={2} aria-hidden="true"><circle cx="12" cy="9" r="6" /><path d="M12 15v6M9 18h6" /></svg>}
            />
          </div>
        </fieldset>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <label htmlFor="age" style={{ fontSize: 13, fontWeight: 700, color: 'var(--s3-ink)' }}>{s.ageLabel}</label>
          <input
            id="age"
            className="well"
            type="number"
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder={s.agePlaceholder}
            style={{ height: 58, padding: '0 18px', borderRadius: 18, fontFamily: 'var(--font-app), Nunito, sans-serif', fontSize: 20, fontWeight: 800, border: 'none' }}
          />
        </div>

        <Well style={{ marginTop: 18, borderRadius: 18, padding: '14px 16px', display: 'flex', gap: 11 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8494" strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--s3-ink-soft)' }}>{s.noteText}</p>
        </Well>
      </Plate>

      <div style={{ marginTop: 'auto', padding: '0 18px 26px 18px' }}>
        <Button3D variant="clay" onClick={submit} disabled={!ageValid || saving} style={{ width: '100%', height: 56, fontSize: 16 }}>
          {s.continueButton}
        </Button3D>
        {error && <p style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#c0304a' }}>⚠</p>}
      </div>
    </div>
  );
}
