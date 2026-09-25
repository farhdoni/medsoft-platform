import * as React from 'react';

type Variant = 'clay' | 'sky';
type Size = 'md' | 'sm';

const VARIANT_VARS: Record<Variant, React.CSSProperties> = {
  clay: {
    ['--s3-c1' as string]: 'var(--s3-clay-lt)',
    ['--s3-c2' as string]: 'var(--s3-clay)',
    ['--s3-c3' as string]: 'var(--s3-clay-dk)',
    ['--s3-cw' as string]: 'var(--s3-clay-wall)',
    ['--s3-sh' as string]: 'var(--s3-clay-sh)',
  },
  sky: {
    ['--s3-c1' as string]: 'var(--s3-sky-lt)',
    ['--s3-c2' as string]: 'var(--s3-sky)',
    ['--s3-c3' as string]: 'var(--s3-sky-dk)',
    ['--s3-cw' as string]: 'var(--s3-sky-wall)',
    ['--s3-sh' as string]: 'var(--s3-sky-sh)',
  },
};

const SIZE_STYLE: Record<Size, React.CSSProperties> = {
  md: { height: 46, fontSize: 14, fontWeight: 800, paddingLeft: 20, paddingRight: 20 },
  sm: { height: 40, fontSize: 13, fontWeight: 800, paddingLeft: 16, paddingRight: 16, minHeight: 0 },
};

/**
 * Convex 3D button — `.btn3d`. The primary call-to-action surface.
 * `variant` picks which accent (clay or sky) the gradient/edge use — see
 * Main.dc.html's "Ответить" button (clay) vs any doctor-facing accent (sky).
 */
export function Button3D({
  variant = 'clay',
  size = 'md',
  className = '',
  style,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      className={`btn3d ${className}`.trim()}
      style={{ ...VARIANT_VARS[variant], ...SIZE_STYLE[size], borderRadius: 999, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Flat plate-coloured button — `.btn-flat`. Secondary actions. */
export function FlatButton({
  className = '',
  style,
  size = 'md',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: Size }) {
  return (
    <button
      type="button"
      className={`btn-flat ${className}`.trim()}
      style={{ height: size === 'sm' ? 40 : 46, fontSize: size === 'sm' ? 13 : 14, fontWeight: 700, paddingLeft: 20, paddingRight: 20, borderRadius: 999, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Small navy pill — `.chip-dark`. */
export function ChipDark({
  className = '',
  style,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`chip-dark ${className}`.trim()}
      style={{ height: 36, fontSize: 12, fontWeight: 800, paddingLeft: 14, paddingRight: 14, borderRadius: 999, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
