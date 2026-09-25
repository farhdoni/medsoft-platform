import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { shouldAllowConsentGatedWrite } from './consent-gate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('shouldAllowConsentGatedWrite — pure decision', () => {
  it('unflagged account: always allowed, with or without a consent record', () => {
    // This is the case that matters most: none of the 29 real accounts on
    // prod have a patient_consents row (the table is brand new) — an
    // unconditional consent requirement would have 403'd every one of
    // them on deploy. Unflagged = the gate doesn't apply at all.
    expect(shouldAllowConsentGatedWrite(false, false)).toBe(true);
    expect(shouldAllowConsentGatedWrite(false, true)).toBe(true);
  });

  it('flagged account without a granted data_processing consent: denied', () => {
    expect(shouldAllowConsentGatedWrite(true, false)).toBe(false);
  });

  it('flagged account WITH a granted data_processing consent: allowed', () => {
    expect(shouldAllowConsentGatedWrite(true, true)).toBe(true);
  });
});

// Regression guard for the exact risk flagged during review: this gate must
// stay isolated to the ladder's own endpoints (q1/parent-consent/q2/
// anamnesis in onboarding-ladder.ts) and never get imported into a route
// the live, unflagged cabinet actually calls — survey-banner's /answer,
// the direct health-profile PUT, or Flow A's own /onboarding/step. A
// static source check rather than a live request: no DB is spun up for
// this test suite (see medical-card-completion.test.ts / survey-queue.
// test.ts's own pattern of testing pure functions only), so this is the
// most direct way to prove today, and keep proving after future edits,
// that those files never reference this module at all — not just that
// they happen to behave correctly with today's code.
describe('consent-gate.ts stays isolated to the ladder — never touches shared endpoints', () => {
  const SHARED_ROUTE_FILES = [
    '../routes/aivita/survey.ts',
    '../routes/aivita/health-profile.ts',
    '../routes/aivita/onboarding.ts',
  ];

  it.each(SHARED_ROUTE_FILES)('%s never imports consent-gate', (relativePath) => {
    const source = readFileSync(resolve(__dirname, relativePath), 'utf-8');
    expect(source).not.toMatch(/consent-gate/);
  });

  it('onboarding-ladder.ts (the only place this gate is meant to run) does reference it', () => {
    const source = readFileSync(resolve(__dirname, '../routes/aivita/onboarding-ladder.ts'), 'utf-8');
    expect(source).toMatch(/assertConsentIfFlagged/);
  });
});
