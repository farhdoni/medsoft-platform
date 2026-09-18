// Extracted from app/api/ai/chat/route.ts so the timeout-arming/outcome
// logic is directly unit-testable (real short timers, not the DOM/stream
// machinery around it) — see the 2026-09-18 incident this exists to guard
// against: aivita hung 72 minutes on a single chat request, 94% CPU, no
// error ever logged, before the watchdog below existed.
//
// Two independent limits share one AbortController:
//  - overall: hard cap on the whole request, start to finish.
//  - stall: re-armed on every received chunk via armStallTimer() — catches
//    a stream that starts fine and then goes silent mid-response, which a
//    pure overall cap alone wouldn't catch any faster than its own limit.

export type StreamOutcome = 'ok' | 'timeout' | 'abort' | 'error';

export interface StreamWatchdog {
  signal: AbortSignal;
  /** Call once per received chunk — resets the stall clock. */
  armStallTimer(): void;
  /** Stops both timers — call once the stream has actually finished (success or failure). */
  clear(): void;
  /**
   * Classifies why the stream ended, for logging. `true` only for an abort
   * this watchdog itself triggered (overall or stall) — an externally
   * triggered abort (e.g. a client disconnect aborting the same signal)
   * reports as 'abort', not 'timeout', since it wasn't this watchdog's cap
   * that fired.
   */
  outcome(): StreamOutcome;
}

export function createStreamWatchdog(opts: {
  overallTimeoutMs: number;
  stallTimeoutMs: number;
  /**
   * The route's own incoming Request.signal, when available — links a
   * client disconnect (tab closed, navigated away) into the same abort,
   * so an abandoned request stops consuming the upstream stream instead
   * of running to completion for nobody. Without this, `outcome()`'s
   * 'abort' branch could never actually be reached: nothing besides this
   * function's own two timers could abort a controller it created itself.
   */
  linkedSignal?: AbortSignal;
}): StreamWatchdog {
  const controller = new AbortController();
  let timedOut = false;

  if (opts.linkedSignal) {
    if (opts.linkedSignal.aborted) {
      controller.abort();
    } else {
      opts.linkedSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  const overallTimer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.overallTimeoutMs);

  let stallTimer: ReturnType<typeof setTimeout> | undefined;

  function armStallTimer(): void {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, opts.stallTimeoutMs);
  }

  function clear(): void {
    clearTimeout(overallTimer);
    clearTimeout(stallTimer);
  }

  function outcome(): StreamOutcome {
    if (timedOut) return 'timeout';
    if (controller.signal.aborted) return 'abort';
    return 'error';
  }

  return { signal: controller.signal, armStallTimer, clear, outcome };
}
