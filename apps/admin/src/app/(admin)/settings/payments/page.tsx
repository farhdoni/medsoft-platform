'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';

type Settings = Record<string, string>;

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
        onClick={() => setShow(v => !v)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function PaymentSettingsPage() {
  const [form, setForm] = useState<Settings>({});
  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const toggle = (key: string) => setForm(f => ({ ...f, [key]: f[key] === 'true' ? 'false' : 'true' }));

  const { data, isLoading } = useQuery({
    queryKey: ['settings-payments'],
    queryFn: () => api.get<{ settings: Settings }>('/v1/admin/settings/payments'),
  });
  useEffect(() => { if (data?.settings) setForm(data.settings); }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put('/v1/admin/settings/payments', form),
    onSuccess: () => toast.success('Настройки платежей сохранены'),
    onError: () => toast.error('Ошибка при сохранении'),
  });

  const s = (key: string, fallback = '') => form[key] ?? fallback;
  const bool = (key: string) => form[key] === 'true';

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Платёжные провайдеры</h2>
          <p className="text-sm text-muted-foreground">Конфигурация платёжных шлюзов</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
        </Button>
      </div>

      {/* Click */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Click</CardTitle>
          <Switch checked={bool('click_active')} onCheckedChange={() => toggle('click_active')} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Merchant ID</Label>
              <Input value={s('click_merchant_id')} onChange={e => set('click_merchant_id', e.target.value)} placeholder="12345" />
            </div>
            <div className="space-y-1.5">
              <Label>Service ID</Label>
              <Input value={s('click_service_id')} onChange={e => set('click_service_id', e.target.value)} placeholder="67890" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Secret Key</Label>
            <PasswordInput value={s('click_secret_key')} onChange={v => set('click_secret_key', v)} placeholder="••••••••••" />
          </div>
        </CardContent>
      </Card>

      {/* Payme */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Payme</CardTitle>
          <Switch checked={bool('payme_active')} onCheckedChange={() => toggle('payme_active')} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Merchant ID</Label>
            <Input value={s('payme_merchant_id')} onChange={e => set('payme_merchant_id', e.target.value)} placeholder="5e730e8..." />
          </div>
          <div className="space-y-1.5">
            <Label>Secret Key</Label>
            <PasswordInput value={s('payme_secret_key')} onChange={v => set('payme_secret_key', v)} placeholder="••••••••••" />
          </div>
        </CardContent>
      </Card>

      {/* Uzum */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Uzum (Apelsin)</CardTitle>
          <Switch checked={bool('uzum_active')} onCheckedChange={() => toggle('uzum_active')} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Merchant ID</Label>
              <Input value={s('uzum_merchant_id')} onChange={e => set('uzum_merchant_id', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>API URL</Label>
              <Input value={s('uzum_api_url')} onChange={e => set('uzum_api_url', e.target.value)} placeholder="https://apay.uzum.uz" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Secret Key</Label>
            <PasswordInput value={s('uzum_secret_key')} onChange={v => set('uzum_secret_key', v)} placeholder="••••••••••" />
          </div>
        </CardContent>
      </Card>

      {/* Test mode */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Тест-режим платежей</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mock-платежи — реальные списания не производятся
              </p>
            </div>
            <Switch checked={bool('payments_test_mode')} onCheckedChange={() => toggle('payments_test_mode')} />
          </div>
          {bool('payments_test_mode') && (
            <div className="mt-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ Тест-режим включён. Платежи не списываются с карт.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
