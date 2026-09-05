/**
 * Self-lockout guard for admin/users-team.ts's role-change and
 * activate/deactivate routes. Pure and dependency-free on purpose — no db,
 * no env — so it can be unit-tested against a constructed Set without
 * touching a live database (see team-guard.test.ts).
 *
 * True only when the target currently IS one of the active superadmins,
 * they are the ONLY one, and the change wouldn't leave them as one (a role
 * change away from superadmin, or any deactivation — callers pass
 * `targetStaysSuperadmin: false` for deactivate, since losing isActive
 * removes them from the set regardless of role).
 */
export function wouldOrphanSuperadmins(
  activeSuperadminIds: Set<string>,
  targetId: string,
  targetStaysSuperadmin: boolean,
): boolean {
  return activeSuperadminIds.has(targetId) && activeSuperadminIds.size === 1 && !targetStaysSuperadmin;
}
