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
import { api } from '@/lib/api';

type Settings = { sms_provider: string; sms_eskiz_token: string; sms_test_mode: string };

export default function SmsSettingsPage() {
  const [form, setForm] = useState<Settings>({ sms_provider: 'eskiz', sms_eskiz_token: '', sms_test_mode: 'false' });
  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('Тест от Aivita Admin');

  const { data, isLoading } = useQuery({
    queryKey: ['settings-sms'],
    queryFn: () => api.get<{ settings: Settings }>('/v1/admin/settings/sms'),
  });
  useEffect(() => { if (data?.settings) setForm(data.settings); }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put('/v1/admin/settings/sms', form),
    onSuccess: () => toast.success('SMS настройки сохранены'),
    onError: () => toast.error('Ошибка'),
  });

  const testMutation = useMutation({
    mutationFn: () => api.post<{ ok: boolean; mode?: string; message?: string }>('/v1/admin/settings/sms/test', { phone: testPhone, text: testText }),
    onSuccess: (res) => {
      if (res.mode === 'test') toast.info(`Тест-режим: ${res.message}`);
      else toast.success('SMS отправлено');
    },
    onError: () => toast.error('Ошибка отправки'),
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">SMS настройки</h2>
          <p className="text-sm text-muted-foreground">Конфигурация провайдера SMS-уведомлений</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Eskiz (uzbektelecom)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Eskiz API Token</Label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                value={form.sms_eskiz_token}
                onChange={e => setForm(f => ({ ...f, sms_eskiz_token: e.target.value }))}
                placeholder="eyJhbGciOiJ..."
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken(v => !v)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Получите токен на <a href="https://notify.eskiz.uz" target="_blank" rel="noreferrer" className="underline">notify.eskiz.uz</a>
            </p>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <div>
              <Label className="text-sm font-medium">Тест-режим SMS</Label>
              <p className="text-xs text-muted-foreground">Сообщения логируются, не отправляются</p>
            </div>
            <Switch
              checked={form.sms_test_mode === 'true'}
              onCheckedChange={v => setForm(f => ({ ...f, sms_test_mode: String(v) }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test SMS */}
      <Card>
        <CardHeader><CardTitle className="text-base">Тестовое SMS</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Номер телефона</Label>
            <Input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="+998901234567" />
          </div>
          <div className="space-y-1.5">
            <Label>Текст сообщения</Label>
            <Input value={testText} onChange={e => setTestText(e.target.value)} maxLength={160} />
            <p className="text-xs text-muted-foreground text-right">{testText.length}/160</p>
          </div>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !testPhone.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {testMutation.isPending ? 'Отправляю...' : 'Отправить тест'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
