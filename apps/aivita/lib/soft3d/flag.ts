// Moved to @medsoft/shared (Part B) — apps/api needs the exact same
// allowlist decision for server-side enforcement (onboarding-ladder.ts's
// consent guard), so this is now the single source of truth for both.
// Re-exported here so nothing that already imports from this path breaks.
export { isSoft3dEnabled } from '@medsoft/shared';
