'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

const LANDING_FIELDS = [
  { key: 'landing_hero_title', label: 'Заголовок Hero', multiline: false },
  { key: 'landing_hero_subtitle', label: 'Подзаголовок Hero', multiline: true },
  { key: 'landing_cta_text', label: 'Текст CTA кнопки', multiline: false },
  { key: 'landing_features', label: 'Возможности (JSON)', multiline: true },
  { key: 'landing_ai_block', label: 'AI блок (JSON)', multiline: true },
  { key: 'landing_specialists_block', label: 'Специалисты блок (JSON)', multiline: true },
  { key: 'landing_doctors_block', label: 'Врачи блок (JSON)', multiline: true },
];

export default function LandingContentPage() {
  const [fields, setFields] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['landing-config'],
    queryFn: () => api.get<{ config: Record<string, string> }>('/v1/admin/content/landing'),
  });

  useEffect(() => {
    if (data?.config) setFields(data.config);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put('/v1/admin/content/landing', fields),
    onSuccess: () => toast.success('Контент лендинга сохранён'),
    onError: () => toast.error('Ошибка при сохранении'),
  });

  function handleChange(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Тексты лендинга aivita.uz</CardTitle>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : (
            LANDING_FIELDS.map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <p className="text-xs text-muted-foreground font-mono">{f.key}</p>
                {f.multiline ? (
                  <Textarea
                    value={fields[f.key] ?? ''}
                    onChange={e => handleChange(f.key, e.target.value)}
                    className="font-mono text-xs min-h-[80px]"
                    placeholder={f.key.endsWith('_block') || f.key === 'landing_features' ? '{}' : ''}
                  />
                ) : (
                  <Input
                    value={fields[f.key] ?? ''}
                    onChange={e => handleChange(f.key, e.target.value)}
                  />
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
