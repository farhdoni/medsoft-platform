'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { DailyMetrics } from '@/lib/cabinet-types';
import Modal from '@/components/ui/Modal';
import { VITAL_CONFIG, AddVitalModal } from '@/components/cabinet/dashboard/HomeVitals';

// ─── Types ────────────────────────────────────────────────────────────────────

type LatestVitals = Record<string, { value: Record<string, unknown>; recordedAt: string } | null>;

interface Props {
  metrics: DailyMetrics;
  vitalsLatest: LatestVitals;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const LS_KEY = 'aivita_quick_stats';
const DEFAULT_STATS = ['heart_rate', 'water_ml', 'steps', 'habits'];
const DAY_MS = 24 * 60 * 60 * 1000;

export const ALL_QUICK_STATS = [
  { key: 'heart_rate',     icon: '❤️',  unit: 'bpm'   },
  { key: 'blood_pressure', icon: '🩺',  unit: 'mmHg'  },
  { key: 'glucose',        icon: '🍬',  unit: 'мг/дл' },
  { key: 'weight',         icon: '⚖️',  unit: 'кг'    },
  { key: 'spo2',           icon: '🫁',  unit: '%'     },
  { key: 'sleep_hours',    icon: '😴',  unit: 'ч'     },
  { key: 'steps',          icon: '🏃',  unit: ''      },
  { key: 'water_ml',       icon: '💧',  unit: 'мл'    },
  { key: 'temperature',    icon: '🌡️', unit: '°C'    },
  { key: 'habits',         icon: '📋',  unit: ''      },
];

const CARD_BG: Record<string, string> = {
  heart_rate:     '#fdf0f3',
  blood_pressure: '#f0eef8',
  glucose:        '#fdf0f3',
  weight:         '#f4f3ef',
  spo2:           '#eef8f2',
  sleep_hours:    '#f0eef8',
  steps:          '#eef8f2',
  water_ml:       '#f0eef8',
  temperature:    '#fdf0f3',
  habits:         '#eef4fc',
};

const CARD_COLOR: Record<string, string> = {
  heart_rate:     'var(--accent)',
  blood_pressure: '#7b68c8',
  glucose:        'var(--accent)',
  weight:         '#6a6580',
  spo2:           '#3aa86a',
  sleep_hours:    '#7b68c8',
  steps:          '#3aa86a',
  water_ml:       '#7b68c8',
  temperature:    'var(--accent)',
  habits:         '#5e88c4',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isFresh(row: LatestVitals[string]): boolean {
  if (!row) return false;
  return Date.now() - new Date(row.recordedAt).getTime() < DAY_MS;
}

function getCardData(
  key: string,
  vitals: LatestVitals,
  metrics: DailyMetrics,
  units: { steps: string; water: string },
): { value: string; meta: string } {
  const row = vitals[key];
  const fresh = isFresh(row);

  switch (key) {
    case 'heart_rate': {
      const bpm = fresh
        ? (row!.value as { value?: number }).value
        : metrics.heartRate.bpm;
      return { value: bpm != null ? `${bpm}` : '—', meta: 'bpm' };
    }
    case 'water_ml': {
      if (fresh) {
        const ml = (row!.value as { value?: number }).value;
        return { value: ml != null ? `${ml}` : '—', meta: units.water };
      }
      return { value: `${metrics.water.liters}л`, meta: `${metrics.water.liters}/${metrics.water.goalLiters}` };
    }
    case 'steps': {
      const count = fresh
        ? (row!.value as { value?: number }).value
        : metrics.steps.count;
      if (count == null) return { value: '—', meta: units.steps };
      return { value: count >= 1000 ? `${(count / 1000).toFixed(1)}K` : `${count}`, meta: units.steps };
    }
    case 'habits': {
      const pct = metrics.habits.total > 0
        ? Math.round((metrics.habits.completed / metrics.habits.total) * 100)
        : 0;
      return { value: `${metrics.habits.completed}/${metrics.habits.total}`, meta: `${pct}%` };
    }
    case 'blood_pressure': {
      if (fresh) {
        const sys = (row!.value as { systolic?: number }).systolic;
        const dia = (row!.value as { diastolic?: number }).diastolic;
        if (sys != null && dia != null) return { value: `${sys}/${dia}`, meta: 'mmHg' };
      }
      return { value: '—', meta: 'mmHg' };
    }
    case 'sleep_hours': {
      if (fresh) {
        const h = (row!.value as { hours?: number; value?: number }).hours
          ?? (row!.value as { value?: number }).value;
        if (h != null) return { value: h % 1 === 0 ? `${h}` : h.toFixed(1), meta: 'ч' };
      }
      return { value: '—', meta: 'ч' };
    }
    default: {
      if (fresh) {
        const v = (row!.value as { value?: number }).value;
        if (v != null) {
          const cfg = ALL_QUICK_STATS.find(s => s.key === key);
          const disp = Number.isInteger(v) ? `${v}` : v.toFixed(1);
          return { value: disp, meta: cfg?.unit ?? '' };
        }
      }
      return { value: '—', meta: ALL_QUICK_STATS.find(s => s.key === key)?.unit ?? '' };
    }
  }
}

function loadConfig(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return DEFAULT_STATS;
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function QuickStatsSettingsModal({
  selected,
  onClose,
  onChange,
}: {
  selected: string[];
  onClose: () => void;
  onChange: (keys: string[]) => void;
}) {
  const t = useTranslations('app.metrics');
  const [picks, setPicks] = useState<string[]>(selected);

  function toggle(key: string) {
    setPicks(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : prev.length < 5 ? [...prev, key] : prev,
    );
  }

  function handleSave() {
    const result = picks.length >= 1 ? picks : DEFAULT_STATS;
    try { localStorage.setItem(LS_KEY, JSON.stringify(result)); } catch {}
    onChange(result);
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('settingsTitle')}
      footer={
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
        >
          {t('saveButton')}
        </button>
      }
    >
      <p className="text-xs text-app-t3 mb-4">
        {t('settingsHint')}
        <span className="ml-1 font-semibold">({picks.length}/5)</span>
      </p>
      <div className="space-y-2">
        {ALL_QUICK_STATS.map(s => {
          const on = picks.includes(s.key);
          const disabled = !on && picks.length >= 5;
          return (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              disabled={disabled}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left disabled:opacity-40"
              style={{
                background: on ? 'var(--accent-bg-light)' : '#f4f3ef',
                border: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
              }}
            >
              <span className="text-lg w-7 text-center">{s.icon}</span>
              <span className="flex-1 text-sm font-semibold" style={{ color: '#2a2540' }}>
                {t(s.key as Parameters<typeof t>[0])}
              </span>
              <div
                className="w-11 h-6 rounded-full flex items-center px-1 transition-all flex-shrink-0"
                style={{ background: on ? 'var(--accent-dark)' : '#d0ccc4' }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white transition-all"
                  style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MetricsRow({ metrics, vitalsLatest }: Props) {
  const t = useTranslations('app.metrics');
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ru';

  const [config, setConfig] = useState<string[]>(DEFAULT_STATS);
  const [latestOverride, setLatestOverride] = useState<LatestVitals>(vitalsLatest);
  const [showSettings, setShowSettings] = useState(false);
  const [activeVital, setActiveVital] = useState<string | null>(null);

  useEffect(() => { setConfig(loadConfig()); }, []);

  function handleCardClick(key: string) {
    if (key === 'habits') {
      router.push(`/${locale}/habits`);
      return;
    }
    if (VITAL_CONFIG[key]) {
      setActiveVital(key);
    }
  }

  function handleSaved(type: string, displayVal: string) {
    let optimisticValue: Record<string, unknown>;
    if (type === 'blood_pressure') {
      const [sys, dia] = displayVal.split('/').map(Number);
      optimisticValue = { systolic: sys, diastolic: dia };
    } else if (type === 'sleep_hours') {
      optimisticValue = { hours: parseFloat(displayVal) };
    } else {
      optimisticValue = { value: parseFloat(displayVal), unit: VITAL_CONFIG[type]?.unit ?? '' };
    }
    setLatestOverride(prev => ({
      ...prev,
      [type]: { value: optimisticValue, recordedAt: new Date().toISOString() },
    }));
    setActiveVital(null);
    router.refresh();
  }

  const shown = config.filter(k => ALL_QUICK_STATS.find(s => s.key === k));
  const units = { steps: t('stepsUnit'), water: t('waterUnit') };

  return (
    <section className="px-7 pt-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#9a96a8' }}>
          {t('sectionTitle')}
        </p>
        <button
          onClick={() => setShowSettings(true)}
          className="text-[11px] font-semibold transition-opacity hover:opacity-70 flex items-center gap-1"
          style={{ color: 'var(--accent)' }}
        >
          ⚙️ {t('configure')}
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {shown.map(key => {
          const meta = ALL_QUICK_STATS.find(s => s.key === key);
          if (!meta) return null;
          const label = t(key as Parameters<typeof t>[0]);
          const { value, meta: sub } = getCardData(key, latestOverride, metrics, units);
          const bg    = CARD_BG[key]    ?? '#f4f3ef';
          const color = CARD_COLOR[key] ?? '#6a6580';
          const clickable = key !== 'habits' ? VITAL_CONFIG[key] : true;

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleCardClick(key)}
              className="relative flex min-h-[110px] flex-col justify-between rounded-card p-4 text-left transition-all active:scale-[0.97] group hover:brightness-95"
              style={{ background: bg }}
              aria-label={label}
            >
              {/* Edit hint */}
              {clickable && (
                <span
                  className="absolute top-2 right-2 text-[11px] opacity-0 group-hover:opacity-40 transition-opacity"
                  style={{ color }}
                >
                  ✎
                </span>
              )}

              {/* Top */}
              <div className="flex items-start justify-between">
                <span className="text-[26px] leading-none">{meta.icon}</span>
                <span className="text-[10px] font-semibold" style={{ color }}>{sub}</span>
              </div>

              {/* Bottom */}
              <div>
                <div className="text-[22px] font-extrabold leading-none" style={{ color: '#2a2540' }}>
                  {value}
                </div>
                <div className="mt-1 text-[11px]" style={{ color: '#6a6580' }}>{label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Modals */}
      {showSettings && (
        <QuickStatsSettingsModal
          selected={config}
          onClose={() => setShowSettings(false)}
          onChange={setConfig}
        />
      )}
      {activeVital && VITAL_CONFIG[activeVital] && (
        <AddVitalModal
          type={activeVital}
          cfg={VITAL_CONFIG[activeVital]}
          onClose={() => setActiveVital(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
