'use client';

import * as React from 'react';
import { Plate, Well } from '@/components/soft3d/Surfaces';
import { Button3D } from '@/components/soft3d/Button3D';
import { LadderProgress } from '@/components/soft3d/LadderProgress';

interface Strings {
  backAriaLabel: string; stepLabel: string; title: string; subtitle: string;
  heightLabel: string; weightLabel: string;
  bmiCalculating: string; bmiLabel: string; bmiBelow: string; bmiNormal: string; bmiAbove: string;
  noteText: string; continueButton: string;
}

export function Q2Client({ locale, strings: s }: { locale: string; strings: Strings }) {
  const [height, setHeight] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);

  const h = Number(height);
  const w = Number(weight);
  const heightValid = height.trim() !== '' && h >= 50 && h <= 250;
  const weightValid = weight.trim() !== '' && w >= 20 && w <= 300;
  const bmi = heightValid && weightValid ? w / ((h / 100) * (h / 100)) : null;
  const bmiCategory = bmi === null ? null : bmi < 18.5 ? s.bmiBelow : bmi < 25 ? s.bmiNormal : s.bmiAbove;

  async function submit() {
    if (!heightValid || !weightValid) return;
    setSaving(true);
    setError(false);
    try {
      const res = await fetch('/api/proxy/onboarding-ladder/q2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ height: h, weight: w }),
      });
      if (!res.ok) { setError(true); setSaving(false); return; }
      window.location.href = `/${locale}/onboarding/done1`;
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)', display: 'flex', flexDirection: 'column' }}>
      <LadderProgress filledCount={1} stepLabel={s.stepLabel} backHref={`/${locale}/onboarding/r1`} backAriaLabel={s.backAriaLabel} />

      <div style={{ padding: '32px 22px 0 22px' }}>
        <h1 style={{ margin: 0, fontSize: 27, lineHeight: 1.2, fontWeight: 800, color: 'var(--s3-ink)', letterSpacing: '-0.02em' }}>{s.title}</h1>
        <p style={{ margin: '10px 0 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{s.subtitle}</p>
      </div>

      <Plate grain style={{ margin: '22px 18px 0 18px', borderRadius: 28, padding: '24px 22px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <label htmlFor="height" style={{ fontSize: 13, fontWeight: 700, color: 'var(--s3-ink)' }}>{s.heightLabel}</label>
          <input
            id="height" className="well" type="number" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)}
            style={{ height: 58, padding: '0 18px', borderRadius: 18, fontFamily: 'var(--font-app), Nunito, sans-serif', fontSize: 20, fontWeight: 800, border: 'none' }}
          />
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <label htmlFor="weight" style={{ fontSize: 13, fontWeight: 700, color: 'var(--s3-ink)' }}>{s.weightLabel}</label>
          <input
            id="weight" className="well" type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)}
            style={{ height: 58, padding: '0 18px', borderRadius: 18, fontFamily: 'var(--font-app), Nunito, sans-serif', fontSize: 20, fontWeight: 800, border: 'none' }}
          />
        </div>

        {bmi !== null && (
          <Well style={{ marginTop: 18, borderRadius: 18, padding: '14px 16px' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{s.bmiCalculating}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: 15, fontWeight: 800, color: 'var(--s3-ink)' }}>
              {s.bmiLabel} <strong>{bmi.toFixed(1)}</strong> — {bmiCategory}
            </p>
          </Well>
        )}

        <p style={{ marginTop: 14, fontSize: 12, lineHeight: 1.5, color: 'var(--s3-ink-soft)' }}>{s.noteText}</p>
      </Plate>

      <div style={{ marginTop: 'auto', padding: '0 18px 26px 18px' }}>
        <Button3D variant="clay" onClick={submit} disabled={!heightValid || !weightValid || saving} style={{ width: '100%', height: 56, fontSize: 16 }}>
          {s.continueButton}
        </Button3D>
        {error && <p style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#c0304a' }}>⚠</p>}
      </div>
    </div>
  );
}
