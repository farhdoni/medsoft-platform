import * as React from 'react';

/** Convex light plate — `.tile` in the mockups. The base surface for cards. */
export function Plate({
  className = '',
  grain = true,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { grain?: boolean }) {
  return <div className={`tile ${grain ? 'grain' : ''} ${className}`.trim()} {...rest} />;
}

/** Dark navy plate — `.panel`. Used for the health-score hero, dark call-outs. */
export function DarkPlate({
  className = '',
  grain = true,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { grain?: boolean }) {
  return <div className={`panel ${grain ? 'grain' : ''} ${className}`.trim()} {...rest} />;
}

/** Recessed socket — `.well`. Inputs, icon sockets, segmented-control tracks. */
export function Well({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`well ${className}`.trim()} {...rest} />;
}

/** Recessed socket on a dark plate — `.well-dark`. The health-score number, avatars in chat. */
export function WellDark({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`well-dark ${className}`.trim()} {...rest} />;
}
