'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
};

type InviteForm = {
  email: string;
  fullName: string;
  password: string;
  role: string;
};

const defaultInviteForm = (): InviteForm => ({
  email: '',
  fullName: '',
  password: '',
  role: 'admin',
});

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Супер-админ',
  admin: 'Администратор',
  moderator: 'Модератор',
  support: 'Поддержка',
  marketing: 'Маркетинг',
  finance: 'Финансы',
  viewer: 'Наблюдатель',
};

function RoleBadge({ role }: { role: string }) {
  if (role === 'superadmin') {
    return <Badge variant="destructive">{ROLE_LABELS[role] ?? role}</Badge>;
  }
  if (role === 'admin') {
    return <Badge variant="default">{ROLE_LABELS[role] ?? role}</Badge>;
  }
  return <Badge variant="secondary">{ROLE_LABELS[role] ?? role}</Badge>;
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<InviteForm>(defaultInviteForm());

  const { data, isLoading } = useQuery<{ data: AdminUser[] }>({
    queryKey: ['admin-team'],
    queryFn: () => api.get('/v1/admin/users/team'),
  });

  const admins = data?.data ?? [];

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/v1/admins/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast.success('Статус обновлён');
    },
    onError: () => toast.error('Ошибка при обновлении статуса'),
  });

  const inviteMutation = useMutation({
    mutationFn: (body: InviteForm) => api.post('/v1/admin/users/team/invite', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast.success('Администратор создан');
      setInviteOpen(false);
      setForm(defaultInviteForm());
    },
    onError: () => toast.error('Ошибка при создании администратора'),
  });

  const isFormValid = form.email && form.fullName && form.password && form.role;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Команда</h1>
          <p className="text-sm text-muted-foreground mt-1">Администраторы системы</p>
        </div>
        <Button onClick={() => { setForm(defaultInviteForm()); setInviteOpen(true); }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Пригласить администратора
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm">Загрузка...</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Имя</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Роль</th>
                <th className="text-left px-4 py-3 font-medium">Статус</th>
                <th className="text-left px-4 py-3 font-medium">Последний вход</th>
                <th className="text-left px-4 py-3 font-medium">Дата создания</th>
                <th className="text-left px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Нет администраторов
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{admin.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{admin.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={admin.role} />
                    </td>
                    <td className="px-4 py-3">
                      {admin.isActive ? (
                        <Badge variant="success">Активен</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивен</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(admin.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {admin.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={toggleActiveMutation.isPending}
                          onClick={() => toggleActiveMutation.mutate({ id: admin.id, isActive: false })}
                        >
                          Деактивировать
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={toggleActiveMutation.isPending}
                          onClick={() => toggleActiveMutation.mutate({ id: admin.id, isActive: true })}
                        >
                          Активировать
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Пригласить администратора</DialogTitle>
            <DialogDescription>Создайте нового администратора системы.</DialogDescription>
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
              <Label htmlFor="invite-name">Полное имя</Label>
              <Input
                id="invite-name"
                placeholder="Иван Иванов"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-password">Пароль</Label>
              <Input
                id="invite-password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Роль</Label>
              <Select value={form.role} onValueChange={(val) => setForm((f) => ({ ...f, role: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="moderator">Модератор</SelectItem>
                  <SelectItem value="support">Поддержка</SelectItem>
                  <SelectItem value="marketing">Маркетинг</SelectItem>
                  <SelectItem value="finance">Финансы</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => inviteMutation.mutate(form)}
              disabled={inviteMutation.isPending || !isFormValid}
            >
              {inviteMutation.isPending ? 'Создание...' : 'Пригласить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
