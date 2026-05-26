'use client';

import { useState } from 'react';
import type { MedicalHistoryEntry } from './page';

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  illness:   { label: 'Болезнь',   icon: '🤒', color: 'bg-red-50    border-red-100    text-red-700'   },
  surgery:   { label: 'Операция',  icon: '🏥', color: 'bg-blue-50   border-blue-100   text-blue-700'  },
  injury:    { label: 'Травма',    icon: '🩹', color: 'bg-amber-50  border-amber-100  text-amber-700' },
  pregnancy: { label: 'Беременность', icon: '🤰', color: 'bg-pink-50 border-pink-100 text-pink-700'  },
  other:     { label: 'Другое',    icon: '📋', color: 'bg-gray-50   border-gray-100   text-gray-700'  },
};

const TYPES = Object.keys(TYPE_LABELS) as MedicalHistoryEntry['type'][];

function formatDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function groupByYear(entries: MedicalHistoryEntry[]): Map<string, MedicalHistoryEntry[]> {
  const map = new Map<string, MedicalHistoryEntry[]>();
  for (const e of entries) {
    const year = e.startDate
      ? new Date(e.startDate).getFullYear().toString()
      : new Date(e.createdAt).getFullYear().toString();
    const list = map.get(year) ?? [];
    list.push(e);
    map.set(year, list);
  }
  // Sort years descending
  return new Map([...map.entries()].sort(([a], [b]) => Number(b) - Number(a)));
}

const EMPTY_FORM: Partial<MedicalHistoryEntry> = {
  name: '', type: 'illness', startDate: '', endDate: '', notes: '',
};

export function MedicalHistoryClient({ initialEntries }: { initialEntries: MedicalHistoryEntry[] }) {
  const [entries, setEntries] = useState<MedicalHistoryEntry[]>(
    [...initialEntries].sort((a, b) => {
      const da = a.startDate ?? a.createdAt;
      const db_ = b.startDate ?? b.createdAt;
      return db_.localeCompare(da);
    })
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<MedicalHistoryEntry>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const grouped = groupByYear(entries);

  async function handleAdd() {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/health-profile/medical-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type ?? 'other',
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          notes: form.notes || null,
        }),
      });
      const json = await res.json() as { data?: MedicalHistoryEntry };
      if (json.data) {
        setEntries((prev) => [json.data!, ...prev]);
        setForm(EMPTY_FORM);
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/proxy/health-profile/medical-history/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">История болезней</h1>
          <p className="text-sm text-gray-400 mt-0.5">Хронология вашего здоровья</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Добавить
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Новая запись</h2>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Название *</label>
            <input
              type="text"
              placeholder="Например: Аппендицит, Пневмония..."
              value={form.name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Тип</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => {
                const info = TYPE_LABELS[t];
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}
                  >
                    {info.icon} {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 block mb-1">Начало</label>
              <input
                type="date"
                value={form.startDate ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 block mb-1">Конец</label>
              <input
                type="date"
                value={form.endDate ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Заметки</label>
            <textarea
              placeholder="Симптомы, лечение, результаты..."
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={() => void handleAdd()}
              disabled={saving || !form.name?.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4">📋</span>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">История пустая</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            Добавьте записи о перенесённых болезнях, операциях и травмах — это поможет врачам лучше понять ваше здоровье.
          </p>
        </div>
      )}

      {/* Timeline grouped by year */}
      {[...grouped.entries()].map(([year, yearEntries]) => (
        <div key={year}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs font-bold text-gray-400 px-2">{year}</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="relative pl-6 space-y-3">
            {/* Timeline line */}
            <div className="absolute left-2 top-1 bottom-1 w-px bg-gray-100" />

            {yearEntries.map((entry) => {
              const info = TYPE_LABELS[entry.type] ?? TYPE_LABELS.other;
              const isExpanded = expandedId === entry.id;

              return (
                <div key={entry.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-4 top-3.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-gray-300 shadow-sm" />

                  <div
                    className={`rounded-xl border bg-white overflow-hidden cursor-pointer transition-shadow hover:shadow-sm ${info.color.split(' ').filter(c => c.startsWith('border')).join(' ')}`}
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl flex-shrink-0">{info.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{entry.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {info.label}
                          {entry.startDate && ` · ${formatDate(entry.startDate)}`}
                          {entry.endDate && ` — ${formatDate(entry.endDate)}`}
                        </p>
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2 border-t border-gray-50">
                        {entry.notes && (
                          <p className="text-sm text-gray-600 mt-3 leading-relaxed">{entry.notes}</p>
                        )}
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleDelete(entry.id); }}
                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                          >
                            Удалить запись
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
