'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { ScheduleItem, MedStats, MedicationRow } from './page';

// ─── CSS Variables ────────────────────────────────────────────────────────────
const C = {
  bg: '#f4f3ef', card: '#fff', border: '#e8e4dc',
  accent: '#9c5e6c', accentBg: '#f0d4dc',
  green: '#3a7a4a', greenBg: '#d4e8d8',
  blue: '#6BA3D6', blueBg: '#d4dff0',
  purple: '#8b6aae', purpleBg: '#e0d8f0',
  orange: '#e8873a', orangeBg: '#fff3cd',
  red: '#dc3545', redBg: '#fde8e8',
  t1: '#2a2540', t2: '#6a6580', t3: '#9a96a8',
};

const TOOLTIP_CSS = `
  .tt-btn { position: relative; cursor: pointer; }
  .tt-btn .tt { visibility: hidden; opacity: 0; position: absolute; bottom: calc(100% + 8px);
    left: 50%; transform: translateX(-50%); padding: 6px 12px; border-radius: 10px;
    background: #2a2540; color: #fff; font-size: 11px; font-weight: 600;
    white-space: nowrap; transition: opacity .15s; z-index: 300; pointer-events: none; }
  .tt-btn .tt::after { content:''; position: absolute; top: 100%; left: 50%;
    transform: translateX(-50%); border: 5px solid transparent; border-top-color: #2a2540; }
  .tt-btn:hover .tt { visibility: visible; opacity: 1; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FOOD_TAGS: Record<string, { label: string; bg: string; color: string }> = {
  before:     { label: '🍽 до еды',       bg: '#fff3cd', color: '#856404' },
  after:      { label: '🍽 после еды',    bg: C.blueBg,  color: C.blue   },
  during:     { label: '🍽 во время еды', bg: C.greenBg, color: C.green  },
  no_alcohol: { label: '🚫 без алкоголя', bg: C.redBg,   color: C.red    },
};

const FOOD_LABELS: Record<string, { label: string; color: string }> = {
  before:     { label: 'до еды',       color: '#f0e8c8' },
  after:      { label: 'после еды',    color: '#c8e8d0' },
  during:     { label: 'во время еды', color: '#c8d8f0' },
  no_alcohol: { label: 'без алкоголя', color: '#f0c8c8' },
};

const MED_COLORS = [
  { bg: C.accentBg }, { bg: C.blueBg }, { bg: C.greenBg },
  { bg: C.orangeBg }, { bg: C.purpleBg },
];



function courseProgress(med: MedicationRow): { text: string; percent: number; permanent?: boolean; warn?: boolean } | null {
  if (!med.startDate) return null;
  if (!med.endDate && !med.durationDays) return { text: 'Постоянный приём', percent: 100, permanent: true };
  const start = new Date(med.startDate).getTime();
  const total = med.durationDays ?? (med.endDate
    ? Math.ceil((new Date(med.endDate).getTime() - start) / 86400000) : null);
  if (!total) return null;
  const elapsed = Math.ceil((Date.now() - start) / 86400000);
  const day = Math.min(Math.max(elapsed, 0), total);
  const remaining = total - day;
  const percent = Math.round((day / total) * 100);
  const warn = remaining > 0 && remaining <= 5;
  const text = warn ? `⚠️ осталось ${remaining} дня!` : `${day}/${total} дней`;
  return { text, percent, warn };
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function slotStatus(item: ScheduleItem): 'dn' | 'nw' | 'up' {
  if (item.status === 'taken' || item.status === 'skipped') return 'dn';
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const slotMin = timeToMinutes(item.time);
  if (slotMin <= nowMin + 30) return 'nw';
  return 'up';
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? (reader.result as string));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Compress + resize image to max 1200px and return raw base64 (no data: prefix). */
async function compressImageToBase64(file: File, maxSide = 1200, quality = 0.78): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        if (width >= height) { height = Math.round(height * maxSide / width); width = maxSide; }
        else { width = Math.round(width * maxSide / height); height = maxSide; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { fileToBase64(file).then(resolve); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl.split(',')[1] ?? dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); fileToBase64(file).then(resolve); };
    img.src = objectUrl;
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedMed {
  name: string; dosage: string; frequency: string; durationDays: number | null;
  times: string[]; foodInstruction: string | null; instructions: string | null; selected: boolean;
}
interface FamilyMember {
  memberId: string; memberUserId: string | null; memberName: string; memberRelation: string;
  medications: Array<{ id: string; title: string; dosage: string | null; times: unknown; endDate: string | null }>;
  todayStats: { taken: number; pending: number; total: number };
}
interface LogEntry {
  log: { id: string; scheduleId: string; userId: string; scheduledAt: string; status: string; takenAt: string | null; note: string | null };
  title: string; dosage: string | null;
}
type LogDay = Record<string, LogEntry[]>;
type TabKey = 'meds' | 'add' | 'log' | 'pharmacy' | 'family';

interface Props {
  initialSchedule: ScheduleItem[];
  initialStats: MedStats | null;
  initialMedications: MedicationRow[];
  locale: string;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: value ? C.accent : '#d0ccc8' }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: value ? 'calc(100% - 22px)' : '2px' }} />
    </button>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-[12px] font-medium block mb-1.5" style={{ color: '#666' }}>{label}</label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ─── WebView bridge: sync local notification schedule ─────────────────────────

function syncMedicationsToNative(meds: MedicationRow[]): void {
  if (typeof window === 'undefined') return;
  const rnwv = (window as unknown as Record<string, unknown>).ReactNativeWebView as
    { postMessage: (s: string) => void } | undefined;
  if (!rnwv) return; // not inside a React Native WebView

  const payload = meds
    .filter(m => m.isActive && m.reminderEnabled)
    .map(m => ({
      id: m.id,
      title: m.title,
      dosage: m.dosage,
      times: Array.isArray(m.times) ? m.times as string[] : [],
      reminderMinutesBefore: m.reminderMinutesBefore,
    }));

  rnwv.postMessage(JSON.stringify({ type: 'sync-medications', data: payload }));
}

// ═══════════════════════════════════════════════════════════════════════════════

export function MedicationsClient({ initialSchedule, initialStats, initialMedications, locale }: Props) {
  const [tab, setTab] = useState<TabKey>('meds');
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialSchedule);
  const [stats, setStats] = useState<MedStats | null>(initialStats);
  const [medications, setMedications] = useState<MedicationRow[]>(initialMedications);
  const [celebration, setCelebration] = useState(false);

  // Sync to native WebView whenever the medications list changes (add/remove/update)
  useEffect(() => { syncMedicationsToNative(medications); }, [medications]);

  // ── Custom order (persisted in localStorage) ────────────────────────────────
  const [medOrder, setMedOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('aivita_med_order');
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch { return []; }
  });

  const orderedMedications = useMemo(() => {
    if (medOrder.length === 0) return medications;
    const orderMap = new Map(medOrder.map((id, i) => [id, i]));
    return [...medications].sort((a, b) => {
      const ai = orderMap.get(a.id) ?? 9999;
      const bi = orderMap.get(b.id) ?? 9999;
      return ai - bi;
    });
  }, [medications, medOrder]);

  function handleMoveUp(id: string) {
    const ids = orderedMedications.map(m => m.id);
    const idx = ids.indexOf(id);
    if (idx <= 0) return;
    const next = [...ids];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setMedOrder(next);
    localStorage.setItem('aivita_med_order', JSON.stringify(next));
  }

  function handleMoveDown(id: string) {
    const ids = orderedMedications.map(m => m.id);
    const idx = ids.indexOf(id);
    if (idx < 0 || idx >= ids.length - 1) return;
    const next = [...ids];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    setMedOrder(next);
    localStorage.setItem('aivita_med_order', JSON.stringify(next));
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'meds',     label: '💊 Лекарства' },
    { key: 'add',      label: '➕ Добавить'   },
    { key: 'log',      label: '📅 Журнал'     },
    { key: 'pharmacy', label: '🔍 Аптеки'     },
    { key: 'family',   label: '👨‍👩‍👧 Семья'    },
  ];

  async function handleTake(scheduleId: string, time: string) {
    const r = await fetch(`/api/proxy/medications/${scheduleId}/take`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time }),
    });
    if (r.ok) {
      setSchedule(prev => prev.map(s =>
        s.scheduleId === scheduleId && s.time === time
          ? { ...s, status: 'taken', takenAt: new Date().toISOString() } : s));
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time }),
    });
    if (r.ok) {
      setSchedule(prev => prev.map(s =>
        s.scheduleId === scheduleId && s.time === time ? { ...s, status: 'skipped' } : s));
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <style>{TOOLTIP_CSS}</style>

      {/* ── Sticky tab bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(244,243,239,.95)', backdropFilter: 'blur(10px)',
        display: 'flex', justifyContent: 'center', gap: 6,
        padding: '10px 12px', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap',
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 14px', borderRadius: 10, fontFamily: 'inherit',
            border: `2px solid ${tab === t.key ? C.accent : 'transparent'}`,
            background: tab === t.key ? 'rgba(156,94,108,.06)' : 'rgba(42,37,64,.03)',
            color: tab === t.key ? C.accent : C.t3,
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ paddingBottom: 80 }}>
        {tab === 'meds' && (
          <TabMeds
            schedule={schedule} medications={orderedMedications} stats={stats}
            onTake={handleTake} onSkip={handleSkip}
            onSetTab={setTab} locale={locale}
            onRemoveMed={(id) => setMedications(prev => prev.filter(m => m.id !== id))}
            onUpsertMed={(med) => setMedications(prev => {
              const exists = prev.some(m => m.id === med.id);
              return exists ? prev.map(m => m.id === med.id ? med : m) : [med, ...prev];
            })}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        )}
        {tab === 'add' && (
          <TabAdd onAdded={(med) => { setMedications(prev => [med, ...prev]); setTab('meds'); }} />
        )}
        {tab === 'log'      && <TabLog />}
        {tab === 'pharmacy' && <TabPharmacy />}
        {tab === 'family'   && <TabFamily />}
      </div>

      {celebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-7xl animate-bounce drop-shadow-lg">✅</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Лекарства
// ═══════════════════════════════════════════════════════════════════════════════

function TabMeds({ schedule, medications, stats, onTake, onSkip, onSetTab, locale, onRemoveMed, onUpsertMed, onMoveUp, onMoveDown }: {
  schedule: ScheduleItem[];
  medications: MedicationRow[];
  stats: MedStats | null;
  onTake: (id: string, time: string) => Promise<void>;
  onSkip: (id: string, time: string) => Promise<void>;
  onSetTab: (t: TabKey) => void;
  locale: string;
  onRemoveMed: (id: string) => void;
  onUpsertMed: (med: MedicationRow) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [infoPopup, setInfoPopup] = useState<ScheduleItem | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [identifyResult, setIdentifyResult] = useState<{
    name: string | null; description: string; confidence: string;
    sideEffects: string[]; contraindications: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Medication management state ────────────────────────────────────────────
  const [menuMed,        setMenuMed]        = useState<MedicationRow | null>(null);
  const [editingMed,     setEditingMed]     = useState<MedicationRow | null>(null);
  const [completedMeds,  setCompletedMeds]  = useState<MedicationRow[]>([]);
  const [showCompleted,  setShowCompleted]  = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [editForm, setEditForm] = useState({
    title: '', dosage: '', frequency: '1 раз в день', times: ['08:00'],
    durationDays: '', startDate: '', foodInstruction: '', reminderEnabled: true,
    remainingPills: '', instructions: '',
  });

  // Load paused/completed meds on mount
  useEffect(() => {
    fetch('/api/proxy/medications?status=paused,completed')
      .then(r => r.ok ? r.json() as Promise<{ data: MedicationRow[] }> : null)
      .then(json => { if (json?.data) setCompletedMeds(json.data); })
      .catch(() => { /* ignore */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePause(id: string) {
    setActionLoading(true);
    try {
      const r = await fetch(`/api/proxy/medications/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });
      if (r.ok) {
        const med = medications.find(m => m.id === id);
        onRemoveMed(id);
        if (med) setCompletedMeds(prev => [{ ...med, status: 'paused' }, ...prev]);
      }
    } finally { setActionLoading(false); setMenuMed(null); }
  }

  async function handleComplete(id: string) {
    setActionLoading(true);
    try {
      const r = await fetch(`/api/proxy/medications/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (r.ok) {
        const med = medications.find(m => m.id === id);
        onRemoveMed(id);
        if (med) setCompletedMeds(prev => [{ ...med, status: 'completed' }, ...prev]);
      }
    } finally { setActionLoading(false); setMenuMed(null); }
  }

  async function handleDeleteMed(id: string) {
    setActionLoading(true);
    try {
      const r = await fetch(`/api/proxy/medications/${id}`, { method: 'DELETE' });
      if (r.ok) {
        onRemoveMed(id);
        setCompletedMeds(prev => prev.filter(m => m.id !== id));
      }
    } finally { setActionLoading(false); setConfirmDeleteId(null); setMenuMed(null); }
  }

  async function handleResume(id: string) {
    setActionLoading(true);
    try {
      const r = await fetch(`/api/proxy/medications/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (r.ok) {
        const json = await r.json() as { data: MedicationRow };
        setCompletedMeds(prev => prev.filter(m => m.id !== id));
        onUpsertMed(json.data);
      }
    } finally { setActionLoading(false); }
  }

  function openEdit(med: MedicationRow) {
    setEditForm({
      title: med.title,
      dosage: med.dosage ?? '',
      frequency: med.frequency,
      times: Array.isArray(med.times) && med.times.length ? med.times : ['08:00'],
      durationDays: med.durationDays?.toString() ?? '',
      startDate: med.startDate ?? '',
      foodInstruction: med.foodInstruction ?? '',
      reminderEnabled: med.reminderEnabled,
      remainingPills: med.remainingPills?.toString() ?? '',
      instructions: med.instructions ?? '',
    });
    setMenuMed(null);
    setEditingMed(med);
  }

  async function handleSaveEdit() {
    if (!editingMed || !editForm.title.trim()) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/proxy/medications/${editingMed.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title, dosage: editForm.dosage || null,
          frequency: editForm.frequency, times: editForm.times,
          durationDays: editForm.durationDays ? parseInt(editForm.durationDays) : null,
          startDate: editForm.startDate || null,
          foodInstruction: editForm.foodInstruction || null,
          reminderEnabled: editForm.reminderEnabled,
          remainingPills: editForm.remainingPills ? parseInt(editForm.remainingPills) : null,
          instructions: editForm.instructions || null,
        }),
      });
      if (r.ok) {
        const json = await r.json() as { data: MedicationRow };
        onUpsertMed(json.data);
      }
    } finally { setActionLoading(false); setEditingMed(null); }
  }

  // Group schedule items by scheduleId
  const scheduleMap = schedule.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    (acc[item.scheduleId] ??= []).push(item);
    return acc;
  }, {});

  // Merge: medications with schedule + scheduled meds not in medications list
  const allMedIds = new Set(medications.map(m => m.id));
  const extraScheduleIds = Object.keys(scheduleMap).filter(id => !allMedIds.has(id));

  // Alert banner: any schedule item with side effects
  const sideEffectItem = !alertDismissed
    ? schedule.find(s => s.sideEffects && s.sideEffects.length > 0)
    : null;

  async function handleIdentify(file: File) {
    setIdentifying(true);
    setIdentifyResult(null);
    try {
      const base64 = await fileToBase64(file);
      const r = await fetch('/api/proxy/medications/identify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  async function exportPdf() {
    const r = await fetch('/api/proxy/medications/export-pdf', { method: 'POST' });
    if (r.ok) {
      const json = await r.json() as { data?: { html?: string } };
      if (json.data?.html) {
        const blob = new Blob([json.data.html], { type: 'text/html' });
        window.open(URL.createObjectURL(blob), '_blank');
      }
    }
  }

  return (
    <div>
      {/* ── TopBar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1 }}>💊 Мои лекарства</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="tt-btn" style={{
            padding: '8px 12px', borderRadius: 12, border: `1px solid ${C.border}`,
            background: C.card, display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, cursor: 'pointer', color: C.t2, fontFamily: 'inherit',
          }}>
            <span>↔️</span> Совместимость
            <span className="tt">Проверить совместимость лекарств</span>
          </button>
          <button className="tt-btn" onClick={() => void exportPdf()} style={{
            padding: '8px 12px', borderRadius: 12, border: `1px solid ${C.border}`,
            background: C.card, display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, cursor: 'pointer', color: C.t2, fontFamily: 'inherit',
          }}>
            <span>📋</span> PDF
            <span className="tt">Скачать PDF для врача</span>
          </button>
        </div>
      </div>

      {/* ── Stats chips ── */}
      {stats && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto' }}>
          {/* Активных */}
          <div style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 14,
            background: C.card, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.t1,
          }}>
            💊 Активных: <span style={{ fontWeight: 800, color: C.accent }}>{medications.length}</span>
          </div>
          {/* Сегодня */}
          <div style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 14,
            background: C.card, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.t1,
          }}>
            ✅ Сегодня: <span style={{ fontWeight: 800, color: C.accent }}>{stats.taken}/{schedule.length}</span>
          </div>
          {/* Streak */}
          {stats.currentStreak > 0 && (
            <div style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 14,
              background: `linear-gradient(135deg, ${C.greenBg}, #c8e8cc)`,
              border: '1px solid #b8d8bc',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.t1,
            }}>
              🔥 <span style={{ fontWeight: 800, color: C.green }}>{stats.currentStreak} дней без пропуска!</span>
            </div>
          )}
          {/* Выполнение */}
          <div style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 14,
            background: C.card, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.t1,
          }}>
            📊 Выполнение: <span style={{ fontWeight: 800, color: C.accent }}>{stats.percent}%</span>
          </div>
        </div>
      )}

      {/* ── Alert banner (side effects) ── */}
      {sideEffectItem && (
        <div style={{
          margin: '0 16px 10px', padding: '14px 16px', borderRadius: 14,
          borderLeft: `4px solid ${C.orange}`, background: C.orangeBg, position: 'relative',
        }}>
          <button onClick={() => setAlertDismissed(true)} style={{
            position: 'absolute', top: 10, right: 10, background: 'none', border: 'none',
            color: '#856404', cursor: 'pointer', fontSize: 16,
          }}>×</button>
          <h4 style={{ fontSize: 13, fontWeight: 800, color: '#856404', display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚠️ {sideEffectItem.title} — побочные эффекты
          </h4>
          <p style={{ fontSize: 12, color: '#6a5a20', lineHeight: 1.5, marginTop: 4 }}>
            {sideEffectItem.sideEffects.slice(0, 3).join(', ')}
          </p>
        </div>
      )}

      {/* ── Medication cards ── */}
      {medications.length === 0 && extraScheduleIds.length === 0 && (
        <div style={{ margin: '0 16px 10px', padding: '24px 16px', borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>💊</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>Нет активных лекарств</p>
          <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Добавьте лекарства во вкладке «Добавить»</p>
        </div>
      )}

      {medications.map((med, idx) => {
        const items = scheduleMap[med.id] ?? [];
        return (
          <MedGroupCard
            key={med.id}
            med={med}
            items={items}
            colorBg={MED_COLORS[idx % MED_COLORS.length].bg}
            onTake={onTake}
            onSkip={onSkip}
            onInfo={(item) => setInfoPopup(item)}
            onBuy={() => onSetTab('pharmacy')}
            onMenu={(m) => setMenuMed(m)}
            isFirst={idx === 0}
            isLast={idx === medications.length - 1}
            onMoveUp={() => onMoveUp(med.id)}
            onMoveDown={() => onMoveDown(med.id)}
          />
        );
      })}

      {/* Extra schedule items not in medications list */}
      {extraScheduleIds.map((sid, idx) => {
        const items = scheduleMap[sid] ?? [];
        if (items.length === 0) return null;
        const first = items[0];
        const fakeMed: MedicationRow = {
          id: sid, title: first.title, dosage: first.dosage,
          frequency: '', times: items.map(i => i.time),
          instructions: first.instructions, sideEffects: first.sideEffects,
          contraindications: first.contraindications, foodInstruction: first.foodInstruction,
          remainingPills: first.remainingPills, persistentReminder: false,
          source: first.createdBy, startDate: '', endDate: null, durationDays: null,
          isActive: true, createdBy: first.createdBy, doctorId: first.doctorId,
          reminderEnabled: true, reminderMinutesBefore: 10,
        };
        return (
          <MedGroupCard
            key={sid}
            med={fakeMed}
            items={items}
            colorBg={MED_COLORS[(medications.length + idx) % MED_COLORS.length].bg}
            onTake={onTake}
            onSkip={onSkip}
            onInfo={(item) => setInfoPopup(item)}
            onBuy={() => onSetTab('pharmacy')}
            onMenu={(m) => setMenuMed(m)}
          />
        );
      })}

      {/* ── Streak card ── */}
      {stats && stats.currentStreak > 0 && (
        <div style={{
          margin: '0 16px 10px', padding: 16, borderRadius: 18,
          background: `linear-gradient(135deg, #d4e8d8, #c8e8cc)`,
          border: '1px solid #b8d8bc', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: C.green, lineHeight: 1 }}>
            {stats.currentStreak}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#2a5a3a' }}>
              🔥 {stats.currentStreak} дней без пропуска!
            </h4>
            <p style={{ fontSize: 11, color: '#4a7a5a' }}>
              Лучший результат: {stats.longestStreak} дней
            </p>
            {stats.streakBadges.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                {stats.streakBadges.slice(0, 2).map(b => (
                  <div key={b.id} style={{
                    width: 24, height: 24, borderRadius: 8, background: '#ffc107',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  }} title={b.name}>{b.icon}</div>
                ))}
                <div style={{ width: 24, height: 24, borderRadius: 8, background: '#c8c8c8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🥈</div>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(42,37,64,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🔒</div>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(42,37,64,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🔒</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Adherence block ── */}
      {medications.length > 0 && (
        <div style={{ margin: '0 16px 10px', padding: 16, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
          <h4 style={{ fontSize: 13, fontWeight: 800, color: C.t1, marginBottom: 12 }}>📊 Выполнение за неделю</h4>
          {medications.slice(0, 5).map(med => {
            const items = scheduleMap[med.id] ?? [];
            const taken = items.filter(i => i.status === 'taken').length;
            const pct = items.length > 0 ? Math.round((taken / items.length) * 100) : (stats?.percent ?? 0);
            const barColor = pct >= 90 ? C.green : pct >= 60 ? C.orange : C.red;
            return (
              <div key={med.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: C.t2 }}>{med.title}</span>
                  <span style={{ fontWeight: 800, color: barColor }}>{pct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(42,37,64,.06)', overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: barColor }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Identify card ── */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { if (e.target.files?.[0]) void handleIdentify(e.target.files[0]); }} />
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          margin: '0 16px 10px', padding: 20, borderRadius: 18,
          background: `linear-gradient(135deg, ${C.purpleBg}, ${C.blueBg})`,
          textAlign: 'center', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(42,37,64,.06)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
      >
        <span style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>📸</span>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: C.t1, marginBottom: 4 }}>Что за таблетка?</h3>
        <p style={{ fontSize: 12, color: C.t2 }}>
          {identifying ? '🔍 Определяю...' : 'Сфотографируйте — AI определит название и дозировку'}
        </p>
        {identifyResult && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.7)', textAlign: 'left' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{identifyResult.name ?? 'Не удалось определить'}</p>
            <p style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>{identifyResult.description}</p>
          </div>
        )}
      </div>

      {/* ── Export PDF ── */}
      <button onClick={() => void exportPdf()} style={{
        margin: '0 16px 10px', padding: 14, borderRadius: 14,
        background: C.card, border: `1px solid ${C.border}`,
        width: 'calc(100% - 32px)', fontSize: 13, fontWeight: 700, color: C.t2,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'inherit',
      }}>
        📋 Экспорт истории приёма для врача (PDF)
      </button>

      {/* ── Завершённые курсы ── */}
      {completedMeds.length > 0 && (
        <div style={{ margin: '0 16px 10px' }}>
          <button
            onClick={() => setShowCompleted(v => !v)}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 14,
              background: C.card, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: C.t2,
            }}
          >
            <span>📦 Завершённые курсы ({completedMeds.length})</span>
            <span style={{ fontSize: 16, transform: showCompleted ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
          </button>
          {showCompleted && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {completedMeds.map(med => (
                <div key={med.id} style={{
                  padding: '12px 14px', borderRadius: 14,
                  background: C.card, border: `1px solid ${C.border}`, opacity: 0.8,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>💊</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.t1, margin: 0 }}>{med.title}</p>
                    {med.dosage && <p style={{ fontSize: 11, color: C.t3 }}>{med.dosage}</p>}
                    <span style={{
                      display: 'inline-block', marginTop: 3, padding: '2px 8px', borderRadius: 6,
                      fontSize: 10, fontWeight: 700,
                      background: med.status === 'paused' ? C.orangeBg : C.greenBg,
                      color: med.status === 'paused' ? C.orange : C.green,
                    }}>
                      {med.status === 'paused' ? '⏸ Пауза' : '✅ Завершён'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => void handleResume(med.id)}
                      disabled={actionLoading}
                      style={{
                        padding: '6px 12px', borderRadius: 10, border: 'none',
                        background: C.green, color: '#fff', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading ? 0.6 : 1,
                      }}
                    >▶ Продолжить</button>
                    <button
                      onClick={() => setConfirmDeleteId(med.id)}
                      style={{
                        width: 30, height: 30, borderRadius: 10, border: 'none',
                        background: C.redBg, color: C.red, cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Menu bottom sheet ── */}
      {menuMed && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', zIndex: 60 }}
          onClick={() => setMenuMed(null)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl px-5 pt-4"
            style={{
              background: '#fff',
              /* pb = FloatingNav height (~64px) + its bottom offset (24px) + safe-area */
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0dcd8', margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '0 4px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: C.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💊</div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: C.t1, margin: 0 }}>{menuMed.title}</p>
                {menuMed.dosage && <p style={{ fontSize: 12, color: C.t3 }}>{menuMed.dosage}</p>}
              </div>
            </div>
            {[
              { icon: '✏️', label: 'Редактировать', action: () => openEdit(menuMed), color: C.t1 },
              { icon: '⏸', label: 'Приостановить', action: () => void handlePause(menuMed.id), color: C.orange },
              { icon: '✅', label: 'Завершить курс', action: () => void handleComplete(menuMed.id), color: C.green },
              { icon: '🗑', label: 'Удалить', action: () => { setConfirmDeleteId(menuMed.id); }, color: C.red },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                disabled={actionLoading}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 14, border: 'none',
                  background: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 15, fontWeight: 600, color: item.color,
                  display: 'flex', alignItems: 'center', gap: 14,
                  borderTop: item.label === 'Редактировать' ? 'none' : `1px solid ${C.border}`,
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Confirm delete ── */}
      {confirmDeleteId !== null && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', zIndex: 60 }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl px-6 pt-6 space-y-4"
            style={{
              background: '#fff',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0dcd8', margin: '0 auto 8px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.t1, textAlign: 'center' }}>Удалить лекарство?</h3>
            <p style={{ fontSize: 14, color: C.t3, textAlign: 'center' }}>Это действие нельзя отменить.</p>
            <button
              onClick={() => void handleDeleteMed(confirmDeleteId)}
              disabled={actionLoading}
              style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: C.red, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading ? 0.6 : 1 }}
            >{actionLoading ? '...' : '🗑 Удалить'}</button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: C.bg, color: C.t1, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >Отмена</button>
          </div>
        </div>
      )}

      {/* ── Edit bottom sheet ── */}
      {editingMed && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', zIndex: 60 }}
          onClick={() => setEditingMed(null)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl"
            style={{ background: '#fff', maxHeight: '90dvh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '16px 20px 12px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0dcd8', margin: '0 auto 12px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: C.t1 }}>✏️ Редактировать</p>
                <button onClick={() => setEditingMed(null)} style={{ fontSize: 22, color: C.t3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Название *">
                <input type="text" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none" style={{ borderColor: C.border }} />
              </Field>
              <Field label="Дозировка">
                <input type="text" placeholder="500 мг..." value={editForm.dosage} onChange={e => setEditForm(f => ({ ...f, dosage: e.target.value }))}
                  className="w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none" style={{ borderColor: C.border }} />
              </Field>
              <Field label="Частота">
                <select value={editForm.frequency} onChange={e => setEditForm(f => ({ ...f, frequency: e.target.value }))}
                  className="w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none bg-white" style={{ borderColor: C.border }}>
                  {['1 раз в день','2 раза в день','3 раза в день','По необходимости','Постоянно'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Время приёма">
                <div className="flex flex-wrap gap-2">
                  {editForm.times.map((t, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input type="time" value={t} onChange={e => setEditForm(f => ({ ...f, times: f.times.map((tt, j) => j === i ? e.target.value : tt) }))}
                        className="text-sm border rounded-xl px-2 py-1.5 focus:outline-none" style={{ borderColor: C.border }} />
                      {editForm.times.length > 1 && (
                        <button onClick={() => setEditForm(f => ({ ...f, times: f.times.filter((_, j) => j !== i) }))} style={{ color: C.red, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
                      )}
                    </div>
                  ))}
                  {editForm.times.length < 4 && (
                    <button onClick={() => setEditForm(f => ({ ...f, times: [...f.times, '12:00'] }))}
                      className="text-[12px] px-2 py-1 rounded-lg" style={{ background: C.bg, color: C.accent, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Время</button>
                  )}
                </div>
              </Field>
              <div className="flex gap-3">
                <Field label="Дней курса" className="flex-1">
                  <input type="number" placeholder="14" value={editForm.durationDays} onChange={e => setEditForm(f => ({ ...f, durationDays: e.target.value }))}
                    className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none" style={{ borderColor: C.border }} />
                </Field>
                <Field label="Остаток таблеток" className="flex-1">
                  <input type="number" placeholder="20" value={editForm.remainingPills} onChange={e => setEditForm(f => ({ ...f, remainingPills: e.target.value }))}
                    className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none" style={{ borderColor: C.border }} />
                </Field>
              </div>
              <Field label="Приём с едой">
                <div className="flex flex-wrap gap-2">
                  {(['', 'before', 'after', 'during', 'no_alcohol'] as const).map(v => (
                    <button key={v || 'none'} onClick={() => setEditForm(f => ({ ...f, foodInstruction: v }))}
                      className="px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all" style={{
                        background: editForm.foodInstruction === v ? C.accent : C.bg,
                        color: editForm.foodInstruction === v ? '#fff' : '#666',
                        borderColor: editForm.foodInstruction === v ? C.accent : C.border,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      {v === '' ? 'Не указано' : FOOD_TAGS[v]?.label}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="flex items-center justify-between py-1">
                <p className="text-[13px] font-semibold" style={{ color: C.t1 }}>Напоминания</p>
                <Toggle value={editForm.reminderEnabled} onChange={v => setEditForm(f => ({ ...f, reminderEnabled: v }))} />
              </div>
            </div>
            <div style={{ padding: '0 20px 40px', display: 'flex', gap: 10 }}>
              <button
                onClick={() => void handleSaveEdit()}
                disabled={actionLoading || !editForm.title.trim()}
                style={{ flex: 1, padding: '14px', borderRadius: 16, border: 'none', background: C.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (actionLoading || !editForm.title.trim()) ? 0.6 : 1 }}
              >{actionLoading ? 'Сохраняю...' : '✓ Сохранить'}</button>
              <button
                onClick={() => setEditingMed(null)}
                style={{ padding: '14px 20px', borderRadius: 16, border: 'none', background: C.bg, color: C.t1, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Info popup ── */}
      {infoPopup && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setInfoPopup(null)}>
          <div className="w-full max-w-[480px] mx-auto rounded-t-3xl p-6 space-y-4"
            style={{ background: '#fff' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{infoPopup.title}</p>
                {infoPopup.dosage && <p style={{ fontSize: 13, color: C.t3 }}>{infoPopup.dosage}</p>}
              </div>
              <button onClick={() => setInfoPopup(null)}
                className="text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full"
                style={{ color: C.t3, background: C.bg }}>×</button>
            </div>
            {infoPopup.foodInstruction && FOOD_LABELS[infoPopup.foodInstruction] && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Приём с едой</p>
                <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 20, fontWeight: 500, background: FOOD_LABELS[infoPopup.foodInstruction].color, color: '#555' }}>
                  {FOOD_LABELS[infoPopup.foodInstruction].label}
                </span>
              </div>
            )}
            {infoPopup.sideEffects.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#e05555', marginBottom: 4 }}>Побочные эффекты</p>
                <ul style={{ listStyle: 'disc', paddingLeft: 16 }}>
                  {infoPopup.sideEffects.map((s, i) => <li key={i} style={{ fontSize: 12, color: '#666' }}>{s}</li>)}
                </ul>
              </div>
            )}
            {infoPopup.contraindications.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#c07000', marginBottom: 4 }}>Противопоказания</p>
                <ul style={{ listStyle: 'disc', paddingLeft: 16 }}>
                  {infoPopup.contraindications.map((s, i) => <li key={i} style={{ fontSize: 12, color: '#666' }}>{s}</li>)}
                </ul>
              </div>
            )}
            {infoPopup.instructions && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Инструкции</p>
                <p style={{ fontSize: 12, color: '#666' }}>{infoPopup.instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Grouped Med Card ─────────────────────────────────────────────────────────

function MedGroupCard({ med, items, colorBg, onTake, onSkip, onInfo, onBuy, onMenu, isFirst, isLast, onMoveUp, onMoveDown }: {
  med: MedicationRow;
  items: ScheduleItem[];
  colorBg: string;
  onTake: (id: string, time: string) => Promise<void>;
  onSkip: (id: string, time: string) => Promise<void>;
  onInfo: (item: ScheduleItem) => void;
  onBuy: () => void;
  onMenu: (med: MedicationRow) => void;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const prog = courseProgress(med);

  const allDone = items.length > 0 && items.every(i => i.status === 'taken' || i.status === 'skipped');
  const pendingItems = items.filter(i => i.status === 'pending' || i.status === 'missed');

  // Determine if any slot is "now" (time has passed or is current)
  const isNow = pendingItems.some(i => slotStatus(i) === 'nw');
  const isDone = allDone;

  const lowPills = med.remainingPills !== null && med.remainingPills < 7;

  // First schedule item for info popup
  const firstItem = items[0] ?? null;

  const cardStyle: React.CSSProperties = {
    margin: '0 16px 10px', padding: 16, borderRadius: 18,
    background: C.card, position: 'relative',
    border: isNow
      ? `1.5px solid ${C.accent}`
      : `1px solid ${C.border}`,
    boxShadow: isNow ? `0 0 0 3px ${C.accentBg}` : 'none',
    opacity: isDone ? 0.65 : 1,
    transition: 'all .2s',
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0, background: colorBg,
        }}>💊</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: C.t1, margin: 0 }}>{med.title}</h3>
            {med.remainingPills !== null && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 7, flexShrink: 0,
                background: lowPills ? C.redBg : C.greenBg,
                color: lowPills ? C.red : C.green,
              }}>
                {lowPills ? `⚠️ ${med.remainingPills} шт` : `${med.remainingPills} шт`}
              </span>
            )}
          </div>
          {med.dosage && (
            <div style={{ fontSize: 12, color: C.t2, marginTop: 1 }}>
              {med.dosage}
              {med.createdBy === 'doctor' && <span style={{ marginLeft: 6, fontSize: 10, background: C.blueBg, color: C.blue, padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>🩺 Врач</span>}
            </div>
          )}
        </div>
        {/* ↑↓ reorder buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
            disabled={isFirst}
            style={{
              width: 26, height: 22, borderRadius: 7, border: 'none',
              background: isFirst ? 'rgba(42,37,64,.03)' : 'rgba(42,37,64,.07)',
              cursor: isFirst ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: isFirst ? C.t3 : C.t2, fontFamily: 'inherit',
              transition: 'background .15s',
            }}
            aria-label="Переместить вверх"
          >▲</button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
            disabled={isLast}
            style={{
              width: 26, height: 22, borderRadius: 7, border: 'none',
              background: isLast ? 'rgba(42,37,64,.03)' : 'rgba(42,37,64,.07)',
              cursor: isLast ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: isLast ? C.t3 : C.t2, fontFamily: 'inherit',
              transition: 'background .15s',
            }}
            aria-label="Переместить вниз"
          >▼</button>
        </div>
        {/* ⋯ management button */}
        <button
          onClick={(e) => { e.stopPropagation(); onMenu(med); }}
          style={{
            width: 30, height: 30, borderRadius: 10, border: 'none',
            background: 'rgba(42,37,64,.06)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: C.t2, flexShrink: 0, fontFamily: 'inherit',
            letterSpacing: 1,
          }}
          aria-label="Управление"
        >⋯</button>
      </div>

      {/* Course progress */}
      {prog && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
          padding: '6px 10px', borderRadius: 10,
          background: prog.permanent ? 'rgba(107,163,214,.06)' : 'rgba(42,37,64,.02)',
        }}>
          <span style={{ fontSize: 11, color: prog.permanent ? C.blue : C.t2, whiteSpace: 'nowrap' }}>
            📅 {prog.permanent ? 'Постоянный приём' : 'Курс:'}
          </span>
          {!prog.permanent && (
            <>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(42,37,64,.06)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${prog.percent}%`,
                  background: prog.warn ? C.red : prog.percent >= 80 ? C.green : C.blue,
                }} />
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: prog.warn ? C.red : prog.percent >= 80 ? C.green : C.blue,
              }}>{prog.text}</span>
            </>
          )}
        </div>
      )}

      {/* Time slot tags */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {items.map((item, i) => {
            const st = slotStatus(item);
            const styles = {
              dn: { background: C.greenBg, color: C.green, textDecoration: 'line-through' as const },
              nw: { background: C.accentBg, color: C.accent, animation: 'pulse-opacity 2s infinite' },
              up: { background: 'rgba(42,37,64,.04)', color: C.t3, textDecoration: 'none' as const },
            };
            const s = styles[st];
            return (
              <span key={i} style={{ padding: '5px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, ...s }}>
                {st === 'dn' ? `✓ ${item.time}` : st === 'nw' ? `⏰ ${item.time} — сейчас!` : item.time}
              </span>
            );
          })}
        </div>
      )}

      {/* Food tags */}
      {med.foodInstruction && FOOD_TAGS[med.foodInstruction] && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
            background: FOOD_TAGS[med.foodInstruction].bg,
            color: FOOD_TAGS[med.foodInstruction].color,
          }}>
            {FOOD_TAGS[med.foodInstruction].label}
          </span>
        </div>
      )}

      {/* Action buttons — only for pending */}
      {pendingItems.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {pendingItems.slice(0, 1).map(item => (
            <button key={item.time} className="tt-btn"
              disabled={loading !== null}
              onClick={async () => { setLoading('take_' + item.time); await onTake(item.scheduleId, item.time); setLoading(null); }}
              style={{
                padding: '8px 14px', borderRadius: 12, border: 'none',
                background: C.green, color: '#fff', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
              ✓ Принял
              <span className="tt">Отметить приём</span>
            </button>
          ))}
          {pendingItems.slice(0, 1).map(item => (
            <button key={'skip_' + item.time} className="tt-btn"
              disabled={loading !== null}
              onClick={async () => { setLoading('skip_' + item.time); await onSkip(item.scheduleId, item.time); setLoading(null); }}
              style={{
                padding: '8px 14px', borderRadius: 12, border: 'none',
                background: 'rgba(42,37,64,.06)', color: C.t2, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
              Пропустить
              <span className="tt">Пропустить этот приём</span>
            </button>
          ))}
          {lowPills && (
            <button className="tt-btn" onClick={onBuy} style={{
              padding: '8px 14px', borderRadius: 12, border: 'none',
              background: C.blueBg, color: C.blue, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              🛒 Купить
              <span className="tt">Найти в аптеках</span>
            </button>
          )}
          {firstItem && (
            <button className="tt-btn" onClick={() => onInfo(firstItem)} style={{
              padding: '8px 14px', borderRadius: 12, border: 'none',
              background: C.purpleBg, color: C.purple, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              ℹ️
              <span className="tt">Подробнее о лекарстве</span>
            </button>
          )}
        </div>
      )}

      {/* Info button when no pending */}
      {pendingItems.length === 0 && firstItem && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="tt-btn" onClick={() => onInfo(firstItem)} style={{
            padding: '4px 10px', borderRadius: 10, border: 'none',
            background: C.bg, color: C.t3, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ℹ️ <span className="tt">Подробнее о лекарстве</span>
          </button>
        </div>
      )}

      <style>{`@keyframes pulse-opacity{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
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
  const [parseError, setParseError] = useState('');
  const fileRef    = useRef<HTMLInputElement>(null);
  const fileRefPdf = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', dosage: '', frequency: '1 раз в день',
    times: ['08:00'], durationDays: '',
    startDate: new Date().toISOString().split('T')[0],
    foodInstruction: '', reminderEnabled: true,
    persistentReminder: false, instructions: '', remainingPills: '',
  });

  // ─── shared OCR error parser ────────────────────────────────────────────────

  async function parseOcrResponse(
    r: Response,
    isPdf: boolean,
  ): Promise<Array<Omit<ParsedMed, 'selected'>> | null> {
    if (r.ok) {
      const json = await r.json() as { data?: Array<Omit<ParsedMed, 'selected'>>; raw?: string };
      if (!json.data?.length) {
        setParseError(isPdf
          ? 'Лекарства в PDF не найдены. Убедитесь, что документ содержит рецепт с назначениями.'
          : 'AI не смог найти лекарства. Убедитесь что рецепт чёткий и полностью виден.');
        return null;
      }
      return json.data;
    }
    // Error responses — show distinct messages per cause
    const errJson = await r.json().catch(() => ({} as { error?: string }));
    if (r.status === 400 && errJson.error === 'bad_format') {
      setParseError(isPdf
        ? 'PDF не удалось прочитать. Проверьте, что файл не зашифрован и не повреждён.'
        : 'Формат изображения не поддерживается. Используйте JPG, PNG или PDF.');
    } else if (r.status === 503) {
      setParseError('Сервис распознавания временно недоступен. Попробуйте позже.');
    } else if (r.status === 413) {
      setParseError('Файл слишком большой. Сожмите изображение и попробуйте снова.');
    } else {
      setParseError('Не удалось распознать рецепт. Попробуйте ещё раз или введите лекарства вручную.');
    }
    return null;
  }

  // ─── Camera / gallery: image only ──────────────────────────────────────────

  async function handleReceiptPhoto(file: File) {
    setParsing(true);
    setParseError('');
    try {
      // Compress to max 1200px / JPEG 0.78 → keeps base64 under ~800 KB
      const base64 = await compressImageToBase64(file);
      const r = await fetch('/api/proxy/medications/parse-receipt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64, mediaType: 'image/jpeg' }),
      });
      const data = await parseOcrResponse(r, false);
      if (data) { setReceiptParsed(data.map(m => ({ ...m, selected: true }))); setMode('receipt'); }
    } catch {
      setParseError('Ошибка сети. Проверьте подключение и попробуйте снова.');
    } finally { setParsing(false); }
  }

  // ─── File picker: image OR PDF ───────────────────────────────────────────────

  async function handleReceiptFile(file: File) {
    setParsing(true);
    setParseError('');
    try {
      const isPdf = file.type === 'application/pdf';
      if (isPdf && file.size > 20 * 1024 * 1024) {
        setParseError('PDF слишком большой (макс. 20 МБ). Попробуйте меньший файл.');
        return;
      }
      // PDF → no compression (send as-is); image → compress
      const base64 = isPdf ? await fileToBase64(file) : await compressImageToBase64(file);
      const mediaType = isPdf ? 'application/pdf' : 'image/jpeg';

      const r = await fetch('/api/proxy/medications/parse-receipt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64, mediaType }),
      });
      const data = await parseOcrResponse(r, isPdf);
      if (data) { setReceiptParsed(data.map(m => ({ ...m, selected: true }))); setMode('receipt'); }
    } catch {
      setParseError('Ошибка сети. Проверьте подключение и попробуйте снова.');
    } finally { setParsing(false); }
  }

  async function addReceiptMeds() {
    const selected = receiptParsed.filter(m => m.selected);
    if (selected.length === 0) return;
    setSaving(true);
    try {
      for (const med of selected) {
        await fetch('/api/proxy/medications', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: med.name, dosage: med.dosage, frequency: med.frequency, times: med.times, durationDays: med.durationDays, foodInstruction: med.foodInstruction, instructions: med.instructions, source: 'receipt_ocr' }),
        });
      }
    } finally { setSaving(false); setMode('menu'); setReceiptParsed([]); }
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
    } finally { setSaving(false); }
  }

  // Receipt mode
  if (mode === 'receipt') {
    return (
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
          <button onClick={() => setMode('menu')} style={{ fontSize: 13, fontWeight: 600, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>← Назад</button>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>AI нашёл {receiptParsed.length} лекарств</p>
        </div>

        <div style={{ margin: '0 0 12px', padding: 16, borderRadius: 16, border: `2px dashed ${C.green}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 700, color: C.green }}>
            <span>🤖</span> AI нашёл {receiptParsed.length} лекарств в рецепте:
          </div>
          {receiptParsed.map((med, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, background: C.greenBg, marginBottom: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={med.selected} style={{ width: 18, height: 18, accentColor: C.green }}
                onChange={e => setReceiptParsed(prev => prev.map((m, j) => j === i ? { ...m, selected: e.target.checked } : m))} />
              <div>
                <h5 style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{med.name}</h5>
                <p style={{ fontSize: 11, color: C.t2 }}>{med.dosage}{med.frequency ? ` · ${med.frequency}` : ''}{med.durationDays ? ` · ${med.durationDays} дней` : ''}</p>
              </div>
            </label>
          ))}
          <button onClick={() => void addReceiptMeds()} disabled={saving || !receiptParsed.some(m => m.selected)}
            style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 14, background: C.green, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Добавляю...' : `✓ Добавить все в список`}
          </button>
        </div>
      </div>
    );
  }

  // Manual form
  if (mode === 'manual') {
    return (
      <div className="px-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('menu')} className="text-[13px] font-medium" style={{ color: C.accent }}>← Назад</button>
          <p className="text-[15px] font-bold" style={{ color: C.t1 }}>Добавить вручную</p>
        </div>
        <div className="rounded-2xl bg-white p-5 space-y-4" style={{ border: `1px solid ${C.border}` }}>
          <Field label="Название *">
            <input type="text" placeholder="Парацетамол, Аспирин..." value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none" style={{ borderColor: C.border }} />
          </Field>
          <Field label="Дозировка">
            <input type="text" placeholder="500 мг, 1 таблетка..." value={form.dosage}
              onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))}
              className="w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none" style={{ borderColor: C.border }} />
          </Field>
          <Field label="Частота">
            <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
              className="w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none bg-white" style={{ borderColor: C.border }}>
              {['1 раз в день','2 раза в день','3 раза в день','По необходимости','Постоянно'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Время приёма">
            <div className="flex flex-wrap gap-2">
              {form.times.map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input type="time" value={t} onChange={e => setForm(f => ({ ...f, times: f.times.map((tt, j) => j === i ? e.target.value : tt) }))}
                    className="text-sm border rounded-xl px-2 py-1.5 focus:outline-none" style={{ borderColor: C.border }} />
                  {form.times.length > 1 && (
                    <button onClick={() => setForm(f => ({ ...f, times: f.times.filter((_, j) => j !== i) }))} className="text-red-400 text-sm w-5 h-5">✕</button>
                  )}
                </div>
              ))}
              {form.times.length < 4 && (
                <button onClick={() => setForm(f => ({ ...f, times: [...f.times, '12:00'] }))}
                  className="text-[12px] px-2 py-1 rounded-lg" style={{ background: C.bg, color: C.accent }}>+ Время</button>
              )}
            </div>
          </Field>
          <div className="flex gap-3">
            <Field label="Начало курса" className="flex-1">
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none" style={{ borderColor: C.border }} />
            </Field>
            <Field label="Дней курса" className="flex-1">
              <input type="number" placeholder="14" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none" style={{ borderColor: C.border }} />
            </Field>
          </div>
          <Field label="Приём с едой">
            <div className="flex flex-wrap gap-2">
              {(['', 'before', 'after', 'during', 'no_alcohol'] as const).map(v => (
                <button key={v || 'none'} onClick={() => setForm(f => ({ ...f, foodInstruction: v }))}
                  className="px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all" style={{
                    background: form.foodInstruction === v ? C.accent : C.bg,
                    color: form.foodInstruction === v ? '#fff' : '#666',
                    borderColor: form.foodInstruction === v ? C.accent : C.border,
                  }}>
                  {v === '' ? 'Не указано' : FOOD_TAGS[v]?.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Остаток таблеток">
            <input type="number" placeholder="20" value={form.remainingPills} onChange={e => setForm(f => ({ ...f, remainingPills: e.target.value }))}
              className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none" style={{ borderColor: C.border }} />
          </Field>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[13px] font-semibold" style={{ color: C.t1 }}>Напоминания</p>
              <p className="text-[11px]" style={{ color: C.t3 }}>Уведомления в выбранное время</p>
            </div>
            <Toggle value={form.reminderEnabled} onChange={v => setForm(f => ({ ...f, reminderEnabled: v }))} />
          </div>
          {form.reminderEnabled && (
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-[13px] font-semibold" style={{ color: C.t1 }}>Настойчивые напоминания</p>
                <p className="text-[11px]" style={{ color: C.t3 }}>Повтор через 15 и 30 мин</p>
              </div>
              <Toggle value={form.persistentReminder} onChange={v => setForm(f => ({ ...f, persistentReminder: v }))} />
            </div>
          )}
          <Field label="Доп. инструкции">
            <textarea placeholder="Особые указания..." value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              rows={2} className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none resize-none" style={{ borderColor: C.border }} />
          </Field>
        </div>
        <button onClick={() => void addManual()} disabled={saving || !form.title.trim()}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: C.accent }}>
          {saving ? 'Сохраняю...' : 'Добавить лекарство'}
        </button>
      </div>
    );
  }

  // Menu — 2x3 grid
  return (
    <div>
      <div style={{ padding: '14px 20px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1 }}>➕ Добавить лекарство</h1>
      </div>
      {/* Camera: image only (with capture) */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { if (e.target.files?.[0]) void handleReceiptPhoto(e.target.files[0]); }} />
      {/* File picker: image or PDF, no capture */}
      <input ref={fileRefPdf} type="file" accept="image/*,.pdf" className="hidden"
        onChange={e => { if (e.target.files?.[0]) void handleReceiptFile(e.target.files[0]); }} />

      {parseError && (
        <div style={{ margin: '0 16px 12px', padding: '12px 14px', borderRadius: 12, background: '#fde8e8', border: '1px solid #dc3545', fontSize: 13, color: '#c0392b', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span>⚠️</span>
          <span>{parseError}</span>
          <button onClick={() => setParseError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px' }}>
        {[
          { em: '📷', title: 'Фото рецепта', sub: 'AI распознает автоматически', action: () => fileRef.current?.click(), disabled: parsing },
          { em: '📎', title: 'Файл рецепта', sub: 'PDF или фото из галереи', action: () => fileRefPdf.current?.click(), disabled: parsing },
          { em: '💬', title: 'Из чата с врачом', sub: 'Принять назначение', soon: true },
          { em: '🏥', title: 'Из клиники', sub: 'Автоматически из MedSoft', soon: true },
          { em: '✏️', title: 'Вручную', sub: 'Название и дозировку', action: () => setMode('manual') },
          { em: '🔍', title: 'Поиск', sub: 'Найти в базе лекарств', soon: true },
        ].map((item, i) => (
          <div key={i}
            onClick={item.action && !item.soon ? item.action : undefined}
            style={{
              padding: '18px 14px', borderRadius: 16, background: C.card, border: `1px solid ${C.border}`,
              textAlign: 'center', cursor: item.soon ? 'default' : 'pointer',
              opacity: item.soon ? 0.5 : 1, transition: 'all .15s',
            }}
            onMouseEnter={e => { if (!item.soon) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(42,37,64,.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; (e.currentTarget as HTMLDivElement).style.transform = ''; }}
          >
            <span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>{item.em}</span>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 2 }}>
              {parsing && item.em === '📷' ? 'Распознаю...' : item.title}
            </h4>
            <p style={{ fontSize: 10, color: C.t3 }}>{item.soon ? 'Скоро' : item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Журнал
// ═══════════════════════════════════════════════════════════════════════════════

function TabLog() {
  const [logData, setLogData] = useState<LogDay>({});
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
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
      } finally { setLoading(false); }
    })();
  }, []);

  function getDayDots(date: string): Array<{ color: string }> {
    const entries = logData[date] ?? [];
    return entries.slice(0, 3).map(e => ({
      color: e.log.status === 'taken' ? C.green
        : e.log.status === 'missed' ? C.red
        : C.t3,
    }));
  }

  const today = new Date().toISOString().split('T')[0];
  const dayEntries = logData[selectedDate] ?? [];

  return (
    <div>
      <div style={{ padding: '14px 20px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1 }}>📅 Журнал приёма</h1>
      </div>

      {/* Calendar strip */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', overflowX: 'auto' }}>
        {days.map(date => {
          const isSelected = date === selectedDate;
          const isToday = date === today;
          const d = new Date(date + 'T12:00:00');
          const dots = getDayDots(date);
          return (
            <button key={date} onClick={() => setSelectedDate(date)} style={{
              width: 44, flexShrink: 0, padding: '8px 0', borderRadius: 14, textAlign: 'center',
              cursor: 'pointer', border: `1px solid ${isSelected || isToday ? C.accent : C.border}`,
              background: isSelected || isToday ? C.accentBg : C.card,
              fontFamily: 'inherit',
            }}>
              <div style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>
                {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.t1 }}>{d.getDate()}</div>
              <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 4 }}>
                {dots.length > 0 ? dots.map((dot, i) => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: dot.color }} />
                )) : (
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(42,37,64,.1)' }} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day label */}
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: C.t3, padding: '8px 20px' }}>
        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
      </div>

      {/* Timeline */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 14, color: C.t3 }}>Загружаю...</div>
      ) : dayEntries.length === 0 ? (
        <div style={{ margin: '0 16px', padding: 24, borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, textAlign: 'center', fontSize: 13, color: C.t3 }}>Нет записей за этот день</div>
      ) : (
        <div style={{ background: C.card, margin: '0 16px', borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {dayEntries.map((entry, i) => {
            const timeStr = entry.log.scheduledAt
              ? new Date(entry.log.scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
              : '—';
            const isTaken = entry.log.status === 'taken';
            const isMissed = entry.log.status === 'missed';
            const isPending = entry.log.status === 'pending';
            return (
              <div key={i} style={{
                display: 'flex', gap: 12, padding: '12px 16px',
                borderBottom: i < dayEntries.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, width: 50, flexShrink: 0, color: isTaken ? C.green : isPending ? C.accent : C.t3 }}>
                  {timeStr}
                </div>
                <div>
                  <h5 style={{ fontSize: 13, fontWeight: 700, color: isTaken ? C.t1 : isPending ? C.accent : C.t3 }}>
                    {isTaken ? '✅' : isMissed ? '❌' : isPending ? '⏰' : '🕐'} {entry.title}
                  </h5>
                  <p style={{ fontSize: 11, color: C.t3 }}>
                    {isTaken && entry.log.takenAt
                      ? `Принято в ${new Date(entry.log.takenAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
                      : isMissed ? 'Пропущено'
                      : isPending ? 'Ожидает приёма'
                      : 'Вечером'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Аптеки
// ═══════════════════════════════════════════════════════════════════════════════

function TabPharmacy() {
  const [query, setQuery]       = useState('');
  const [searched, setSearched] = useState('');   // last submitted query
  const [city, setCity]         = useState('Ташкент');
  const [locating, setLocating] = useState(false);

  // Resolve city once via geolocation + Nominatim
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
            { headers: { 'Accept-Language': 'ru' } },
          );
          if (r.ok) {
            const j = await r.json() as { address?: { city?: string; town?: string; village?: string; county?: string } };
            const detected = j?.address?.city ?? j?.address?.town ?? j?.address?.village ?? j?.address?.county;
            if (detected) setCity(detected);
          }
        } catch { /* keep fallback */ }
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 6000 },
    );
  }, []);

  function doSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    setSearched(q);
  }

  const mapsQuery  = encodeURIComponent(`аптека ${city}`);
  const tabletkaUrl = searched
    ? `https://tabletka.uz/search?q=${encodeURIComponent(searched)}`
    : null;
  const mapsUrl = `https://www.google.com/maps/search/${mapsQuery}`;

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 10px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1 }}>🔍 Цены в аптеках</h1>
        {locating && (
          <p style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>📍 Определяем ваш город…</p>
        )}
        {!locating && (
          <p style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>📍 Город: <b style={{ color: C.t1 }}>{city}</b></p>
        )}
      </div>

      {/* Search bar */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
        <input
          placeholder="Название лекарства..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 14,
            border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit',
            outline: 'none', background: C.card,
          }}
        />
        <button
          onClick={doSearch}
          disabled={query.trim().length < 2}
          style={{
            width: 48, height: 48, borderRadius: 14, background: C.accent,
            border: 'none', fontSize: 18, cursor: 'pointer', flexShrink: 0,
            opacity: query.trim().length < 2 ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >🔍</button>
      </div>

      {/* Result card after search */}
      {searched && tabletkaUrl && (
        <div style={{ margin: '0 16px 12px', borderRadius: 20, background: C.card, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {/* Title row */}
          <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, color: C.t3, marginBottom: 4 }}>Результат поиска</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: C.t1 }}>
              🔍 <span style={{ color: C.accent }}>{searched}</span> — поиск по аптекам {city}
            </p>
          </div>

          {/* tabletka.uz button */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
            <button
              onClick={() => window.open(tabletkaUrl, '_blank', 'noopener')}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14,
                background: 'linear-gradient(135deg, #27ae60, #219a52)',
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 20 }}>💊</span>
              <span style={{ flex: 1 }}>Посмотреть цены на tabletka.uz →</span>
              <span style={{ fontSize: 12, opacity: 0.8 }}>↗</span>
            </button>
            <p style={{ fontSize: 11, color: C.t3, marginTop: 6, textAlign: 'center' }}>
              Актуальные цены в аптеках Узбекистана
            </p>
          </div>

          {/* Google Maps link */}
          <div style={{ padding: '12px 16px' }}>
            <button
              onClick={() => window.open(mapsUrl, '_blank', 'noopener')}
              style={{
                width: '100%', padding: '13px 16px', borderRadius: 14,
                background: C.blueBg, border: `1px solid ${C.border}`,
                color: C.t1, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 20 }}>📍</span>
              <span style={{ flex: 1 }}>Ближайшие аптеки на карте →</span>
              <span style={{ fontSize: 12, color: C.t3 }}>↗</span>
            </button>
            <p style={{ fontSize: 11, color: C.t3, marginTop: 6, textAlign: 'center' }}>
              Google Maps · аптеки рядом с вами
            </p>
          </div>
        </div>
      )}

      {/* Empty state before search */}
      {!searched && (
        <div style={{ margin: '0 16px 12px', padding: '24px 20px', borderRadius: 20, background: C.card, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>🏥</span>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 6 }}>Найдите лекарство в аптеках</p>
          <p style={{ fontSize: 12, color: C.t3, lineHeight: 1.5 }}>
            Введите название препарата и нажмите 🔍 — мы покажем цены и адреса аптек в вашем городе
          </p>
        </div>
      )}

      {/* Quick search chips */}
      {!searched && (
        <div style={{ padding: '0 16px 16px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Популярные запросы
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Амоксициллин', 'Парацетамол', 'Омепразол', 'Ибупрофен', 'Цетиризин'].map(drug => (
              <button
                key={drug}
                onClick={() => { setQuery(drug); setSearched(drug); }}
                style={{
                  padding: '7px 14px', borderRadius: 20, border: `1px solid ${C.border}`,
                  background: C.card, fontSize: 13, color: C.t1, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {drug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Coming soon banner */}
      <div style={{
        margin: '0 16px', padding: '14px 16px', borderRadius: 16,
        background: 'linear-gradient(135deg, #f0eefc, #ece4f8)',
        border: '1px solid rgba(156,94,108,0.15)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>💡</span>
        <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.5, margin: 0 }}>
          <b>Скоро:</b> цены от аптек-партнёров AIVITA прямо в приложении
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5 — Семья
// ═══════════════════════════════════════════════════════════════════════════════

const FAMILY_AVATARS = [C.accentBg, C.blueBg, C.purpleBg, C.orangeBg, C.greenBg];
const FAMILY_EMOJIS = ['👩', '👦', '👧', '👴', '👵'];

function TabFamily() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/proxy/medications/family');
        if (r.ok) setMembers((await r.json() as { data: FamilyMember[] }).data ?? []);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', fontSize: 14, color: C.t3 }}>
      Загружаю...
    </div>
  );

  if (members.length === 0) return (
    <div style={{ padding: '14px 16px' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1, marginBottom: 16 }}>👨‍👩‍👦 Семейный контроль</h1>
      <div style={{ padding: 32, borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>👨‍👩‍👧</span>
        <p style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 4 }}>Нет членов семьи</p>
        <p style={{ fontSize: 13, color: C.t3, marginBottom: 12 }}>Добавьте семью в разделе «Семья»</p>
        <Link href="/family" style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>Перейти →</Link>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ padding: '14px 20px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1 }}>👨‍👩‍👦 Семейный контроль</h1>
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: C.t3, padding: '0 20px 8px' }}>Сегодня</div>

      {members.map((m, idx) => {
        const allTaken = m.todayStats.total > 0 && m.todayStats.taken === m.todayStats.total;
        const hasPending = m.todayStats.pending > 0;
        const avatarBg = FAMILY_AVATARS[idx % FAMILY_AVATARS.length];
        const avatarEm = FAMILY_EMOJIS[idx % FAMILY_EMOJIS.length];

        const statusText = m.todayStats.total === 0
          ? { text: '✅ Нет активных лекарств', color: C.green }
          : allTaken
          ? { text: `✅ Все лекарства приняты (${m.todayStats.taken}/${m.todayStats.total})`, color: C.green }
          : hasPending
          ? { text: `⚠️ Принял ${m.todayStats.taken}/${m.todayStats.total} — ждём`, color: C.orange }
          : { text: `❌ Пропущено: ${m.todayStats.total - m.todayStats.taken}`, color: C.red };

        const needsReminder = hasPending && m.memberUserId;
        const btnStyle = hasPending
          ? { bg: C.orangeBg, color: '#856404', text: 'Напомнить' }
          : { bg: C.blueBg, color: C.blue, text: 'Детали' };

        return (
          <div key={m.memberId} style={{
            margin: '0 16px 10px', padding: 14, borderRadius: 16,
            background: C.card, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: avatarBg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18,
            }}>{avatarEm}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>
                {m.memberName} <span style={{ fontSize: 11, color: C.t3, fontWeight: 400 }}>({m.memberRelation})</span>
              </div>
              <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, color: statusText.color }}>
                {statusText.text}
              </div>
            </div>
            {(hasPending || m.todayStats.total > 0) && (
              <button
                onClick={async () => {
                  if (needsReminder) {
                    await fetch('/api/proxy/notifications/send', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: m.memberUserId, type: 'medication_reminder', message: `Не забудь принять лекарства! Осталось: ${m.todayStats.pending}` }),
                    }).catch(() => {});
                    alert(`Напоминание отправлено ${m.memberName}`);
                  }
                }}
                style={{
                  padding: '6px 12px', borderRadius: 10, border: 'none',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: btnStyle.bg, color: btnStyle.color, fontFamily: 'inherit',
                }}>
                {btnStyle.text}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
