import * as React from 'react';
import { Well } from './Surfaces';

export interface SegmentedOption {
  value: string;
  label: string;
}

/**
 * Segmented control — Docs.dc.html's "Всё / Анализы / Заключения / Снимки"
 * filter row. The mockup itself uses plain unstyled buttons for the
 * inactive segments with no ARIA role, which would read as an unlabelled
 * group of buttons to a screen reader — added proper tab semantics here
 * (role="tablist"/"tab"/aria-selected) since that's a real a11y gap the
 * mockup doesn't address, not a visual decision.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (next: string) => void;
  /** Accessible name for the whole group. */
  label: string;
}) {
  return (
    <Well
      role="tablist"
      aria-label={label}
      style={{ borderRadius: 999, padding: 5, display: 'flex', gap: 4 }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return active ? (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected="true"
            className="btn3d"
            style={{
              ['--s3-c1' as string]: 'var(--s3-clay-btn-lt)',
              ['--s3-c2' as string]: 'var(--s3-clay-btn)',
              ['--s3-c3' as string]: 'var(--s3-clay-btn-dk)',
              ['--s3-sh' as string]: 'var(--s3-clay-sh)',
              flexGrow: 1,
              height: 40,
              minHeight: 0,
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
            }}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ) : (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected="false"
            style={{
              flexGrow: 1,
              height: 40,
              minHeight: 0,
              border: 'none',
              background: 'none',
              borderRadius: 999,
              font: '700 13px/1 var(--font-app), Nunito, sans-serif',
              color: 'var(--s3-ink-soft)',
              cursor: 'pointer',
            }}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </Well>
  );
}
