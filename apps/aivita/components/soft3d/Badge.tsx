import * as React from 'react';

/**
 * Normal/deviation badge — DocView.dc.html's lab-value status pill. The two
 * states are deliberately different in both hue AND lightness (sky-blue vs
 * clay-rose backgrounds, not two shades of one color), per the mockup's own
 * design note: distinguishable by more than color alone.
 */
export function Badge({
  status,
  children,
}: {
  status: 'normal' | 'deviation';
  children: React.ReactNode;
}) {
  return (
    <span className={`s3-badge ${status === 'normal' ? 's3-badge-normal' : 's3-badge-deviation'}`}>
      {children}
    </span>
  );
}
