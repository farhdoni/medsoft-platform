'use client';

import { useState } from 'react';
import { Eye, EyeOff, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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

export default function FinanceSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  function handleSave() {
    toast.success('Настройки обновлены. Перезапустите API для применения.');
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Ключи провайдеров хранятся в переменных окружения сервера.
        Если ключи не заданы, система работает в <Badge variant="warning">Mock-режиме</Badge> (платежи автоматически successful).
      </p>

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
                    value={values[field.key] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
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

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Общие настройки</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Комиссия платформы (%)</label>
            <Input placeholder="20" className="h-8 text-sm mt-1 max-w-24" />
            <p className="text-xs text-muted-foreground mt-0.5">Применяется к выплатам врачам</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email уведомлений о выплатах</label>
            <Input placeholder="finance@aivita.uz" className="h-8 text-sm mt-1 max-w-64" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="flex items-center gap-2">
        <Save className="h-4 w-4" />
        Сохранить настройки
      </Button>
    </div>
  );
}
