'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Eye, EyeOff, Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type HomeSettings = Record<string, string>;

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-primary' : 'bg-muted'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function HomeSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<HomeSettings>({});
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery<{ data: HomeSettings }>({
    queryKey: ['home-settings'],
    queryFn: () => api.get('/v1/aivita-admin/home-settings'),
  });

  useEffect(() => {
    if (data?.data) { setSettings(data.data); setDirty(false); }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put('/v1/aivita-admin/home-settings', settings),
    onSuccess: () => { toast.success(t.settings.saved); setDirty(false); },
    onError: () => toast.error(t.aivita.saveFailed),
  });

  function set(key: string, value: string) {
    setSettings(s => ({ ...s, [key]: value }));
    setDirty(true);
  }

  function setBool(key: string, value: boolean) {
    set(key, value ? 'true' : 'false');
  }

  function bool(key: string) { return settings[key] === 'true'; }
  function val(key: string, def = '') { return settings[key] ?? def; }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">{t.common.loading}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.aivita.homeTitle}</h1>
          <p className="text-muted-foreground">{t.aivita.homeSubtitle}</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {dirty ? t.aivita.saveChanges : t.aivita.savedLabel}
        </Button>
      </div>

      {/* Announcement banner */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            {t.aivita.banner}
            <Badge variant={bool('aivita_home_announcement_active') ? 'success' : 'secondary'} className="ml-auto text-xs">
              {bool('aivita_home_announcement_active') ? t.common.active : t.aivita.bannerHidden}
            </Badge>
          </CardTitle>
          <CardDescription>{t.aivita.bannerHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t.aivita.bannerShow}</Label>
            <Toggle value={bool('aivita_home_announcement_active')} onChange={v => setBool('aivita_home_announcement_active', v)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.aivita.bannerText}</Label>
            <Input
              value={val('aivita_home_announcement_text')}
              onChange={e => set('aivita_home_announcement_text', e.target.value)}
              placeholder={t.aivita.bannerTextHint}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t.aivita.bannerColor}</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={val('aivita_home_announcement_color', '#6BA3D6')}
                onChange={e => set('aivita_home_announcement_color', e.target.value)}
                className="h-9 w-16 rounded border cursor-pointer"
              />
              <Input
                value={val('aivita_home_announcement_color', '#6BA3D6')}
                onChange={e => set('aivita_home_announcement_color', e.target.value)}
                className="w-32 font-mono text-sm"
                placeholder="#6BA3D6"
              />
              {val('aivita_home_announcement_text') && (
                <div
                  className="flex-1 rounded-lg px-3 py-2 text-white text-sm font-medium text-center"
                  style={{ background: val('aivita_home_announcement_color', '#6BA3D6') }}
                >
                  {val('aivita_home_announcement_text')}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block visibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.aivita.homeBlocks}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'aivita_home_show_doctors', label: t.aivita.blockDoctors, desc: t.aivita.blockDoctorsDesc },
            { key: 'aivita_home_show_ai_checkup', label: t.aivita.blockCheckup, desc: t.aivita.blockCheckupDesc },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Toggle value={bool(key)} onChange={v => setBool(key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Hero text — patient */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.aivita.heroPatient}</CardTitle>
          <CardDescription>{t.aivita.heroPatientDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'aivita_home_hero_greeting_ru', label: t.aivita.langRu },
            { key: 'aivita_home_hero_greeting_uz', label: t.aivita.langUz },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input value={val(key)} onChange={e => set(key, e.target.value)} placeholder={t.aivita.heroPatientHint} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Hero text — doctor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.aivita.heroDoctor}</CardTitle>
          <CardDescription>{t.aivita.heroDoctorDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'aivita_doctor_home_hero_sub_ru', label: t.aivita.langRu },
            { key: 'aivita_doctor_home_hero_sub_uz', label: t.aivita.langUz },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input value={val(key)} onChange={e => set(key, e.target.value)} placeholder={t.aivita.heroDoctorHint} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Maintenance mode */}
      <Card className={bool('aivita_home_maintenance') ? 'border-destructive' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            {t.aivita.maintenance}
            {bool('aivita_home_maintenance') && <Badge variant="destructive">{t.aivita.maintenanceOn}</Badge>}
          </CardTitle>
          <CardDescription>{t.aivita.maintenanceDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-destructive font-medium">{t.aivita.maintenanceToggle}</Label>
            <Toggle value={bool('aivita_home_maintenance')} onChange={v => setBool('aivita_home_maintenance', v)} />
          </div>
          {bool('aivita_home_maintenance') && (
            <div className="space-y-1.5">
              <Label>{t.aivita.maintenanceMsg}</Label>
              <Input
                value={val('aivita_home_maintenance_msg')}
                onChange={e => set('aivita_home_maintenance_msg', e.target.value)}
                placeholder={t.aivita.maintenanceHint}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom save */}
      {dirty && (
        <div className="sticky bottom-6 flex justify-end">
          <Button size="lg" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            className="shadow-lg">
            <Save className="h-4 w-4 mr-2" />
            {t.aivita.saveChanges}
          </Button>
        </div>
      )}
    </div>
  );
}
