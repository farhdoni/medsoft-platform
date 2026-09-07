'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type Settings = {
  platform_name: string;
  platform_logo_url: string;
  support_email: string;
  support_phone: string;
  maintenance_mode: string;
  registration_open: string;
};

export default function GeneralSettingsPage() {
  const { t } = useI18n();
  const [form, setForm] = useState<Settings>({
    platform_name: 'Aivita',
    platform_logo_url: '',
    support_email: 'support@aivita.uz',
    support_phone: '+998 71 200 00 00',
    maintenance_mode: 'false',
    registration_open: 'true',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['settings-general'],
    queryFn: () => api.get<{ settings: Settings }>('/v1/admin/settings/general'),
  });

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put('/v1/admin/settings/general', form),
    onSuccess: () => toast.success(t.settings.saved),
    onError: () => toast.error(t.settings.saveFailed),
  });

  const set = (key: keyof Settings, value: string) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.settings.generalTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.settings.generalSubtitle}</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? t.settings.savingShort : t.settings.saveShort}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t.settings.identity}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.settings.platformName}</Label>
            <Input value={form.platform_name} onChange={e => set('platform_name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.settings.logoUrl}</Label>
            <Input value={form.platform_logo_url} onChange={e => set('platform_logo_url', e.target.value)} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t.settings.supportContacts}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.settings.supportEmail}</Label>
            <Input type="email" value={form.support_email} onChange={e => set('support_email', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.settings.supportPhone}</Label>
            <Input value={form.support_phone} onChange={e => set('support_phone', e.target.value)} placeholder="+998 ..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t.settings.workMode}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">{t.settings.maintenance}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.settings.maintenanceHint}
              </p>
            </div>
            <Switch
              checked={form.maintenance_mode === 'true'}
              onCheckedChange={v => set('maintenance_mode', String(v))}
            />
          </div>
          {form.maintenance_mode === 'true' && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {t.settings.maintenanceOn}
            </div>
          )}
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <Label className="text-sm font-medium">{t.settings.signupOpen}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.settings.signupHint}
              </p>
            </div>
            <Switch
              checked={form.registration_open !== 'false'}
              onCheckedChange={v => set('registration_open', String(v))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
