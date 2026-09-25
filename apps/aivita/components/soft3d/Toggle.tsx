import * as React from 'react';

/**
 * Toggle switch — Gadgets.dc.html's per-metric on/off row.
 * A real, keyboard-operable checkbox under the hood (visually hidden via
 * the `.s3-toggle-input` class in soft3d.css, not display:none — so it
 * stays in the tab order and announces correctly), styled via its sibling.
 */
export function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name — the mockup relies on adjacent visible text, but the
   *  control itself still needs its own label for screen readers. */
  label: string;
  id?: string;
}) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} style={{ display: 'inline-flex', cursor: 'pointer' }}>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className="s3-toggle-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
      />
      <span className="s3-toggle-track" aria-hidden="true">
        <span className="s3-toggle-knob" />
      </span>
    </label>
  );
}
