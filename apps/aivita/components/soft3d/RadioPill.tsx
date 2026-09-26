import * as React from 'react';

/**
 * A radio option styled as a filled pill when selected (Q1.dc.html's sex
 * selector) — visually a `.btn3d`, but built from a real `<input
 * type="radio">` + `<label>` pair so it's keyboard/screen-reader operable
 * (the mockup's version is a bare unlabelled radio with no visible focus
 * treatment of its own beyond the label). Selected state uses the same
 * WCAG-AA-safe `--s3-clay-btn-*` fill Button3D uses — the mockup's raw
 * `--clay-lt`/`--clay-dk` white-text gradient is the same contrast failure
 * fixed there (see soft3d.css's `--s3-clay-btn-*` comment).
 */
export function RadioPill({
  name,
  value,
  label,
  checked,
  onChange,
  icon,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <label
      htmlFor={id}
      className={checked ? undefined : 'well'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        height: 58, borderRadius: 18, cursor: 'pointer', fontSize: 15, fontWeight: checked ? 800 : 700,
        color: checked ? '#fff' : 'var(--s3-ink)',
        border: '1px solid transparent',
        ...(checked
          ? {
              background:
                'linear-gradient(176deg, var(--s3-clay-btn-lt), var(--s3-clay-btn-dk)) padding-box, ' +
                'linear-gradient(180deg, rgba(255,255,255,.45), rgba(var(--s3-clay-sh),.38)) border-box',
            }
          : {}),
      }}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
      {icon}
      {label}
    </label>
  );
}
