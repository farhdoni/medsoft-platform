'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, Download, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, downloadFile } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type Backup = { id: number; filename: string; sizeBytes: number; createdAt: string };
type AutoSettings = { auto_backup_enabled: string; auto_backup_schedule: string; auto_backup_time: string };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupsPage() {
  const qc = useQueryClient();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [autoForm, setAutoForm] = useState<AutoSettings>({
    auto_backup_enabled: 'false',
    auto_backup_schedule: 'daily',
    auto_backup_time: '03:00',
  });

  const { data: backupsData, isLoading } = useQuery({
    queryKey: ['system-backups'],
    queryFn: () => api.get<{ data: Backup[] }>('/v1/admin/system/backups'),
  });

  const { data: autoData } = useQuery({
    queryKey: ['auto-backup-settings'],
    queryFn: () => api.get<{ settings: AutoSettings }>('/v1/admin/system/auto-backup'),
  });
  useEffect(() => { if (autoData?.settings) setAutoForm(autoData.settings); }, [autoData]);

  const createMutation = useMutation({
    mutationFn: () => api.post<{ data: Backup }>('/v1/admin/system/backup'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-backups'] });
      toast.success('Бэкап создан');
    },
    onError: () => toast.error('Ошибка создания бэкапа'),
  });

  const saveAutoMutation = useMutation({
    mutationFn: () => api.put('/v1/admin/system/auto-backup', autoForm),
    onSuccess: () => toast.success('Настройки автобэкапа сохранены'),
    onError: () => toast.error('Ошибка'),
  });

  async function handleDownload(filename: string) {
    setDownloading(filename);
    try {
      await downloadFile(`/v1/admin/system/backups/${filename}`, filename);
    } catch {
      toast.error('Ошибка скачивания');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Бэкапы базы данных</h2>
          <p className="text-sm text-muted-foreground">Резервные копии PostgreSQL</p>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          {createMutation.isPending ? 'Создаю...' : 'Создать бэкап сейчас'}
        </Button>
      </div>

      {/* Backup list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Последние бэкапы
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : (backupsData?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Бэкапы не найдены. Нажмите «Создать бэкап сейчас».</p>
          ) : (
            <div className="space-y-0 divide-y">
              {(backupsData?.data ?? []).map(b => (
                <div key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm">{b.filename}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(b.createdAt)} · {formatSize(b.sizeBytes)}
                    </p>
                  </div>
                  <Button
                    size="sm" variant="outline" className="h-7"
                    onClick={() => handleDownload(b.filename)}
                    disabled={downloading === b.filename}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {downloading === b.filename ? '...' : 'Скачать'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-backup */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Автоматические бэкапы</CardTitle>
          <Button size="sm" variant="outline" onClick={() => saveAutoMutation.mutate()} disabled={saveAutoMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveAutoMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Автобэкап включён</Label>
              <p className="text-xs text-muted-foreground">Автоматическое создание резервных копий</p>
            </div>
            <Switch
              checked={autoForm.auto_backup_enabled === 'true'}
              onCheckedChange={v => setAutoForm(f => ({ ...f, auto_backup_enabled: String(v) }))}
            />
          </div>
          {autoForm.auto_backup_enabled === 'true' && (
            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div className="space-y-1.5">
                <Label>Расписание</Label>
                <Select
                  value={autoForm.auto_backup_schedule}
                  onValueChange={v => setAutoForm(f => ({ ...f, auto_backup_schedule: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Ежедневно</SelectItem>
                    <SelectItem value="weekly">Еженедельно</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Время (UTC)</Label>
                <Input
                  type="time"
                  value={autoForm.auto_backup_time}
                  onChange={e => setAutoForm(f => ({ ...f, auto_backup_time: e.target.value }))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
