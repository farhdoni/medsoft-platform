'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const SOCIAL_FIELDS = [
  { key: 'social_telegram', label: 'Telegram', placeholder: 'https://t.me/aivita_uz' },
  { key: 'social_whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/998...' },
  { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/aivita.uz' },
  { key: 'social_facebook', label: 'Facebook', placeholder: 'https://facebook.com/aivita.uz' },
  { key: 'social_youtube', label: 'YouTube', placeholder: 'https://youtube.com/@aivita' },
];

export default function SocialLinksPage() {
  const [links, setLinks] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['social-links'],
    queryFn: () => api.get<{ links: Record<string, string> }>('/v1/admin/content/social'),
  });

  useEffect(() => {
    if (data?.links) setLinks(data.links);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put('/v1/admin/content/social', links),
    onSuccess: () => toast.success('Социальные ссылки сохранены'),
    onError: () => toast.error('Ошибка при сохранении'),
  });

  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Ссылки на социальные сети</CardTitle>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : (
            SOCIAL_FIELDS.map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  type="url"
                  value={links[f.key] ?? ''}
                  onChange={e => setLinks(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
