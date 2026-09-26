import * as React from 'react';
import { Button3D } from './Button3D';

/**
 * The ladder's recurring footer: "Продолжим или на сегодня достаточно?" +
 * primary CTA + "Достаточно на сегодня". The mockups send the skip action to
 * a bespoke HomePaused screen; this PR doesn't build that (a Home-page
 * redesign question outside this PR's scope) — skip goes to the existing
 * /home instead, which already renders correctly for an incomplete-
 * onboarding account. onboarding_step isn't written by this ladder at all
 * (see onboarding-ladder.ts), so nothing is lost by leaving from any point —
 * the next /onboarding visit resumes at the right step regardless.
 */
export function LadderFooter({
  prompt,
  ctaLabel,
  onContinue,
  continueHref,
  skipLabel,
  skipHref,
  disabled,
}: {
  prompt?: string;
  ctaLabel: string;
  onContinue?: () => void;
  continueHref?: string;
  skipLabel: string;
  skipHref: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginTop: 'auto', padding: '0 18px 26px 18px' }}>
      {prompt && (
        <p style={{ margin: '0 0 12px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>
          {prompt}
        </p>
      )}
      {onContinue ? (
        <Button3D variant="clay" onClick={onContinue} disabled={disabled} style={{ width: '100%', height: 56, fontSize: 16 }}>
          {ctaLabel}
        </Button3D>
      ) : (
        <a
          href={continueHref}
          className="btn3d"
          style={{
            ['--s3-c1' as string]: 'var(--s3-clay-btn-lt)',
            ['--s3-c2' as string]: 'var(--s3-clay-btn)',
            ['--s3-c3' as string]: 'var(--s3-clay-btn-dk)',
            ['--s3-sh' as string]: 'var(--s3-clay-sh)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 56, borderRadius: 999, fontSize: 16, fontWeight: 800, color: '#fff', textDecoration: 'none',
          }}
        >
          {ctaLabel}
        </a>
      )}
      <a
        href={skipHref}
        style={{ display: 'block', marginTop: 12, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--s3-ink-soft)', textDecoration: 'none' }}
      >
        {skipLabel}
      </a>
    </div>
  );
}
