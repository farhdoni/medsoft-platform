import * as React from 'react';

/**
 * The onboarding ladder's progress bar (4 segments, matching the mockups'
 * own Start.dc.html roadmap: Анкета/Чекап/Гаджеты/Обследования) — with an
 * optional header row (back arrow + "Шаг X из 4 [· Анкета]"). Some screens
 * show the bar alone with no header row (R1, Done1 in the mockups) — pass
 * `stepLabel` only when the header row should render.
 */
export function LadderProgress({
  filledCount,
  stepLabel,
  backHref,
  backAriaLabel,
}: {
  filledCount: 1 | 2 | 3 | 4;
  stepLabel?: string;
  backHref?: string;
  backAriaLabel?: string;
}) {
  return (
    <div style={{ padding: '22px 22px 0 22px' }}>
      {stepLabel && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          {backHref ? (
            <a
              href={backHref}
              aria-label={backAriaLabel}
              className="btn-flat"
              style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3A3646" strokeWidth={2.2} aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </a>
          ) : <span />}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{stepLabel}</span>
        </div>
      )}
      <div style={{ marginTop: stepLabel ? 16 : 0, display: 'flex', alignItems: 'center', gap: 7 }}>
        {([1, 2, 3, 4] as const).map((i) =>
          i <= filledCount ? (
            <span
              key={i}
              style={{
                flexGrow: 1, height: 7, borderRadius: 4,
                background: 'linear-gradient(176deg, var(--s3-clay-lt), var(--s3-clay-dk))',
              }}
            />
          ) : (
            <span key={i} className="well" style={{ flexGrow: 1, height: 7, borderRadius: 4 }} />
          )
        )}
      </div>
    </div>
  );
}
