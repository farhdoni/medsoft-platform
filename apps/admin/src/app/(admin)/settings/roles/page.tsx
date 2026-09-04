'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

const DOMAIN_LABELS: Record<string, string> = {
  main: 'Главная',
  users: 'Пользователи',
  aivita: 'AIVITA',
  partners: 'Партнёры',
  marketing: 'Маркетинг',
  content: 'Контент',
  notifications: 'Уведомления',
  dashboard: 'Дашборд',
  security: 'Безопасность',
  reports: 'Отчёты',
  finance: 'Финансы',
  system: 'Система',
  settings: 'Настройки',
  admins: 'Админы',
  pii: 'Персональные данные',
  medical: 'Медданные',
};

export default function RolesPage() {
  const { data, isLoading } = useQuery<{ data: Role[] }>({
    queryKey: ['admin-roles'],
    queryFn: () => api.get('/v1/admin/users/roles'),
  });

  const roles = data?.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Роли и права</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Справочник: что может каждая роль. Права заданы в коде и меняются деплоем, не здесь.
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Загрузка...</div>
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
                <CardContent className="space-y-3">
                  {domains.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Нет прав</p>
                  ) : (
                    domains.map((domain) => (
                      <div key={domain}>
                        <p className="text-xs font-medium text-foreground mb-1">
                          {DOMAIN_LABELS[domain] ?? domain}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {role.rightsByDomain[domain].join(', ')}
                        </p>
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
