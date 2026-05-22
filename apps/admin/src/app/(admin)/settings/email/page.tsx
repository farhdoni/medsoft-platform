'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save, Send, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';

type Settings = {
  email_provider: string; smtp_host: string; smtp_port: string;
  smtp_user: string; smtp_password: string; smtp_from: string; email_test_mode: string;
};

export default function EmailSettingsPage() {
  const [form, setForm] = useState<Settings>({
    email_provider: 'mock', smtp_host: '', smtp_port: '587',
    smtp_user: '', smtp_password: '', smtp_from: '', email_test_mode: 'true',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testSubject, setTestSubject] = useState('Тест Aivita Admin');

  const { data, isLoading } = useQuery({
    queryKey: ['settings-email'],
    queryFn: () => api.get<{ settings: Settings }>('/v1/admin/settings/email'),
  });
  useEffect(() => { if (data?.settings) setForm(data.settings); }, [data]);

  const set = (key: keyof Settings, value: string) => setForm(f => ({ ...f, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: () => api.put('/v1/admin/settings/email', form),
    onSuccess: () => toast.success('Email настройки сохранены'),
    onError: () => toast.error('Ошибка'),
  });

  const testMutation = useMutation({
    mutationFn: () => api.post<{ ok: boolean; mode?: string; message?: string }>('/v1/admin/settings/email/test', { to: testTo, subject: testSubject, text: 'Тест email от Aivita Admin' }),
    onSuccess: (res) => {
      if (res.mode === 'test') toast.info(`Тест-режим: ${res.message}`);
      else toast.success('Email отправлен');
    },
    onError: () => toast.error('Ошибка отправки'),
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Email настройки</h2>
          <p className="text-sm text-muted-foreground">Конфигурация провайдера email-рассылок</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Провайдер</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email провайдер</Label>
            <Select value={form.email_provider} onValueChange={v => set('email_provider', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">Mock (тест, не отправляет)</SelectItem>
                <SelectItem value="smtp">SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <div>
              <Label className="text-sm font-medium">Тест-режим</Label>
              <p className="text-xs text-muted-foreground">Письма не отправляются</p>
            </div>
            <Switch
              checked={form.email_test_mode !== 'false'}
              onCheckedChange={v => set('email_test_mode', String(v))}
            />
          </div>
        </CardContent>
      </Card>

      {form.email_provider === 'smtp' && (
        <Card>
          <CardHeader><CardTitle className="text-base">SMTP конфигурация</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>SMTP хост</Label>
                <Input value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Порт</Label>
                <Input type="number" value={form.smtp_port} onChange={e => set('smtp_port', e.target.value)} placeholder="587" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Пользователь</Label>
                <Input value={form.smtp_user} onChange={e => set('smtp_user', e.target.value)} placeholder="user@gmail.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Пароль</Label>
                <div className="relative">
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    value={form.smtp_password}
                    onChange={e => set('smtp_password', e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" className="absolute right-2.5 top-2.5 text-muted-foreground" onClick={() => setShowPwd(v => !v)}>
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>От кого (From)</Label>
              <Input value={form.smtp_from} onChange={e => set('smtp_from', e.target.value)} placeholder="noreply@aivita.uz" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test email */}
      <Card>
        <CardHeader><CardTitle className="text-base">Тестовое письмо</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Получатель</Label>
            <Input type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="test@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Тема</Label>
            <Input value={testSubject} onChange={e => setTestSubject(e.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !testTo.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {testMutation.isPending ? 'Отправляю...' : 'Отправить тест'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
