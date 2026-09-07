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
import { useI18n } from '@/lib/i18n';

const LANDING_FIELDS = [
  { key: 'landing_hero_title', labelKey: 'heroTitle', multiline: false },
  { key: 'landing_hero_subtitle', labelKey: 'heroSubtitle', multiline: true },
  { key: 'landing_cta_text', labelKey: 'ctaText', multiline: false },
  { key: 'landing_features', labelKey: 'features', multiline: true },
  { key: 'landing_ai_block', labelKey: 'aiBlock', multiline: true },
  { key: 'landing_specialists_block', labelKey: 'specialistsBlock', multiline: true },
  { key: 'landing_doctors_block', labelKey: 'doctorsBlock', multiline: true },
];

export default function LandingContentPage() {
  const { t } = useI18n();
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
    onSuccess: () => toast.success(t.content.landingSaved),
    onError: () => toast.error(t.settings.saveFailed),
  });

  function handleChange(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t.content.landingTitle}</CardTitle>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? t.settings.savingShort : t.settings.saveShort}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t.common.loading}</p>
          ) : (
            LANDING_FIELDS.map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label>{t.content[f.labelKey]}</Label>
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
