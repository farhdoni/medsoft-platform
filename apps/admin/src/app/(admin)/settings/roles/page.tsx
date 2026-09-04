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

// Readability pass: human labels for every slug in apps/api/src/lib/rbac.ts
// PERMISSIONS (checked against the catalog directly, not just what's visible
// on a role today — a slug not yet granted to any role still needs a label
// once it is). The raw slug is still shown (small, muted) next to the label
// for anyone who needs to find it in code — this map only changes what's
// displayed, not the data. Unmapped slugs fall back to showing the raw slug
// as-is (see RIGHT_LABELS[slug] ?? slug below) — no blank/broken cards.
const RIGHT_LABELS: Record<string, string> = {
  'main:read': 'Просмотр',

  'users:read': 'Просмотр пользователей',
  'users:edit': 'Редактирование пользователей',
  'users:delete': 'Удаление пользователей',

  'aivita:doctors_read': 'Врачи AIVITA — просмотр',
  'aivita:doctors_manage': 'Врачи AIVITA — управление',
  'aivita:billing_read': 'Биллинг AIVITA — просмотр',
  'aivita:billing_manage': 'Биллинг AIVITA — управление',
  'aivita:content_read': 'Контент AIVITA — просмотр',
  'aivita:content_manage': 'Контент AIVITA — управление',
  'aivita:support': 'Поддержка AIVITA',

  'partners:read': 'Просмотр партнёров',
  'partners:manage': 'Управление партнёрами',
  'partners:issue_key': 'Выпуск ключей доступа партнёрам',

  'marketing:read': 'Просмотр',
  'marketing:manage': 'Управление',

  'content:read': 'Просмотр',
  'content:manage': 'Управление',
  'content:clinic_requests_read': 'Заявки клиник — просмотр',
  'content:clinic_requests_manage': 'Заявки клиник — управление',

  'notifications:read': 'Просмотр',
  'notifications:manage': 'Отправка рассылок',

  'dashboard:read': 'Просмотр',

  'security:read': 'Просмотр (журнал входов, блокировки)',
  'security:manage': 'Управление блокировками IP',

  'reports:generate': 'Формирование отчётов',

  'finance:read': 'Просмотр',
  'finance:edit': 'Возвраты, промокоды, выплаты',
  'finance:prices_manage': 'Изменение цен',
  'finance:settings_read': 'Настройки (комиссии) — просмотр',
  'finance:settings_manage': 'Настройки (комиссии) — управление',

  'system:read': 'Просмотр (логи, мониторинг)',
  'system:manage': 'Бэкапы и системные настройки',

  'settings:ai_read': 'Настройки AI — просмотр',
  'settings:ai_manage': 'Настройки AI — управление',
  'settings:roles_read': 'Роли — просмотр',
  'settings:roles_manage': 'Роли — управление',
  'settings:team_read': 'Команда — просмотр',
  'settings:team_manage': 'Команда — управление',

  'admins:manage': 'Управление супер-админами',

  'pii:reveal': 'Раскрытие персональных данных',
  'medical:read_phi': 'Просмотр медданных',
  'medical:manage_phi': 'Изменение медданных',
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
                <CardContent className="space-y-4">
                  {domains.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Нет прав</p>
                  ) : (
                    domains.map((domain) => (
                      <div key={domain}>
                        <p className="text-xs font-medium text-foreground mb-1.5">
                          {DOMAIN_LABELS[domain] ?? domain}
                        </p>
                        <div className="space-y-1.5">
                          {role.rightsByDomain[domain].map((slug) => (
                            <div key={slug}>
                              <p className="text-xs text-foreground/90 break-words">
                                {RIGHT_LABELS[slug] ?? slug}
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
