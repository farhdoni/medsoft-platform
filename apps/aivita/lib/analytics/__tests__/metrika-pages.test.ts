import { describe, it, expect } from 'vitest';
import { isMetrikaPage } from '../metrika';

describe('isMetrikaPage', () => {
  it('allows the public funnel in every locale', () => {
    for (const p of ['/ru/sign-in', '/uz/sign-up', '/en/doctor-login', '/ru/doctor-sign-up', '/ru/verify-email', '/ru/get-app', '/ru/sign-up/']) {
      expect(isMetrikaPage(p)).toBe(true);
    }
  });

  it('never lets the cabinet through', () => {
    for (const p of ['/ru/home', '/ru/drug-checker', '/ru/symptom-checker', '/ru/medical-card', '/ru/messenger/3f9a2e01', '/ru/onboarding', '/ru/settings/referral']) {
      expect(isMetrikaPage(p)).toBe(false);
    }
  });

  it('rejects nested paths, missing locale and empty input', () => {
    for (const p of ['/ru/sign-up/extra', '/sign-in', '/de/sign-in', '', null, undefined]) {
      expect(isMetrikaPage(p)).toBe(false);
    }
  });
});
