'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// 14 min of idle → show warning modal
const IDLE_MS = 14 * 60 * 1000;
// 1 min warning window before actual logout
const WARN_MS = 60 * 1000;

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'visibilitychange',
] as const;

/**
 * Detects user inactivity and returns whether the warning modal should be shown.
 *
 * Timeline:
 *   t+0      user goes idle (no activity events)
 *   t+14min  isWarning = true  → caller renders countdown modal
 *   t+15min  onIdle() fires    → caller logs out
 *   any time user moves/types  → timers reset, isWarning = false
 */
export function useIdleTimer(onIdle: () => void): {
  isWarning: boolean;
  keepAlive: () => void;
} {
  const [isWarning, setIsWarning] = useState(false);

  // Keep latest onIdle in a ref so reset() closure never goes stale
  const onIdleRef = useRef(onIdle);
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current !== null) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  /**
   * Reset both timers and dismiss the warning.
   * Called on any activity event AND when the user clicks "Stay logged in".
   */
  const reset = useCallback(() => {
    clearTimers();
    setIsWarning(false);

    warnTimerRef.current = setTimeout(() => {
      setIsWarning(true);
      idleTimerRef.current = setTimeout(() => {
        onIdleRef.current();
      }, WARN_MS);
    }, IDLE_MS);
  }, [clearTimers]);

  useEffect(() => {
    // Attach all activity listeners (passive — no scroll jank)
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, reset, { passive: true }),
    );

    // Kick off the first idle cycle
    reset();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, reset),
      );
      clearTimers();
    };
  }, [reset, clearTimers]);

  return { isWarning, keepAlive: reset };
}
