import { describe, expect, it } from 'vitest';
import { createStreamWatchdog } from '../stream-watchdog';

// Real (short) timers rather than vi.useFakeTimers() — this logic composes
// setTimeout with an AbortController and async chunk arrival, which is
// fiddly to fake reliably; a few tens of milliseconds keeps this fast
// while still exercising the real timer/abort interaction end to end.
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('createStreamWatchdog', () => {
  it('does not abort before either limit elapses', async () => {
    const wd = createStreamWatchdog({ overallTimeoutMs: 200, stallTimeoutMs: 200 });
    await wait(30);
    expect(wd.signal.aborted).toBe(false);
    wd.clear();
  });

  it('stall timeout aborts the signal when no chunk arrives in time', async () => {
    const wd = createStreamWatchdog({ overallTimeoutMs: 1000, stallTimeoutMs: 40 });
    // Matches real usage: the stall timer is armed once right after the
    // stream is created (before any chunk has arrived), not automatically
    // started by the constructor — see route.ts's watchdog.armStallTimer()
    // call right after client.messages.stream() resolves.
    wd.armStallTimer();
    await wait(80);
    expect(wd.signal.aborted).toBe(true);
    expect(wd.outcome()).toBe('timeout');
    wd.clear();
  });

  it('armStallTimer() (simulating a received chunk) postpones the stall abort', async () => {
    const wd = createStreamWatchdog({ overallTimeoutMs: 1000, stallTimeoutMs: 50 });
    // "Chunks" arrive every 20ms, well under the 50ms stall limit — the
    // stream should still be alive after 120ms of continuous activity.
    for (let i = 0; i < 6; i++) {
      await wait(20);
      wd.armStallTimer();
    }
    expect(wd.signal.aborted).toBe(false);
    wd.clear();
  });

  it('overall timeout still fires even while chunks keep the stall timer happy', async () => {
    const wd = createStreamWatchdog({ overallTimeoutMs: 60, stallTimeoutMs: 200 });
    // Re-arm the (long) stall timer a couple of times — the short overall
    // cap should still cut the request off regardless.
    wd.armStallTimer();
    await wait(30);
    wd.armStallTimer();
    await wait(50); // total elapsed ~80ms > overallTimeoutMs (60ms)
    expect(wd.signal.aborted).toBe(true);
    expect(wd.outcome()).toBe('timeout');
    wd.clear();
  });

  it('clear() prevents a pending timer from aborting afterwards', async () => {
    const wd = createStreamWatchdog({ overallTimeoutMs: 30, stallTimeoutMs: 1000 });
    wd.clear();
    await wait(60); // past what would have been the overall timeout
    expect(wd.signal.aborted).toBe(false);
  });

  it('a linked signal aborting (client disconnect) aborts the watchdog too, reported as "abort" not "timeout"', async () => {
    const client = new AbortController();
    const wd = createStreamWatchdog({ overallTimeoutMs: 1000, stallTimeoutMs: 1000, linkedSignal: client.signal });
    expect(wd.signal.aborted).toBe(false);
    client.abort();
    expect(wd.signal.aborted).toBe(true);
    expect(wd.outcome()).toBe('abort');
    wd.clear();
  });

  it('an already-aborted linked signal aborts the watchdog immediately on creation', () => {
    const client = new AbortController();
    client.abort();
    const wd = createStreamWatchdog({ overallTimeoutMs: 1000, stallTimeoutMs: 1000, linkedSignal: client.signal });
    expect(wd.signal.aborted).toBe(true);
    expect(wd.outcome()).toBe('abort');
    wd.clear();
  });

  it('outcome() is "error" when the signal was never aborted at all (a non-timeout, non-abort failure)', () => {
    const wd = createStreamWatchdog({ overallTimeoutMs: 1000, stallTimeoutMs: 1000 });
    expect(wd.outcome()).toBe('error');
    wd.clear();
  });
});
