import * as React from 'react';

/** Small stat card — `.stat`. Used for the pulse/sleep/steps row on Main.dc.html. */
export function StatTile({
  className = '',
  grain = true,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { grain?: boolean }) {
  return <div className={`stat ${grain ? 'grain' : ''} ${className}`.trim()} {...rest} />;
}
