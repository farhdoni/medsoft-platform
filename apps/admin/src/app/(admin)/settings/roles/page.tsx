'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';

// Vocabulary unification pass (feat/rbac-enforce-2): this page used to be an
// editable matrix of 13 legacy checkboxes (admin_roles.permissions) that was
// never actually a gate anywhere — requireRight enforces against ROLE_RIGHTS
// in apps/api/src/lib/rbac.ts instead. Editing here changed nothing about
// what a role could actually do. Replaced with a read-only reference: the 8
// real roles and the rights ROLE_RIGHTS actually grants each one, grouped by
// domain. Creating/editing/deleting roles now happens in code (rbac.ts),
// deployed like any other change — not through this page.

type Role = {
  id: number;
  name: string;
  displayName: string;
  rightsByDomain: Record<string, string[]>;
};


// Readability pass: human labels for every slug in apps/api/src/lib/rbac.ts
// PERMISSIONS (checked against the catalog directly, not just what's visible
// on a role today — a slug not yet granted to any role still needs a label
// once it is). The raw slug is still shown (small, muted) next to the label
// for anyone who needs to find it in code — this map only changes what's
// displayed, not the data. Unmapped slugs fall back to showing the raw slug
// as-is (see t.rights[slug] ?? slug below) — no blank/broken cards.

export default function RolesPage() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery<{ data: Role[] }>({
    queryKey: ['admin-roles'],
    queryFn: () => api.get('/v1/admin/users/roles'),
  });

  const roles = data?.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.rights.pageTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.rights.pageSubtitle}
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => {
            const domains = Object.keys(role.rightsByDomain).sort();
            return (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base leading-tight">{role.displayName}</CardTitle>
                  <code className="text-xs text-muted-foreground font-mono">{role.name}</code>
                </CardHeader>
                <CardContent className="space-y-4">
                  {domains.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t.rights.noRights}</p>
                  ) : (
                    domains.map((domain) => (
                      <div key={domain}>
                        <p className="text-xs font-medium text-foreground mb-1.5">
                          {t.rights['domain:' + domain] ?? domain}
                        </p>
                        <div className="space-y-1.5">
                          {role.rightsByDomain[domain].map((slug) => (
                            <div key={slug}>
                              <p className="text-xs text-foreground/90 break-words">
                                {t.rights[slug] ?? slug}
                              </p>
                              <p className="text-[10px] text-muted-foreground/70 font-mono break-all">
                                {slug}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
