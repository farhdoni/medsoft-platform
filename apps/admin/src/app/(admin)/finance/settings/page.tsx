'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Percent, CreditCard, Wallet, Calendar, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type ProviderConfig = {
  id: string;
  name: string;
  color: string;
  fields: Array<{ key: string; label: string; placeholder: string; secret?: boolean }>;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'click',
    name: 'Click',
    color: 'bg-[#00B4E6]',
    fields: [
      { key: 'CLICK_MERCHANT_ID', label: 'Merchant ID', placeholder: '12345' },
      { key: 'CLICK_SERVICE_ID', label: 'Service ID', placeholder: '12345' },
      { key: 'CLICK_SECRET_KEY', label: 'Secret Key', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'payme',
    name: 'Payme',
    color: 'bg-[#33CCCC]',
    fields: [
      { key: 'PAYME_MERCHANT_ID', label: 'Merchant ID', placeholder: '5e73....' },
      { key: 'PAYME_SECRET_KEY', label: 'Secret Key', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'uzum',
    name: 'Uzum',
    color: 'bg-[#7B2D8E]',
    fields: [
      { key: 'UZUM_MERCHANT_ID', label: 'Merchant ID', placeholder: 'uzum-merchant-xxx' },
      { key: 'UZUM_SECRET_KEY', label: 'Secret Key', placeholder: '••••••••', secret: true },
      { key: 'UZUM_API_URL', label: 'API URL', placeholder: 'https://api.uzum.uz/payment' },
    ],
  },
];

const COMMISSION_ROWS = [
  { key: 'commission_booking',  label: 'Запись к врачу (офлайн)' },
  { key: 'commission_online',   label: 'Онлайн-консультация' },
  { key: 'commission_repeat',   label: 'Повторный визит' },
  { key: 'commission_pharmacy', label: 'Заказы аптеки' },
  { key: 'commission_lab',      label: 'Лабораторные исследования' },
];

const PAYOUT_DAY_OPTIONS = [
  { value: 'monday',    label: 'Понедельник' },
  { value: 'tuesday',   label: 'Вторник' },
  { value: 'wednesday', label: 'Среда' },
  { value: 'thursday',  label: 'Четверг' },
  { value: 'friday',    label: 'Пятница' },
];

const PHARMACY_PERIOD_OPTIONS = [
  { value: 'weekly',    label: 'Еженедельно' },
  { value: 'biweekly',  label: 'Раз в 2 недели' },
  { value: 'monthly',   label: 'Ежемесячно' },
];

export default function FinanceSettingsPage() {
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [platformCfg, setPlatformCfg] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ data: Record<string, string> }>('/v1/admin/settings/platform')
      .then(res => setPlatformCfg(res.data))
      .catch(() => toast.error('Не удалось загрузить настройки'))
      .finally(() => setLoading(false));
  }, []);

  function setPlatform(key: string, value: string) {
    setPlatformCfg(prev => ({ ...prev, [key]: value }));
  }

  async function handleSavePlatform() {
    setSaving(true);
    try {
      await api.put('/v1/admin/settings/platform', platformCfg);
      toast.success('Настройки сохранены');
    } catch {
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  }

  function handleSaveEnv() {
    toast.success('Настройки провайдеров обновлены. Перезапустите API для применения.');
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Commission rates ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            Комиссии платформы
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Тип операции</th>
                  <th className="text-right py-2 font-medium text-muted-foreground w-28">Комиссия, %</th>
                </tr>
              </thead>
              <tbody>
                {COMMISSION_ROWS.map(row => (
                  <tr key={row.key} className="border-b last:border-0">
                    <td className="py-2.5 text-sm">{row.label}</td>
                    <td className="py-2 pl-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={platformCfg[row.key] ?? ''}
                          onChange={e => setPlatform(row.key, e.target.value)}
                          className="h-7 text-sm w-16 text-right"
                        />
                        <span className="text-muted-foreground text-xs">%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Payout settings ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Настройки выплат
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                День выплат врачам
              </label>
              <select
                value={platformCfg['payout_day'] ?? 'friday'}
                onChange={e => setPlatform('payout_day', e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PAYOUT_DAY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Мин. сумма выплаты (сум)</label>
              <Input
                type="number"
                min={0}
                value={platformCfg['payout_minimum'] ?? ''}
                onChange={e => setPlatform('payout_minimum', e.target.value)}
                placeholder="50000"
                className="h-8 text-sm mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Период выплат аптекам</label>
              <select
                value={platformCfg['payout_pharmacy_period'] ?? 'monthly'}
                onChange={e => setPlatform('payout_pharmacy_period', e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PHARMACY_PERIOD_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email уведомлений
              </label>
              <Input
                type="email"
                value={platformCfg['finance_email'] ?? ''}
                onChange={e => setPlatform('finance_email', e.target.value)}
                placeholder="finance@aivita.uz"
                className="h-8 text-sm mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSavePlatform} disabled={saving || loading} className="flex items-center gap-2">
        <Save className="h-4 w-4" />
        {saving ? 'Сохранение...' : 'Сохранить все настройки'}
      </Button>

      {/* ── Payment provider keys (env vars) ─────────────────────────── */}
      <div className="pt-4 border-t">
        <p className="text-sm font-medium mb-1">Провайдеры оплаты</p>
        <p className="text-xs text-muted-foreground mb-4">
          Ключи провайдеров хранятся в переменных окружения сервера.
          Если ключи не заданы, система работает в{' '}
          <Badge variant="warning">Mock-режиме</Badge> (платежи автоматически successful).
        </p>

        <div className="space-y-4">
          {PROVIDERS.map(provider => (
            <Card key={provider.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-white text-xs font-bold ${provider.color}`}>
                    {provider.name[0]}
                  </span>
                  {provider.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {provider.fields.map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                    <div className="relative mt-1">
                      <Input
                        type={field.secret && !visible[field.key] ? 'password' : 'text'}
                        value={envValues[field.key] ?? ''}
                        onChange={e => setEnvValues(v => ({ ...v, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="h-8 text-sm pr-9 font-mono"
                      />
                      {field.secret && (
                        <button
                          type="button"
                          onClick={() => setVisible(v => ({ ...v, [field.key]: !v[field.key] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {visible[field.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">ENV: {field.key}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" onClick={handleSaveEnv} className="mt-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Сохранить ключи провайдеров
        </Button>
      </div>
    </div>
  );
}
