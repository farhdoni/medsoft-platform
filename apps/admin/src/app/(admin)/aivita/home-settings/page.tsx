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
    onSuccess: () => { toast.success('Настройки сохранены'); setDirty(false); },
    onError: () => toast.error('Ошибка сохранения'),
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

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Загрузка...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Настройки главной страницы</h1>
          <p className="text-muted-foreground">Управление блоками приложения aivita.uz</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {dirty ? 'Сохранить изменения' : 'Сохранено'}
        </Button>
      </div>

      {/* Announcement banner */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Объявление / Баннер
            <Badge variant={bool('aivita_home_announcement_active') ? 'success' : 'secondary'} className="ml-auto text-xs">
              {bool('aivita_home_announcement_active') ? 'Активен' : 'Скрыт'}
            </Badge>
          </CardTitle>
          <CardDescription>Показывается в верхней части главной страницы пациента</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Показывать баннер</Label>
            <Toggle value={bool('aivita_home_announcement_active')} onChange={v => setBool('aivita_home_announcement_active', v)} />
          </div>
          <div className="space-y-1.5">
            <Label>Текст объявления</Label>
            <Input
              value={val('aivita_home_announcement_text')}
              onChange={e => set('aivita_home_announcement_text', e.target.value)}
              placeholder="Например: 🎉 Новая функция — AI-чекап здоровья!"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Цвет фона</Label>
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
          <CardTitle className="text-base">Блоки главной страницы (пациент)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'aivita_home_show_doctors', label: 'Блок «Врачи AIVITA»', desc: 'Показывать топ-3 врача' },
            { key: 'aivita_home_show_ai_checkup', label: 'Блок «AI-чекап здоровья»', desc: 'Кнопка перехода к AI-чекапу' },
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
          <CardTitle className="text-base">Hero-приветствие (пациент)</CardTitle>
          <CardDescription>Текст, который видит пациент при входе</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'aivita_home_hero_greeting_ru', label: '🇷🇺 Русский' },
            { key: 'aivita_home_hero_greeting_uz', label: '🇺🇿 Узбекский' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input value={val(key)} onChange={e => set(key, e.target.value)} placeholder="Добро пожаловать" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Hero text — doctor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Подзаголовок (кабинет врача)</CardTitle>
          <CardDescription>Показывается под именем врача на главной</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'aivita_doctor_home_hero_sub_ru', label: '🇷🇺 Русский' },
            { key: 'aivita_doctor_home_hero_sub_uz', label: '🇺🇿 Узбекский' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input value={val(key)} onChange={e => set(key, e.target.value)} placeholder="Ваш AI-кабинет врача" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Maintenance mode */}
      <Card className={bool('aivita_home_maintenance') ? 'border-destructive' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            ⚠️ Режим технических работ
            {bool('aivita_home_maintenance') && <Badge variant="destructive">АКТИВЕН</Badge>}
          </CardTitle>
          <CardDescription>Блокирует вход в приложение для всех пользователей кроме администраторов</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-destructive font-medium">Включить режим тех. работ</Label>
            <Toggle value={bool('aivita_home_maintenance')} onChange={v => setBool('aivita_home_maintenance', v)} />
          </div>
          {bool('aivita_home_maintenance') && (
            <div className="space-y-1.5">
              <Label>Сообщение пользователям</Label>
              <Input
                value={val('aivita_home_maintenance_msg')}
                onChange={e => set('aivita_home_maintenance_msg', e.target.value)}
                placeholder="Проводятся технические работы. Попробуйте позже."
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
            Сохранить изменения
          </Button>
        </div>
      )}
    </div>
  );
}
