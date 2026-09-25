import * as React from 'react';
import { WellDark } from './Surfaces';

/**
 * Recessed progress bar on a dark plate — Vaccines.dc.html's "9 из 10"
 * calendar-completion bar. `value`/`max` drive a real width percentage;
 * `label` is the accessible name (the mockup shows the fraction as plain
 * adjacent text, which a progressbar role should still restate for AT that
 * jumps straight to the control).
 */
export function ProgressTrough({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <WellDark
      className="s3-progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="s3-progress-fill" style={{ width: `${pct}%` }} />
    </WellDark>
  );
}
