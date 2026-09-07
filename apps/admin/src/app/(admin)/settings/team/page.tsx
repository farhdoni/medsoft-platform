'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  // From the admin_user_roles join — the real assignment, not the legacy
  // admin_users.role enum. Null for an admin that was never assigned one
  // (shouldn't happen for anyone created through invite, but the enum-only
  // legacy accounts predate that).
  roleId: number | null;
  roleName: string | null;
  roleDisplayName: string | null;
};

// The 8 real, assignable roles (is_deprecated = false) — same endpoint the
// read-only roles reference page uses, filtered server-side.
type RoleOption = {
  id: number;
  name: string;
  displayName: string;
};

type InviteForm = {
  email: string;
  fullName: string;
  password: string;
  roleId: string;
};

const defaultInviteForm = (): InviteForm => ({
  email: '',
  fullName: '',
  password: '',
  roleId: '',
});


function RoleBadge({ role, labels }: { role: string; labels: Record<string, string> }) {
  const text = labels[role] ?? role;
  if (role === 'superadmin') {
    return <Badge variant="destructive">{text}</Badge>;
  }
  if (role === 'admin') {
    return <Badge variant="default">{text}</Badge>;
  }
  return <Badge variant="secondary">{text}</Badge>;
}

export default function TeamPage() {
  const { t } = useI18n();
  const ROLE_LABELS: Record<string, string> = {
    superadmin: t.settings.roleSuperadmin,
    admin: t.settings.roleAdmin,
    moderator: t.settings.roleModerator,
    support: t.settings.roleSupport,
    marketing: t.settings.roleMarketing,
    finance: t.settings.roleFinance,
    viewer: t.settings.roleViewer,
  };
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<InviteForm>(defaultInviteForm());

  const { data: meData } = useQuery<{ id: string }>({
    queryKey: ['auth-me'],
    queryFn: () => api.get('/v1/auth/me'),
  });
  const currentAdminId = meData?.id;

  const { data, isLoading } = useQuery<{ data: AdminUser[] }>({
    queryKey: ['admin-team'],
    queryFn: () => api.get('/v1/admin/users/team'),
  });

  const admins = data?.data ?? [];

  const { data: rolesData } = useQuery<{ data: RoleOption[] }>({
    queryKey: ['admin-roles-assignable'],
    queryFn: () => api.get('/v1/admin/users/roles'),
  });

  const assignableRoles = rolesData?.data ?? [];

  const roleChangeMutation = useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: number }) =>
      api.patch(`/v1/admin/users/team/${id}/role`, { roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast.success(t.settings.roleUpdated);
    },
    onError: (err: Error) => toast.error(err.message || t.settings.roleUpdateFail),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/v1/admin/users/team/${id}/active`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast.success(t.settings.statusUpdated);
    },
    onError: (err: Error) => toast.error(err.message || t.settings.statusUpdateFail),
  });

  const inviteMutation = useMutation({
    mutationFn: (body: InviteForm) => api.post('/v1/admin/users/team/invite', {
      email: body.email,
      fullName: body.fullName,
      password: body.password,
      roleId: Number(body.roleId),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast.success(t.settings.adminCreated);
      setInviteOpen(false);
      setForm(defaultInviteForm());
    },
    onError: () => toast.error(t.settings.adminCreateFail),
  });

  const isFormValid = form.email && form.fullName && form.password && form.roleId;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.settings.teamTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.settings.teamSubtitle}</p>
        </div>
        <Button onClick={() => { setForm(defaultInviteForm()); setInviteOpen(true); }}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t.settings.inviteAdmin}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">{t.settings.fullName}</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">{t.security.role}</th>
                <th className="text-left px-4 py-3 font-medium">{t.common.status}</th>
                <th className="text-left px-4 py-3 font-medium">{t.settings.lastLogin}</th>
                <th className="text-left px-4 py-3 font-medium">{t.settings.createdAt}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {t.settings.teamEmpty}
                  </td>
                </tr>
              ) : (
                admins.map((admin) => {
                  const isSelf = admin.id === currentAdminId;
                  return (
                    <tr key={admin.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {admin.fullName}
                        {isSelf && <span className="text-muted-foreground font-normal"> {t.settings.you}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{admin.email}</td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          admin.roleDisplayName ?? <RoleBadge role={admin.role} labels={ROLE_LABELS} />
                        ) : (
                          <Select
                            value={admin.roleId ? String(admin.roleId) : undefined}
                            onValueChange={(val) =>
                              roleChangeMutation.mutate({ id: admin.id, roleId: Number(val) })
                            }
                          >
                            <SelectTrigger className="h-8 w-[190px] text-xs">
                              <SelectValue placeholder={t.settings.noRole}>
                                {admin.roleDisplayName ?? t.settings.noRole}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {assignableRoles.map((role) => (
                                <SelectItem key={role.id} value={String(role.id)}>
                                  {role.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          admin.isActive ? (
                            <Badge variant="success">{t.common.active}</Badge>
                          ) : (
                            <Badge variant="secondary">{t.settings.inactive}</Badge>
                          )
                        ) : (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={admin.isActive}
                              onCheckedChange={(checked) =>
                                toggleActiveMutation.mutate({ id: admin.id, isActive: checked })
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {admin.isActive ? t.common.active : t.settings.inactive}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(admin.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.settings.inviteAdmin}</DialogTitle>
            <DialogDescription>{t.settings.inviteHint}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="admin@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">{t.settings.fullName}</Label>
              <Input
                id="invite-name"
                placeholder={t.settings.namePlaceholder}
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-password">{t.settings.password}</Label>
              <Input
                id="invite-password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.security.role}</Label>
              <Select value={form.roleId} onValueChange={(val) => setForm((f) => ({ ...f, roleId: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t.settings.selectRole} />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => inviteMutation.mutate(form)}
              disabled={inviteMutation.isPending || !isFormValid}
            >
              {inviteMutation.isPending ? t.settings.creating : t.settings.invite}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
