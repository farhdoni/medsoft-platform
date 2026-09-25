'use client';

import * as React from 'react';
import { Plate } from '@/components/soft3d/Surfaces';
import { Button3D, FlatButton } from '@/components/soft3d/Button3D';

const CONSENT_TEXT_VERSION = 'consent-v1'; // see docs/legal/patient-consent-v1.md

interface Strings {
  title: string; subtitle: string; briefTitle: string;
  brief1: string; brief2: string; brief3: string; brief4: string;
  medicalLabel: string; medicalHelper: string;
  marketingLabel: string; marketingHelper: string;
  legalTextBefore: string; privacyLinkText: string; legalTextMiddle: string; termsLinkText: string;
  continueButton: string; laterButton: string;
  declinedTitle: string; declinedText: string; goToSettings: string; deleteAccount: string;
}

function CheckRow({
  checked, onChange, label, helper, required,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; helper: string; required?: boolean }) {
  const id = React.useId();
  return (
    <label
      htmlFor={id}
      className={checked ? 'tile grain' : 'well'}
      style={{ borderRadius: 22, padding: '16px 18px', display: 'flex', gap: 13, cursor: 'pointer' }}
    >
      <span
        style={{
          width: 26, height: 26, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid transparent',
          ...(checked
            ? {
                background:
                  'linear-gradient(176deg, var(--s3-clay-btn-lt), var(--s3-clay-btn-dk)) padding-box, ' +
                  'linear-gradient(180deg, rgba(255,255,255,.45), rgba(var(--s3-clay-sh),.38)) border-box',
                boxShadow: '0 3px 0 -1px var(--s3-clay-wall)',
              }
            : { background: '#E8E2D8', boxShadow: 'inset 0 3px 6px -2px rgba(150,134,116,.30)' }),
        }}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-required={required}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        />
        {checked && (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.8} aria-hidden="true"><path d="M5 13l4.5 4.5L19 7" /></svg>
        )}
      </span>
      <span style={{ flexGrow: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--s3-ink)' }}>{label}</span>
        <span style={{ display: 'block', marginTop: 4, fontSize: 12, lineHeight: 1.5, color: 'var(--s3-ink-soft)' }}>{helper}</span>
      </span>
    </label>
  );
}

export function ConsentClient({ locale, strings: s }: { locale: string; strings: Strings }) {
  const [medical, setMedical] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);
  const [declined, setDeclined] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);

  async function submit() {
    if (!medical) { setDeclined(true); return; }
    setSaving(true);
    setError(false);
    try {
      const res = await fetch('/api/proxy/onboarding-ladder/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalDataConsent: true, marketingConsent: marketing, textVersion: CONSENT_TEXT_VERSION }),
      });
      if (!res.ok) { setError(true); setSaving(false); return; }
      // Not a hardcoded /q1 — an already-completed account backfilling
      // consent retroactively needs to land on /home, not redo the ladder.
      // Plain /onboarding re-runs the same status check and routes correctly
      // either way (see page.tsx's ordering comment).
      window.location.href = `/${locale}/onboarding`;
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  if (declined) {
    return (
      <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)', display: 'flex', flexDirection: 'column', padding: '32px 22px' }}>
        <Plate style={{ borderRadius: 26, padding: 24, marginTop: 'auto' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--s3-ink)' }}>{s.declinedTitle}</h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{s.declinedText}</p>
        </Plate>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href={`/${locale}/settings`}>
            <FlatButton style={{ width: '100%' }}>{s.goToSettings}</FlatButton>
          </a>
          <a href={`/${locale}/settings/account`} style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--s3-ink-soft)', textDecoration: 'none', padding: '8px 0' }}>
            {s.deleteAccount}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 22px 0 22px' }}>
        <span className="well" style={{ width: 52, height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A86A72" strokeWidth={1.8} aria-hidden="true"><path d="M12 3l8 4v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V7z" /><path d="M9.5 12l2 2 3.5-4" /></svg>
        </span>
        <h1 style={{ margin: '20px 0 0 0', fontSize: 27, lineHeight: 1.18, fontWeight: 800, color: 'var(--s3-ink)', letterSpacing: '-0.02em' }}>{s.title}</h1>
        <p style={{ margin: '12px 0 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{s.subtitle}</p>
      </div>

      <Plate style={{ margin: '18px 18px 0 18px', borderRadius: 26, padding: 20 }}>
        <p className="eyebrow" style={{ margin: 0, color: 'var(--s3-ink-soft)' }}>{s.briefTitle}</p>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[s.brief1, s.brief2, s.brief3, s.brief4].map((text, i) => (
            <div key={i} style={{ display: 'flex', gap: 11 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A86A72" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true"><path d="M5 13l4.5 4.5L19 7" /></svg>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--s3-ink)' }}>{text}</p>
            </div>
          ))}
        </div>
      </Plate>

      <div style={{ margin: '14px 18px 0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <CheckRow checked={medical} onChange={setMedical} label={s.medicalLabel} helper={s.medicalHelper} required />
        <CheckRow checked={marketing} onChange={setMarketing} label={s.marketingLabel} helper={s.marketingHelper} />
      </div>

      <div style={{ marginTop: 'auto', padding: '18px 18px 24px 18px' }}>
        <p style={{ margin: '0 0 12px 0', fontSize: 12, lineHeight: 1.5, textAlign: 'center', color: 'var(--s3-ink-soft)' }}>
          {s.legalTextBefore}{' '}
          <a href={`/${locale}/privacy`} style={{ fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{s.privacyLinkText}</a>{' '}
          {s.legalTextMiddle}{' '}
          <a href={`/${locale}/terms`} style={{ fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{s.termsLinkText}</a>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button3D variant="clay" onClick={submit} disabled={saving} style={{ width: '100%', height: 56, fontSize: 16 }}>
            {s.continueButton}
          </Button3D>
          <FlatButton onClick={() => setDeclined(true)} style={{ width: '100%', height: 50, fontSize: 15 }}>
            {s.laterButton}
          </FlatButton>
        </div>
        {error && <p style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#c0304a' }}>⚠</p>}
      </div>
    </div>
  );
}
