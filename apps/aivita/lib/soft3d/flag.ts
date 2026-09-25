import { isSoft3dEnabled as isSoft3dEnabledPure } from '@medsoft/shared';

// Thin wrapper supplying this process's own SOFT3D_TEST_ACCOUNTS — the
// pure allowlist check itself lives in @medsoft/shared (Part B) since
// apps/api needs the identical decision for server-side enforcement
// (onboarding-ladder.ts's consent guard) and that package can't assume a
// Node `process` global. Every existing call site in this app imports
// from here, not from @medsoft/shared directly, so this keeps the
// original one-argument signature and nothing else needs to change.
export function isSoft3dEnabled(email: string | null | undefined): boolean {
  return isSoft3dEnabledPure(email, process.env.SOFT3D_TEST_ACCOUNTS);
}
