'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

type Role = {
  id: number;
  name: string;
  displayName: string;
  permissions: {
    dashboard?: boolean;
    users_read?: boolean;
    users_edit?: boolean;
    users_delete?: boolean;
    doctors_verify?: boolean;
    finance_read?: boolean;
    finance_edit?: boolean;
    payouts?: boolean;
    marketing?: boolean;
    settings?: boolean;
    roles?: boolean;
    ai_settings?: boolean;
    system?: boolean;
  };
  createdAt: string;
};

type PermissionKey = keyof Role['permissions'];

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: 'Дашборд',
  users_read: 'Просмотр пользователей',
  users_edit: 'Редактирование пользователей',
  users_delete: 'Удаление пользователей',
  doctors_verify: 'Верификация врачей',
  finance_read: 'Просмотр финансов',
  finance_edit: 'Редактирование финансов',
  payouts: 'Выплаты',
  marketing: 'Маркетинг',
  settings: 'Настройки',
  roles: 'Управление ролями',
  ai_settings: 'Настройки AI',
  system: 'Система',
};

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as PermissionKey[];

const emptyPermissions = (): Role['permissions'] =>
  Object.fromEntries(ALL_PERMISSIONS.map((k) => [k, false])) as Role['permissions'];

type FormState = {
  name: string;
  displayName: string;
  permissions: Role['permissions'];
};

const defaultForm = (): FormState => ({
  name: '',
  displayName: '',
  permissions: emptyPermissions(),
});

export default function RolesPage() {
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);

  const [createForm, setCreateForm] = useState<FormState>(defaultForm());
  const [editForm, setEditForm] = useState<FormState>(defaultForm());

  const { data, isLoading } = useQuery<{ data: Role[] }>({
    queryKey: ['admin-roles'],
    queryFn: () => api.get('/v1/admin/users/roles'),
  });

  const roles = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: FormState) => api.post('/v1/admin/users/roles', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success('Роль создана');
      setCreateOpen(false);
      setCreateForm(defaultForm());
    },
    onError: () => toast.error('Ошибка при создании роли'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: FormState }) =>
      api.put(`/v1/admin/users/roles/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success('Роль обновлена');
      setEditRole(null);
    },
    onError: () => toast.error('Ошибка при обновлении роли'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/v1/admin/users/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success('Роль удалена');
      setDeleteRole(null);
    },
    onError: () => toast.error('Ошибка при удалении роли'),
  });

  function openEdit(role: Role) {
    setEditForm({
      name: role.name,
      displayName: role.displayName,
      permissions: { ...emptyPermissions(), ...role.permissions },
    });
    setEditRole(role);
  }

  function togglePermission(form: FormState, key: PermissionKey): FormState {
    return {
      ...form,
      permissions: { ...form.permissions, [key]: !form.permissions[key] },
    };
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Роли и права</h1>
          <p className="text-sm text-muted-foreground mt-1">Управление ролями администраторов</p>
        </div>
        <Button onClick={() => { setCreateForm(defaultForm()); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Создать роль
        </Button>
      </div>

      {/* Role list */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm">Загрузка...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base leading-tight">{role.displayName}</CardTitle>
                    <code className="text-xs text-muted-foreground font-mono">{role.name}</code>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => openEdit(role)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Изменить
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs px-2"
                      disabled={role.name === 'superadmin'}
                      onClick={() => setDeleteRole(role)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-1">
                  {ALL_PERMISSIONS.map((key) => {
                    const enabled = !!role.permissions[key];
                    return (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        {enabled ? (
                          <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={enabled ? 'text-foreground' : 'text-muted-foreground/50'}>
                          {PERMISSION_LABELS[key]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Создано: {formatDate(role.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать роль</DialogTitle>
            <DialogDescription>Заполните данные новой роли и выберите права доступа.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Системное имя</Label>
              <Input
                id="create-name"
                placeholder="moderator"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-display">Отображаемое имя</Label>
              <Input
                id="create-display"
                placeholder="Модератор"
                value={createForm.displayName}
                onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Права доступа</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((key) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-primary"
                      checked={!!createForm.permissions[key]}
                      onChange={() => setCreateForm((f) => togglePermission(f, key))}
                    />
                    <span className="text-xs">{PERMISSION_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => createMutation.mutate(createForm)}
              disabled={createMutation.isPending || !createForm.name || !createForm.displayName}
            >
              {createMutation.isPending ? 'Сохранение...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editRole} onOpenChange={(open) => { if (!open) setEditRole(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать роль</DialogTitle>
            <DialogDescription>Измените данные роли и права доступа.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Системное имя</Label>
              <Input
                id="edit-name"
                placeholder="moderator"
                value={editForm.name}
                disabled={editRole?.name === 'superadmin'}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-display">Отображаемое имя</Label>
              <Input
                id="edit-display"
                placeholder="Модератор"
                value={editForm.displayName}
                onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Права доступа</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((key) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-primary"
                      checked={!!editForm.permissions[key]}
                      onChange={() => setEditForm((f) => togglePermission(f, key))}
                    />
                    <span className="text-xs">{PERMISSION_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRole(null)}>
              Отмена
            </Button>
            <Button
              onClick={() => editRole && updateMutation.mutate({ id: editRole.id, body: editForm })}
              disabled={updateMutation.isPending || !editForm.name || !editForm.displayName}
            >
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteRole} onOpenChange={(open) => { if (!open) setDeleteRole(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить роль</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить роль{' '}
              <span className="font-semibold">{deleteRole?.displayName}</span>? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRole(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteRole && deleteMutation.mutate(deleteRole.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
