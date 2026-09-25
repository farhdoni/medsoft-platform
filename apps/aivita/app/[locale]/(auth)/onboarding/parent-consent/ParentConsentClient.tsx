'use client';

import * as React from 'react';
import { Plate } from '@/components/soft3d/Surfaces';
import { Button3D } from '@/components/soft3d/Button3D';
import { LadderProgress } from '@/components/soft3d/LadderProgress';

interface Strings {
  backAriaLabel: string; stepLabel: string; title: string; subtitle: string;
  phoneLabel: string; phonePlaceholder: string;
  relationLabel: string; relationPlaceholder: string;
  consentLabel: string; continueButton: string; errorRequired: string;
}

/**
 * No mockup exists for this screen (the reference mockups don't branch for
 * minors at all — flagged as an open question back to the user during
 * planning). Built to match the ladder's own visual language, reusing the
 * same parentPhone/parentRelation/consent fields and wording Flow A's
 * existing minor branch already uses, so the ask is at least familiar
 * rather than novel copy.
 */
export function ParentConsentClient({ locale, strings: s }: { locale: string; strings: Strings }) {
  const [phone, setPhone] = React.useState('');
  const [relation, setRelation] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const valid = phone.trim().length >= 5 && relation.trim().length > 0 && consent;

  async function submit() {
    if (!valid) { setError(s.errorRequired); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/onboarding-ladder/parent-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPhone: phone.trim(), parentRelation: relation.trim(), consent: true }),
      });
      if (!res.ok) { setError(s.errorRequired); setSaving(false); return; }
      window.location.href = `/${locale}/onboarding/q2`;
    } catch {
      setError(s.errorRequired);
      setSaving(false);
    }
  }

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)', display: 'flex', flexDirection: 'column' }}>
      <LadderProgress filledCount={1} stepLabel={s.stepLabel} backHref={`/${locale}/onboarding/q1`} backAriaLabel={s.backAriaLabel} />

      <div style={{ padding: '32px 22px 0 22px' }}>
        <h1 style={{ margin: 0, fontSize: 27, lineHeight: 1.2, fontWeight: 800, color: 'var(--s3-ink)', letterSpacing: '-0.02em' }}>{s.title}</h1>
        <p style={{ margin: '10px 0 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{s.subtitle}</p>
      </div>

      <Plate style={{ margin: '22px 18px 0 18px', borderRadius: 28, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <label htmlFor="parentPhone" style={{ fontSize: 13, fontWeight: 700, color: 'var(--s3-ink)' }}>{s.phoneLabel}</label>
          <input
            id="parentPhone" className="well" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder={s.phonePlaceholder}
            style={{ height: 52, padding: '0 16px', borderRadius: 16, fontSize: 15, fontWeight: 700, border: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <label htmlFor="parentRelation" style={{ fontSize: 13, fontWeight: 700, color: 'var(--s3-ink)' }}>{s.relationLabel}</label>
          <input
            id="parentRelation" className="well" type="text" value={relation} onChange={(e) => setRelation(e.target.value)}
            placeholder={s.relationPlaceholder}
            style={{ height: 52, padding: '0 16px', borderRadius: 16, fontSize: 15, fontWeight: 700, border: 'none' }}
          />
        </div>
        <label style={{ display: 'flex', gap: 11, cursor: 'pointer', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
          <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--s3-ink)' }}>{s.consentLabel}</span>
        </label>
      </Plate>

      <div style={{ marginTop: 'auto', padding: '18px 18px 26px 18px' }}>
        <Button3D variant="clay" onClick={submit} disabled={!valid || saving} style={{ width: '100%', height: 56, fontSize: 16 }}>
          {s.continueButton}
        </Button3D>
        {error && <p style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#c0304a' }}>{error}</p>}
      </div>
    </div>
  );
}
