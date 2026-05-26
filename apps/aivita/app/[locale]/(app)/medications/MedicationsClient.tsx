'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { ScheduleItem, MedStats, MedicationRow } from './page';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedMed {
  name: string;
  dosage: string;
  frequency: string;
  durationDays: number | null;
  times: string[];
  foodInstruction: string | null;
  instructions: string | null;
  selected: boolean;
}

interface PharmacyResult {
  productId: number;
  productName: string;
  dosage: string | null;
  form: string | null;
  price: number;
  oldPrice: number | null;
  stock: number | null;
  pharmacyName: string;
  address: string | null;
  lat: string | null;
  lon: string | null;
  phone: string | null;
  isBestPrice: boolean;
}

interface FamilyMember {
  memberId: string;
  memberUserId: string | null;
  memberName: string;
  memberRelation: string;
  medications: Array<{ id: string; title: string; dosage: string | null; times: unknown; endDate: string | null }>;
  todayStats: { taken: number; pending: number; total: number };
}

interface LogEntry {
  log: { id: string; scheduleId: string; userId: string; scheduledAt: string; status: string; takenAt: string | null; note: string | null };
  title: string;
  dosage: string | null;
}

type LogDay = Record<string, LogEntry[]>;

const FOOD_LABELS: Record<string, { label: string; color: string }> = {
  before:    { label: 'до еды',       color: '#f0e8c8' },
  after:     { label: 'после еды',    color: '#c8e8d0' },
  during:    { label: 'во время еды', color: '#c8d8f0' },
  no_alcohol:{ label: 'без алкоголя', color: '#f0c8c8' },
};

const STATUS_DOT: Record<string, string> = {
  taken:   'bg-green-400',
  missed:  'bg-red-400',
  skipped: 'bg-gray-300',
  pending: 'bg-gray-200',
};

function formatPrice(p: number): string {
  return new Intl.NumberFormat('ru-RU').format(p) + ' сум';
}

function courseProgress(med: MedicationRow): { text: string; percent: number } | null {
  if (!med.startDate) return null;
  if (!med.endDate && !med.durationDays) return { text: 'Постоянный приём', percent: 100 };
  const start = new Date(med.startDate).getTime();
  const total = med.durationDays ?? (med.endDate
    ? Math.ceil((new Date(med.endDate).getTime() - start) / 86400000)
    : null);
  if (!total) return null;
  const elapsed = Math.ceil((Date.now() - start) / 86400000);
  const day = Math.min(Math.max(elapsed, 0), total);
  return { text: `${day} / ${total} дней`, percent: Math.round((day / total) * 100) };
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: value ? '#9c5e6c' : '#d0ccc8' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: value ? 'calc(100% - 22px)' : '2px' }}
      />
    </button>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, children, className }: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[12px] font-medium block mb-1.5" style={{ color: '#666' }}>{label}</label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════════

type TabKey = 'meds' | 'add' | 'log' | 'pharmacy' | 'family';

interface Props {
  initialSchedule: ScheduleItem[];
  initialStats: MedStats | null;
  initialMedications: MedicationRow[];
  locale: string;
}

export function MedicationsClient({ initialSchedule, initialStats, initialMedications, locale }: Props) {
  const [tab, setTab] = useState<TabKey>('meds');
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialSchedule);
  const [stats, setStats] = useState<MedStats | null>(initialStats);
  const [medications, setMedications] = useState<MedicationRow[]>(initialMedications);
  const [celebration, setCelebration] = useState(false);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'meds',     label: '💊 Лекарства' },
    { key: 'add',      label: '➕ Добавить'   },
    { key: 'log',      label: '📅 Журнал'     },
    { key: 'pharmacy', label: '🏪 Аптеки'     },
    { key: 'family',   label: '👨‍👩‍👧 Семья'    },
  ];

  async function handleTake(scheduleId: string, time: string) {
    const r = await fetch(`/api/proxy/medications/${scheduleId}/take`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time }),
    });
    if (r.ok) {
      setSchedule((prev) => prev.map((s) =>
        s.scheduleId === scheduleId && s.time === time
          ? { ...s, status: 'taken', takenAt: new Date().toISOString() }
          : s,
      ));
      setCelebration(true);
      setTimeout(() => setCelebration(false), 2000);
      const sr = await fetch('/api/proxy/medications/stats');
      if (sr.ok) {
        const json = await sr.json() as { data: MedStats };
        setStats(json.data);
      }
    }
  }

  async function handleSkip(scheduleId: string, time: string) {
    const r = await fetch(`/api/proxy/medications/${scheduleId}/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time }),
    });
    if (r.ok) {
      setSchedule((prev) => prev.map((s) =>
        s.scheduleId === scheduleId && s.time === time
          ? { ...s, status: 'skipped' }
          : s,
      ));
    }
  }

  return (
    <div style={{ background: '#f4f3ef', minHeight: '100vh' }}>

      {/* Streak banner */}
      {stats && stats.currentStreak > 0 && (
        <div
          className="mx-4 mt-4 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #9c5e6c 0%, #c47a8a 100%)', color: '#fff' }}
        >
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-bold">{stats.currentStreak} дней без пропуска!</p>
            <p className="text-xs opacity-80">Лучший: {stats.longestStreak} дней</p>
          </div>
          {stats.streakBadges && stats.streakBadges.length > 0 && (
            <div className="ml-auto flex gap-1">
              {stats.streakBadges.slice(-3).map((b) => (
                <span key={b.id} className="text-lg" title={b.name}>{b.icon}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats ring */}
      {stats && (
        <div
          className="mx-4 mt-3 rounded-2xl bg-white p-4 flex items-center gap-4"
          style={{ border: '1px solid #e8e4dc' }}
        >
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#f0ede8" strokeWidth="6" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="#9c5e6c" strokeWidth="6"
              strokeDasharray={`${(stats.percent / 100) * 138.2} 138.2`}
              strokeLinecap="round" strokeDashoffset="34.6" transform="rotate(-90 28 28)" />
            <text x="28" y="32" textAnchor="middle" fontSize="13" fontWeight="700" fill="#9c5e6c">
              {stats.percent}%
            </text>
          </svg>
          <div className="flex-1">
            <p className="text-[14px] font-bold" style={{ color: '#2a2540' }}>Соблюдение курса</p>
            <p className="text-[12px]" style={{ color: '#9a96a8' }}>за 7 дней</p>
            <div className="flex gap-3 mt-1.5">
              <span className="text-[11px] text-green-600 font-medium">✓ {stats.taken} принято</span>
              <span className="text-[11px] text-red-500 font-medium">✗ {stats.missed} пропущено</span>
            </div>
          </div>
          <button
            onClick={async () => {
              const r = await fetch('/api/proxy/medications/export-pdf', { method: 'POST' });
              if (r.ok) {
                const json = await r.json() as { data?: { html?: string; filename?: string } };
                const htmlContent = json.data?.html;
                if (htmlContent) {
                  const blob = new Blob([htmlContent], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                }
              }
            }}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: '#f4f3ef', color: '#9c5e6c', border: '1px solid #e8e4dc' }}
          >
            <span>📋</span>
            <span>PDF</span>
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mx-4 mt-4 p-1 rounded-2xl" style={{ background: '#eae8e3' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap"
            style={{
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? '#9c5e6c' : '#9a96a8',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="mt-4 pb-8">
        {tab === 'meds' && (
          <TabMeds
            schedule={schedule}
            medications={medications}
            onTake={handleTake}
            onSkip={handleSkip}
            locale={locale}
          />
        )}
        {tab === 'add' && (
          <TabAdd
            onAdded={(med) => {
              setMedications((prev) => [med, ...prev]);
              setTab('meds');
            }}
          />
        )}
        {tab === 'log'      && <TabLog />}
        {tab === 'pharmacy' && <TabPharmacy />}
        {tab === 'family'   && <TabFamily />}
      </div>

      {/* Celebration */}
      {celebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-7xl animate-bounce drop-shadow-lg">✅</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Лекарства (today schedule + all courses)
// ═══════════════════════════════════════════════════════════════════════════════

function TabMeds({ schedule, medications, onTake, onSkip, locale }: {
  schedule: ScheduleItem[];
  medications: MedicationRow[];
  onTake: (id: string, time: string) => Promise<void>;
  onSkip: (id: string, time: string) => Promise<void>;
  locale: string;
}) {
  const [infoPopup, setInfoPopup] = useState<ScheduleItem | null>(null);
  const [identifyMode, setIdentifyMode] = useState(false);
  const [identifyResult, setIdentifyResult] = useState<{
    name: string | null; description: string; confidence: string;
    sideEffects: string[]; contraindications: string[];
  } | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const periods = ['morning', 'afternoon', 'evening'] as const;
  const periodLabels = { morning: '🌅 Утро', afternoon: '☀️ День', evening: '🌙 Вечер' };

  async function handleIdentify(file: File) {
    setIdentifying(true);
    setIdentifyResult(null);
    try {
      const base64 = await fileToBase64(file);
      const r = await fetch('/api/proxy/medications/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64, mediaType: file.type }),
      });
      if (r.ok) {
        const json = await r.json() as { data: typeof identifyResult };
        setIdentifyResult(json.data);
      }
    } finally {
      setIdentifying(false);
    }
  }

  const hasTodaySchedule = schedule.length > 0;

  return (
    <div className="px-4 space-y-4">

      {/* Today schedule by period */}
      {hasTodaySchedule ? (
        periods.map((period) => {
          const items = schedule.filter((s) => s.period === period);
          if (items.length === 0) return null;
          return (
            <div key={period}>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: '#9a96a8' }}>
                {periodLabels[period]}
              </p>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <MedCard
                    key={i}
                    item={item}
                    onTake={onTake}
                    onSkip={onSkip}
                    onInfo={() => setInfoPopup(item)}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="rounded-2xl bg-white p-6 text-center" style={{ border: '1px solid #e8e4dc' }}>
          <p className="text-3xl mb-2">💊</p>
          <p className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>На сегодня приёмов нет</p>
          <p className="text-[12px] mt-1" style={{ color: '#9a96a8' }}>Добавьте лекарства во вкладке «Добавить»</p>
        </div>
      )}

      {/* All courses list */}
      {medications.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: '#9a96a8' }}>
            📦 Все курсы
          </p>
          <div className="space-y-2">
            {medications.map((med) => {
              const prog = courseProgress(med);
              return (
                <div key={med.id} className="rounded-2xl bg-white p-4"
                  style={{ border: '1px solid #e8e4dc' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-[14px] font-bold" style={{ color: '#2a2540' }}>{med.title}</p>
                      {med.dosage && (
                        <p className="text-[12px]" style={{ color: '#9a96a8' }}>{med.dosage}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {med.remainingPills !== null && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          med.remainingPills >= 7
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {med.remainingPills} шт
                        </span>
                      )}
                      {med.createdBy === 'doctor' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                          🩺 Врач
                        </span>
                      )}
                    </div>
                  </div>

                  {prog && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px]" style={{ color: '#9a96a8' }}>{prog.text}</p>
                        <p className="text-[11px] font-semibold" style={{ color: '#9c5e6c' }}>{prog.percent}%</p>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: '#f0ede8' }}>
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${prog.percent}%`, background: '#9c5e6c' }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {med.foodInstruction && FOOD_LABELS[med.foodInstruction] && (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: FOOD_LABELS[med.foodInstruction].color, color: '#555' }}
                      >
                        {FOOD_LABELS[med.foodInstruction].label}
                      </span>
                    )}
                  </div>

                  {med.remainingPills !== null && med.remainingPills < 7 && (
                    <button
                      onClick={() => {
                        (document.querySelector('[data-tab="pharmacy"]') as HTMLElement)?.click();
                      }}
                      className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold"
                      style={{ color: '#9c5e6c' }}
                    >
                      🛒 Купить в аптеке →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Identify pill card */}
      <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
        <button
          onClick={() => setIdentifyMode(!identifyMode)}
          className="w-full flex items-center gap-3 text-left"
        >
          <span className="text-2xl">📸</span>
          <div>
            <p className="text-[14px] font-bold" style={{ color: '#2a2540' }}>Что за таблетка?</p>
            <p className="text-[12px]" style={{ color: '#9a96a8' }}>AI определит название и состав</p>
          </div>
          <span className="ml-auto text-lg" style={{ color: '#9a96a8' }}>
            {identifyMode ? '↑' : '›'}
          </span>
        </button>

        {identifyMode && (
          <div className="mt-3 space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) void handleIdentify(e.target.files[0]);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={identifying}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {identifying ? '🔍 Определяю...' : '📷 Сфотографировать'}
            </button>

            {identifyResult && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: '#f8f7f5', border: '1px solid #e8e4dc' }}>
                <p className="text-[14px] font-bold" style={{ color: '#2a2540' }}>
                  {identifyResult.name ?? 'Не удалось определить'}
                </p>
                <p className="text-[12px]" style={{ color: '#666' }}>{identifyResult.description}</p>
                {identifyResult.sideEffects.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-red-500 mb-0.5">Побочные эффекты:</p>
                    <p className="text-[11px]" style={{ color: '#666' }}>{identifyResult.sideEffects.join(', ')}</p>
                  </div>
                )}
                <p className="text-[10px]" style={{ color: '#9a96a8' }}>
                  Уверенность: {
                    identifyResult.confidence === 'high' ? 'высокая'
                      : identifyResult.confidence === 'medium' ? 'средняя'
                        : 'низкая'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info bottom sheet */}
      {infoPopup && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setInfoPopup(null)}
        >
          <div
            className="w-full max-w-[480px] mx-auto rounded-t-3xl p-6 space-y-4"
            style={{ background: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[16px] font-bold" style={{ color: '#2a2540' }}>{infoPopup.title}</p>
                {infoPopup.dosage && (
                  <p className="text-[13px]" style={{ color: '#9a96a8' }}>{infoPopup.dosage}</p>
                )}
              </div>
              <button
                onClick={() => setInfoPopup(null)}
                className="text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full"
                style={{ color: '#9a96a8', background: '#f4f3ef' }}
              >×</button>
            </div>
            {infoPopup.foodInstruction && FOOD_LABELS[infoPopup.foodInstruction] && (
              <div>
                <p className="text-[12px] font-semibold mb-1" style={{ color: '#555' }}>Приём с едой</p>
                <span
                  className="text-[12px] px-3 py-1 rounded-full font-medium"
                  style={{ background: FOOD_LABELS[infoPopup.foodInstruction].color, color: '#555' }}
                >
                  {FOOD_LABELS[infoPopup.foodInstruction].label}
                </span>
              </div>
            )}
            {infoPopup.sideEffects.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold mb-1" style={{ color: '#e05555' }}>Побочные эффекты</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {infoPopup.sideEffects.map((s, i) => (
                    <li key={i} className="text-[12px]" style={{ color: '#666' }}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {infoPopup.contraindications.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold mb-1" style={{ color: '#c07000' }}>Противопоказания</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {infoPopup.contraindications.map((s, i) => (
                    <li key={i} className="text-[12px]" style={{ color: '#666' }}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {infoPopup.instructions && (
              <div>
                <p className="text-[12px] font-semibold mb-1" style={{ color: '#555' }}>Инструкции</p>
                <p className="text-[12px]" style={{ color: '#666' }}>{infoPopup.instructions}</p>
              </div>
            )}
            <div className="h-safe-area-inset-bottom" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Med card (today's schedule item) ────────────────────────────────────────

function MedCard({ item, onTake, onSkip, onInfo }: {
  item: ScheduleItem;
  onTake: (id: string, time: string) => Promise<void>;
  onSkip: (id: string, time: string) => Promise<void>;
  onInfo: () => void;
}) {
  const [loading, setLoading] = useState<'take' | 'skip' | null>(null);
  const isTaken   = item.status === 'taken';
  const isSkipped = item.status === 'skipped';
  const isMissed  = item.status === 'missed';

  return (
    <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e8e4dc' }}>
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
          isTaken ? 'bg-green-100' : isMissed ? 'bg-red-100' : 'bg-[#f4f3ef]'
        }`}>
          {isTaken ? '✅' : isMissed ? '⚠️' : '💊'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-bold truncate" style={{ color: '#2a2540' }}>{item.title}</p>
            {item.foodInstruction && FOOD_LABELS[item.foodInstruction] && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: FOOD_LABELS[item.foodInstruction].color, color: '#555' }}
              >
                {FOOD_LABELS[item.foodInstruction].label}
              </span>
            )}
          </div>
          <p className="text-[12px]" style={{ color: '#9a96a8' }}>
            {item.time}{item.dosage ? ` · ${item.dosage}` : ''}
            {isTaken && item.takenAt && (
              ` · принято в ${new Date(item.takenAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
            )}
          </p>
        </div>
        <button
          onClick={onInfo}
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: '#f4f3ef', color: '#9a96a8' }}
        >ℹ</button>
      </div>

      {!isTaken && !isSkipped && (
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={async () => { setLoading('take'); await onTake(item.scheduleId, item.time); setLoading(null); }}
            disabled={loading !== null}
            className="flex-1 py-2 rounded-xl text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ background: '#3a7a5a' }}
          >
            {loading === 'take' ? '…' : '✓ Принял'}
          </button>
          <button
            onClick={async () => { setLoading('skip'); await onSkip(item.scheduleId, item.time); setLoading(null); }}
            disabled={loading !== null}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-60"
            style={{ background: '#f4f3ef', color: '#9a96a8', border: '1px solid #e8e4dc' }}
          >
            Пропустить
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Добавить
// ═══════════════════════════════════════════════════════════════════════════════

function TabAdd({ onAdded }: { onAdded: (med: MedicationRow) => void }) {
  const [mode, setMode] = useState<'menu' | 'receipt' | 'manual'>('menu');
  const [receiptParsed, setReceiptParsed] = useState<ParsedMed[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', dosage: '', frequency: '1 раз в день',
    times: ['08:00'], durationDays: '',
    startDate: new Date().toISOString().split('T')[0],
    foodInstruction: '', reminderEnabled: true,
    persistentReminder: false, instructions: '', remainingPills: '',
  });

  async function handleReceiptPhoto(file: File) {
    setParsing(true);
    try {
      const base64 = await fileToBase64(file);
      const r = await fetch('/api/proxy/medications/parse-receipt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64, mediaType: file.type }),
      });
      if (r.ok) {
        const json = await r.json() as { data: Array<Omit<ParsedMed, 'selected'>> };
        setReceiptParsed((json.data || []).map((m) => ({ ...m, selected: true })));
        setMode('receipt');
      }
    } finally {
      setParsing(false);
    }
  }

  async function addReceiptMeds() {
    const selected = receiptParsed.filter((m) => m.selected);
    if (selected.length === 0) return;
    setSaving(true);
    try {
      for (const med of selected) {
        await fetch('/api/proxy/medications', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: med.name, dosage: med.dosage, frequency: med.frequency,
            times: med.times, durationDays: med.durationDays,
            foodInstruction: med.foodInstruction, instructions: med.instructions,
            source: 'receipt_ocr',
          }),
        });
      }
    } finally {
      setSaving(false);
      setMode('menu');
      setReceiptParsed([]);
    }
  }

  async function addManual() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const r = await fetch('/api/proxy/medications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, dosage: form.dosage || null, frequency: form.frequency,
          times: form.times, durationDays: form.durationDays ? parseInt(form.durationDays) : null,
          startDate: form.startDate, foodInstruction: form.foodInstruction || null,
          reminderEnabled: form.reminderEnabled, persistentReminder: form.persistentReminder,
          instructions: form.instructions || null,
          remainingPills: form.remainingPills ? parseInt(form.remainingPills) : null,
          source: 'manual',
        }),
      });
      if (r.ok) {
        const json = await r.json() as { data: MedicationRow };
        onAdded(json.data);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Receipt mode ────────────────────────────────────────────────────────────
  if (mode === 'receipt') {
    return (
      <div className="px-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('menu')} className="text-[13px] font-medium" style={{ color: '#9c5e6c' }}>
            ← Назад
          </button>
          <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>Распознано из рецепта</p>
        </div>

        {receiptParsed.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: '#9a96a8' }}>Ничего не найдено на фото</p>
          </div>
        ) : (
          <div className="space-y-2">
            {receiptParsed.map((med, i) => (
              <label
                key={i}
                className="flex items-start gap-3 rounded-2xl bg-white p-4 cursor-pointer"
                style={{ border: '1px solid #e8e4dc' }}
              >
                <input
                  type="checkbox"
                  checked={med.selected}
                  onChange={(e) => setReceiptParsed((prev) => prev.map((m, j) =>
                    j === i ? { ...m, selected: e.target.checked } : m,
                  ))}
                  className="mt-0.5 w-4 h-4 accent-[#9c5e6c]"
                />
                <div className="flex-1">
                  <p className="text-[14px] font-bold" style={{ color: '#2a2540' }}>{med.name}</p>
                  <p className="text-[12px]" style={{ color: '#9a96a8' }}>
                    {med.dosage}{med.frequency ? ` · ${med.frequency}` : ''}
                    {med.durationDays ? ` · ${med.durationDays} дней` : ''}
                  </p>
                  {med.foodInstruction && FOOD_LABELS[med.foodInstruction] && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block"
                      style={{ background: FOOD_LABELS[med.foodInstruction].color, color: '#555' }}
                    >
                      {FOOD_LABELS[med.foodInstruction].label}
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        <button
          onClick={() => void addReceiptMeds()}
          disabled={saving || !receiptParsed.some((m) => m.selected)}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {saving ? 'Добавляю...' : `Добавить выбранные (${receiptParsed.filter((m) => m.selected).length})`}
        </button>
      </div>
    );
  }

  // ── Manual form ─────────────────────────────────────────────────────────────
  if (mode === 'manual') {
    return (
      <div className="px-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('menu')} className="text-[13px] font-medium" style={{ color: '#9c5e6c' }}>
            ← Назад
          </button>
          <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>Добавить вручную</p>
        </div>

        <div className="rounded-2xl bg-white p-5 space-y-4" style={{ border: '1px solid #e8e4dc' }}>
          <Field label="Название *">
            <input
              type="text" placeholder="Парацетамол, Аспирин..." value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none"
              style={{ borderColor: '#e8e4dc' }}
            />
          </Field>

          <Field label="Дозировка">
            <input
              type="text" placeholder="500 мг, 1 таблетка..." value={form.dosage}
              onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
              className="w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none"
              style={{ borderColor: '#e8e4dc' }}
            />
          </Field>

          <Field label="Частота">
            <select
              value={form.frequency}
              onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
              className="w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none bg-white"
              style={{ borderColor: '#e8e4dc' }}
            >
              {['1 раз в день','2 раза в день','3 раза в день','По необходимости','Постоянно'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </Field>

          <Field label="Время приёма">
            <div className="flex flex-wrap gap-2">
              {form.times.map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    type="time" value={t}
                    onChange={(e) => setForm((f) => ({
                      ...f, times: f.times.map((tt, j) => j === i ? e.target.value : tt),
                    }))}
                    className="text-sm border rounded-xl px-2 py-1.5 focus:outline-none"
                    style={{ borderColor: '#e8e4dc' }}
                  />
                  {form.times.length > 1 && (
                    <button
                      onClick={() => setForm((f) => ({ ...f, times: f.times.filter((_, j) => j !== i) }))}
                      className="text-red-400 text-sm w-5 h-5"
                    >✕</button>
                  )}
                </div>
              ))}
              {form.times.length < 4 && (
                <button
                  onClick={() => setForm((f) => ({ ...f, times: [...f.times, '12:00'] }))}
                  className="text-[12px] px-2 py-1 rounded-lg"
                  style={{ background: '#f4f3ef', color: '#9c5e6c' }}
                >+ Время</button>
              )}
            </div>
          </Field>

          <div className="flex gap-3">
            <Field label="Начало курса" className="flex-1">
              <input
                type="date" value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none"
                style={{ borderColor: '#e8e4dc' }}
              />
            </Field>
            <Field label="Дней курса" className="flex-1">
              <input
                type="number" placeholder="14" value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
                className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none"
                style={{ borderColor: '#e8e4dc' }}
              />
            </Field>
          </div>

          <Field label="Приём с едой">
            <div className="flex flex-wrap gap-2">
              {(['', 'before', 'after', 'during', 'no_alcohol'] as const).map((v) => (
                <button
                  key={v || 'none'}
                  onClick={() => setForm((f) => ({ ...f, foodInstruction: v }))}
                  className="px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all"
                  style={{
                    background: form.foodInstruction === v ? 'var(--accent)' : '#f4f3ef',
                    color: form.foodInstruction === v ? '#fff' : '#666',
                    borderColor: form.foodInstruction === v ? 'var(--accent)' : '#e8e4dc',
                  }}
                >
                  {v === '' ? 'Не указано' : FOOD_LABELS[v].label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Остаток таблеток">
            <input
              type="number" placeholder="20" value={form.remainingPills}
              onChange={(e) => setForm((f) => ({ ...f, remainingPills: e.target.value }))}
              className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none"
              style={{ borderColor: '#e8e4dc' }}
            />
          </Field>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>Напоминания</p>
              <p className="text-[11px]" style={{ color: '#9a96a8' }}>Уведомления в выбранное время</p>
            </div>
            <Toggle value={form.reminderEnabled}
              onChange={(v) => setForm((f) => ({ ...f, reminderEnabled: v }))} />
          </div>

          {form.reminderEnabled && (
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>Настойчивые напоминания</p>
                <p className="text-[11px]" style={{ color: '#9a96a8' }}>Повтор через 15 и 30 мин</p>
              </div>
              <Toggle value={form.persistentReminder}
                onChange={(v) => setForm((f) => ({ ...f, persistentReminder: v }))} />
            </div>
          )}

          <Field label="Доп. инструкции">
            <textarea
              placeholder="Особые указания..." value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              rows={2}
              className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none resize-none"
              style={{ borderColor: '#e8e4dc' }}
            />
          </Field>
        </div>

        <button
          onClick={() => void addManual()}
          disabled={saving || !form.title.trim()}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {saving ? 'Сохраняю...' : 'Добавить лекарство'}
        </button>
      </div>
    );
  }

  // ── Menu ────────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 space-y-3">
      <input
        ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) void handleReceiptPhoto(e.target.files[0]); }}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={parsing}
        className="w-full flex items-center gap-4 rounded-2xl bg-white p-4"
        style={{ border: '1px solid #e8e4dc', textAlign: 'left' }}
      >
        <span className="text-3xl">📷</span>
        <div className="flex-1">
          <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>
            {parsing ? 'Распознаю рецепт...' : 'Фото рецепта'}
          </p>
          <p className="text-[12px]" style={{ color: '#9a96a8' }}>AI распознает все лекарства из рецепта</p>
        </div>
        <span className="text-lg" style={{ color: '#9a96a8' }}>›</span>
      </button>

      <button
        onClick={() => setMode('manual')}
        className="w-full flex items-center gap-4 rounded-2xl bg-white p-4"
        style={{ border: '1px solid #e8e4dc', textAlign: 'left' }}
      >
        <span className="text-3xl">✏️</span>
        <div className="flex-1">
          <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>Добавить вручную</p>
          <p className="text-[12px]" style={{ color: '#9a96a8' }}>Название, дозировка, расписание</p>
        </div>
        <span className="text-lg" style={{ color: '#9a96a8' }}>›</span>
      </button>

      <div className="w-full flex items-center gap-4 rounded-2xl bg-white p-4 opacity-50"
        style={{ border: '1px solid #e8e4dc' }}>
        <span className="text-3xl">💬</span>
        <div className="flex-1">
          <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>Из чата с врачом</p>
          <p className="text-[12px]" style={{ color: '#9a96a8' }}>Скоро: назначения из переписки</p>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: '#e8e4dc', color: '#9a96a8' }}>Скоро</span>
      </div>

      <div className="w-full flex items-center gap-4 rounded-2xl bg-white p-4 opacity-50"
        style={{ border: '1px solid #e8e4dc' }}>
        <span className="text-3xl">🏥</span>
        <div className="flex-1">
          <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>Из клиники</p>
          <p className="text-[12px]" style={{ color: '#9a96a8' }}>Подключите клинику через MedSoft</p>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: '#e8e4dc', color: '#9a96a8' }}>Скоро</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Журнал
// ═══════════════════════════════════════════════════════════════════════════════

function TabLog() {
  const [logData, setLogData] = useState<LogDay>({});
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [loading, setLoading] = useState(true);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/proxy/medications/log');
        if (r.ok) setLogData((await r.json() as { data: LogDay }).data ?? {});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function dayStatus(date: string): 'good' | 'bad' | 'mixed' | 'empty' {
    const entries = logData[date] ?? [];
    if (entries.length === 0) return 'empty';
    const taken = entries.filter((e) => e.log.status === 'taken').length;
    if (taken === entries.length) return 'good';
    if (taken === 0) return 'bad';
    return 'mixed';
  }

  const dayEntries = logData[selectedDate] ?? [];

  return (
    <div className="px-4 space-y-4">
      {/* 7-day strip */}
      <div className="rounded-2xl bg-white p-4" style={{ border: '1px solid #e8e4dc' }}>
        <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: '#9a96a8' }}>
          Последние 7 дней
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((date) => {
            const status = dayStatus(date);
            const isSelected = date === selectedDate;
            const d = new Date(date);
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 px-3 py-2.5 rounded-xl transition-all"
                style={{
                  background: isSelected ? 'var(--accent)' : '#f8f7f5',
                  minWidth: 48,
                }}
              >
                <span className="text-[10px]"
                  style={{ color: isSelected ? 'rgba(255,255,255,0.75)' : '#9a96a8' }}>
                  {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
                </span>
                <span className="text-[15px] font-bold"
                  style={{ color: isSelected ? '#fff' : '#2a2540' }}>
                  {d.getDate()}
                </span>
                <div className={`w-2 h-2 rounded-full ${
                  status === 'good'  ? 'bg-green-400' :
                  status === 'bad'   ? 'bg-red-400'   :
                  status === 'mixed' ? 'bg-amber-400'  :
                  isSelected ? 'bg-white opacity-40' : 'bg-gray-200'
                }`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      <div>
        <p className="text-[13px] font-bold mb-2" style={{ color: '#2a2540' }}>
          {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
        </p>
        {loading ? (
          <div className="text-center py-8 text-sm" style={{ color: '#9a96a8' }}>Загружаю...</div>
        ) : dayEntries.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center" style={{ border: '1px solid #e8e4dc' }}>
            <p className="text-sm" style={{ color: '#9a96a8' }}>Нет записей за этот день</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayEntries.map((entry, i) => (
              <div key={i} className="rounded-xl bg-white flex items-center gap-3 px-4 py-3"
                style={{ border: '1px solid #e8e4dc' }}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[entry.log.status] ?? 'bg-gray-200'}`} />
                <div className="flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>{entry.title}</p>
                  {entry.dosage && (
                    <p className="text-[11px]" style={{ color: '#9a96a8' }}>{entry.dosage}</p>
                  )}
                </div>
                <span className="text-[12px] font-medium" style={{
                  color: entry.log.status === 'taken' ? '#3a7a5a'
                    : entry.log.status === 'missed' ? '#c0392b'
                      : '#9a96a8',
                }}>
                  {entry.log.status === 'taken' ? '✓ Принял'
                    : entry.log.status === 'skipped' ? '— Пропустил'
                      : entry.log.status === 'missed' ? '✗ Пропущено'
                        : 'Ожидает'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Аптеки
// ═══════════════════════════════════════════════════════════════════════════════

function TabPharmacy() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PharmacyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {},
      );
    }
  }, []);

  function distanceKm(lat: string | null, lon: string | null): number | null {
    if (!userPos || !lat || !lon) return null;
    const R = 6371;
    const lat1 = userPos.lat * (Math.PI / 180);
    const lat2 = parseFloat(lat) * (Math.PI / 180);
    const dLat = lat2 - lat1;
    const dLon = (parseFloat(lon) - userPos.lon) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async function search() {
    if (query.trim().length < 2) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/proxy/medications/pharmacy/search?drug=${encodeURIComponent(query.trim())}`);
      if (r.ok) setResults((await r.json() as { data: PharmacyResult[] }).data ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Поиск лекарства в аптеках..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void search(); }}
          className="flex-1 text-sm border rounded-2xl px-4 py-3 focus:outline-none"
          style={{ borderColor: '#e8e4dc', background: '#fff' }}
        />
        <button
          onClick={() => void search()}
          disabled={loading || query.trim().length < 2}
          className="px-5 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {loading ? '⏳' : '🔍'}
        </button>
      </div>

      {results.length === 0 && !loading && query.trim().length >= 2 && (
        <div className="rounded-2xl bg-white p-6 text-center" style={{ border: '1px solid #e8e4dc' }}>
          <p className="text-sm" style={{ color: '#9a96a8' }}>Ничего не найдено</p>
          <p className="text-xs mt-1" style={{ color: '#c0bdb8' }}>Попробуйте другое название или МНН</p>
        </div>
      )}

      <div className="space-y-2">
        {results.map((r, i) => {
          const dist = distanceKm(r.lat, r.lon);
          return (
            <div
              key={i}
              className="rounded-2xl bg-white p-4 space-y-2"
              style={{ border: r.isBestPrice ? '2px solid #3a7a5a' : '1px solid #e8e4dc' }}
            >
              {r.isBestPrice && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#e8f4ee', color: '#3a7a5a' }}>
                  🏆 ЛУЧШАЯ ЦЕНА
                </span>
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-bold" style={{ color: '#2a2540' }}>{r.productName}</p>
                  {(r.dosage || r.form) && (
                    <p className="text-[12px]" style={{ color: '#9a96a8' }}>
                      {[r.dosage, r.form].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[16px] font-bold" style={{ color: '#9c5e6c' }}>{formatPrice(r.price)}</p>
                  {r.oldPrice && r.oldPrice > r.price && (
                    <p className="text-[11px] line-through" style={{ color: '#9a96a8' }}>{formatPrice(r.oldPrice)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[12px]" style={{ color: '#666' }}>
                <span>🏪 {r.pharmacyName}</span>
                {r.address && (
                  <span>· 📍 {r.address.length > 35 ? r.address.slice(0, 35) + '…' : r.address}</span>
                )}
              </div>

              {dist !== null && (
                <p className="text-[11px]" style={{ color: '#9a96a8' }}>
                  📏 {dist < 1 ? `${Math.round(dist * 1000)} м` : `${dist.toFixed(1)} км`} от вас
                </p>
              )}

              {r.stock !== null && r.stock > 0 && r.stock <= 5 && (
                <p className="text-[11px] font-medium" style={{ color: '#c07000' }}>
                  ⚠️ Осталось {r.stock} шт
                </p>
              )}

              <div className="flex gap-2 mt-1">
                {r.lat && r.lon && (
                  <a
                    href={`https://maps.google.com/?q=${r.lat},${r.lon}`}
                    target="_blank" rel="noreferrer"
                    className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-center"
                    style={{ background: '#f0f4ff', color: '#4466aa', border: '1px solid #dde4f0' }}
                  >
                    📍 На карте
                  </a>
                )}
                {r.phone && (
                  <a
                    href={`tel:${r.phone}`}
                    className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-center"
                    style={{ background: '#f0faf4', color: '#3a7a5a', border: '1px solid #c0e8d0' }}
                  >
                    📞 Позвонить
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5 — Семья
// ═══════════════════════════════════════════════════════════════════════════════

function TabFamily() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/proxy/medications/family');
        if (r.ok) setMembers((await r.json() as { data: FamilyMember[] }).data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm" style={{ color: '#9a96a8' }}>Загружаю...</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="px-4">
        <div className="rounded-2xl bg-white p-8 text-center" style={{ border: '1px solid #e8e4dc' }}>
          <span className="text-4xl block mb-3">👨‍👩‍👧</span>
          <p className="text-[15px] font-bold mb-1" style={{ color: '#2a2540' }}>Нет членов семьи</p>
          <p className="text-[13px]" style={{ color: '#9a96a8' }}>Добавьте семью в разделе «Семья»</p>
          <Link href="/family"
            className="inline-block mt-3 text-[13px] font-semibold"
            style={{ color: '#9c5e6c' }}>
            Перейти →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {members.map((m) => {
        const allTaken = m.todayStats.total > 0
          && m.todayStats.taken === m.todayStats.total;
        const isExpanded = expanded === m.memberId;

        return (
          <div key={m.memberId} className="rounded-2xl bg-white overflow-hidden"
            style={{ border: '1px solid #e8e4dc' }}>
            <button
              className="w-full flex items-center gap-3 px-4 py-3"
              onClick={() => setExpanded(isExpanded ? null : m.memberId)}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)' }}
              >
                {m.memberName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="text-[14px] font-bold" style={{ color: '#2a2540' }}>{m.memberName}</p>
                <p className="text-[12px]" style={{ color: '#9a96a8' }}>{m.memberRelation}</p>
              </div>
              <div className="text-right mr-2">
                {m.todayStats.total === 0 ? (
                  <span className="text-[11px]" style={{ color: '#9a96a8' }}>нет лекарств</span>
                ) : allTaken ? (
                  <span className="text-[11px] font-bold text-green-600">✓ Все приняты</span>
                ) : m.todayStats.pending > 0 ? (
                  <span className="text-[11px] font-bold" style={{ color: '#c07000' }}>
                    {m.todayStats.pending} ожидает
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-red-500">
                    {m.todayStats.total - m.todayStats.taken} пропущено
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ color: '#9a96a8' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="border-t px-4 pb-3 pt-2 space-y-2" style={{ borderColor: '#f0ede8' }}>
                {m.medications.length === 0 ? (
                  <p className="text-[12px]" style={{ color: '#9a96a8' }}>Нет активных лекарств</p>
                ) : (
                  m.medications.map((med) => (
                    <div key={med.id} className="flex items-center gap-2">
                      <span className="text-sm">💊</span>
                      <div className="flex-1">
                        <p className="text-[13px] font-medium" style={{ color: '#2a2540' }}>{med.title}</p>
                        {med.dosage && (
                          <p className="text-[11px]" style={{ color: '#9a96a8' }}>{med.dosage}</p>
                        )}
                      </div>
                      {med.endDate && (
                        <span className="text-[11px]" style={{ color: '#9a96a8' }}>
                          до {new Date(med.endDate).toLocaleDateString('ru-RU', {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
                      )}
                    </div>
                  ))
                )}

                {m.memberUserId && m.todayStats.pending > 0 && (
                  <button
                    onClick={async () => {
                      await fetch('/api/proxy/notifications/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: m.memberUserId,
                          type: 'medication_reminder',
                          message: `Не забудь принять лекарства! Осталось: ${m.todayStats.pending}`,
                        }),
                      }).catch(() => {});
                      alert(`Напоминание отправлено ${m.memberName}`);
                    }}
                    className="w-full mt-1 py-2 rounded-xl text-[12px] font-semibold"
                    style={{ background: '#f4f3ef', color: '#9c5e6c', border: '1px solid #e8e4dc' }}
                  >
                    🔔 Напомнить {m.memberName}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
