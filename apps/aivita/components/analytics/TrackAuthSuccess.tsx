'use client';

import { useEffect } from 'react';
import { trackAuthSuccess } from '@/lib/analytics/metrika';

/**
 * Fires auth_success once on mount. Renders nothing — dropped into an
 * otherwise server-rendered "you're in" screen so that screen doesn't have
 * to become a client component just to report this one event.
 */
export function TrackAuthSuccess({ method }: { method: string }) {
  useEffect(() => {
    trackAuthSuccess(method);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
