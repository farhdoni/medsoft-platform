import { describe, it, expect } from 'vitest';
import { wouldOrphanSuperadmins } from './team-guard.js';

// Isolated logic test for the self-lockout guard — constructed Sets, no DB,
// no HTTP request. See the caveat in the feature's report/commit message:
// this proves the formula itself is correct, not that the live route calls
// it before applying a change. That second half is proven separately, by
// reading admin/users-team.ts's two PATCH handlers — wouldOrphanSuperadmins
// is called and its result checked before any db.update/db.transaction in
// both PATCH /team/:id/role and PATCH /team/:id/active.

describe('wouldOrphanSuperadmins', () => {
  it('blocks when the target is the only active superadmin and would stop being one', () => {
    const activeSuperadmins = new Set(['target-id']);
    expect(wouldOrphanSuperadmins(activeSuperadmins, 'target-id', false)).toBe(true);
  });

  it('allows when there is more than one active superadmin', () => {
    const activeSuperadmins = new Set(['target-id', 'other-id']);
    expect(wouldOrphanSuperadmins(activeSuperadmins, 'target-id', false)).toBe(false);
  });

  it('allows a role change that keeps the sole superadmin as superadmin', () => {
    // e.g. reassigning them to the same role, or a no-op re-pick — not an
    // actual demotion, so nothing is orphaned.
    const activeSuperadmins = new Set(['target-id']);
    expect(wouldOrphanSuperadmins(activeSuperadmins, 'target-id', true)).toBe(false);
  });

  it('allows acting on someone who is not currently an active superadmin at all', () => {
    const activeSuperadmins = new Set(['someone-else']);
    expect(wouldOrphanSuperadmins(activeSuperadmins, 'target-id', false)).toBe(false);
  });

  it('allows when the set is empty (target not in it, vacuously)', () => {
    const activeSuperadmins = new Set<string>();
    expect(wouldOrphanSuperadmins(activeSuperadmins, 'target-id', false)).toBe(false);
  });
});
