'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ChevronDown, ChevronRight, Save, RefreshCw, ExternalLink, Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentRow = {
  id: string;
  section: string;
  key: string;
  locale: string;
  value: string;
  isPublished: boolean;
  updatedAt: string;
};

type Locale = 'ru' | 'uz' | 'en';

const LOCALE_LABELS: Record<Locale, string> = { ru: '🇷🇺 Русский', uz: '🇺🇿 Ўзбекча', en: '🇬🇧 English' };

// Human-readable section names
const SECTION_NAMES: Record<string, string> = {
  nav: 'Навигация', hero: 'Hero (заголовок)', problem: 'Проблема',
  features: 'Возможности', how: 'Как работает', personas: 'Для кого',
  cta: 'CTA (призыв)', faq: 'FAQ', footer: 'Футер', comingSoon: 'Coming Soon',
};

// ─── Field editor ─────────────────────────────────────────────────────────────

function FieldEditor({ row, onSave }: { row: ContentRow; onSave: (id: string, value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.value);
  const isLong = row.value.length > 80 || row.value.includes('\n');

  function handleSave() {
    if (draft.trim() === '') { toast.error('Поле не может быть пустым'); return; }
    if (draft === row.value) { setEditing(false); return; }
    onSave(row.id, draft.trim());
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setDraft(row.value); setEditing(false); }
    if (!isLong && e.key === 'Enter') { handleSave(); }
  }

  return (
    <div className="flex items-start gap-2 group">
      <span className="text-xs text-muted-foreground w-32 shrink-0 pt-1 font-mono truncate" title={row.key}>
        {row.key}
      </span>
      {editing ? (
        <div className="flex-1 space-y-1">
          {isLong ? (
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[80px] resize-y rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          <div className="flex gap-1">
            <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={handleSave}>
              <Save className="h-3 w-3 mr-1" />Сохранить
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
              onClick={() => { setDraft(row.value); setEditing(false); }}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 cursor-pointer rounded px-2 py-1 hover:bg-muted/50 transition-colors text-sm min-h-[28px]"
          onClick={() => { setDraft(row.value); setEditing(true); }}
          title="Нажми для редактирования"
        >
          <span className={row.value ? '' : 'text-muted-foreground italic'}>
            {row.value || '(пусто)'}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Section accordion ────────────────────────────────────────────────────────

function SectionAccordion({ section, rows, onSave }: {
  section: string; rows: ContentRow[]; onSave: (id: string, value: string) => void;
}) {
  const [open, setOpen] = useState(section === 'hero');

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <CardTitle className="text-sm font-medium">
              {SECTION_NAMES[section] ?? section}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">{rows.length} полей</Badge>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 pb-4 space-y-2.5 border-t">
          <div className="pt-3 space-y-2.5">
            {rows.map((row) => (
              <FieldEditor key={row.id} row={row} onSave={onSave} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CmsPage() {
  const [locale, setLocale] = useState<Locale>('ru');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: ContentRow[] }>({
    queryKey: ['cms-content', locale],
    queryFn: () => api.get(`/v1/aivita-admin/cms/content?locale=${locale}`),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      api.patch(`/v1/aivita-admin/cms/content/${id}`, { value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-content', locale] });
      toast.success('Сохранено! Изменения появятся на сайте через 5 минут.', {
        action: { label: 'Сбросить кеш', onClick: () => clearCache() },
      });
    },
    onError: () => toast.error('Ошибка при сохранении'),
  });

  const cacheMutation = useMutation({
    mutationFn: () => api.post('/v1/aivita-admin/cms/cache-clear', { locale }),
    onSuccess: () => toast.success(`Кеш сброшен для [${locale}] — изменения активны`),
    onError: () => toast.error('Ошибка при сбросе кеша'),
  });

  const clearCache = useCallback(() => cacheMutation.mutate(), [cacheMutation]);

  const handleSave = useCallback((id: string, value: string) => {
    saveMutation.mutate({ id, value });
  }, [saveMutation]);

  // Group by section preserving order
  const sections = (data?.data ?? []).reduce<Record<string, ContentRow[]>>((acc, row) => {
    if (!acc[row.section]) acc[row.section] = [];
    acc[row.section].push(row);
    return acc;
  }, {});

  const sectionOrder = ['nav', 'hero', 'problem', 'features', 'how', 'personas', 'cta', 'faq', 'footer', 'comingSoon'];
  const orderedSections = [
    ...sectionOrder.filter((s) => sections[s]),
    ...Object.keys(sections).filter((s) => !sectionOrder.includes(s)),
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" /> CMS — Лендинг aivita.uz
          </h1>
          <p className="text-sm text-muted-foreground">Редактирование текстов лендинга. Клик по полю — редактировать.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="https://aivita.uz" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> Открыть сайт
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={clearCache} disabled={cacheMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1 ${cacheMutation.isPending ? 'animate-spin' : ''}`} />
            Сбросить кеш
          </Button>
        </div>
      </div>

      {/* Locale switcher */}
      <div className="flex gap-2 flex-wrap">
        {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([l, label]) => (
          <Button
            key={l}
            variant={locale === l ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLocale(l)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Info banner */}
      <div className="px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-sm">
        💡 Изменения кешируются на 5 минут. После сохранения нажми <strong>«Сбросить кеш»</strong> для немедленного применения.
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
        </div>
      )}

      {/* Sections */}
      {!isLoading && orderedSections.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Нет контента для языка <strong>{locale}</strong>.</p>
            <p className="text-sm mt-2">Запусти seed-скрипт: <code className="text-xs bg-muted px-1 py-0.5 rounded">pnpm tsx scripts/seed-landing.ts</code></p>
          </CardContent>
        </Card>
      )}

      {!isLoading && orderedSections.map((section) => (
        <SectionAccordion
          key={section}
          section={section}
          rows={sections[section]}
          onSave={handleSave}
        />
      ))}
    </div>
  );
}
