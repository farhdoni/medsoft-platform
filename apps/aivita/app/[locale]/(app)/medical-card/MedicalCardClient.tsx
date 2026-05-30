'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MedicalCardData } from './page';
import { compressImageFile } from '@/lib/image/compress';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LabResult {
  id: string;
  testName: string;
  value: string | null;
  unit: string | null;
  referenceRange: string | null;
  status: string | null;
  category: string | null;
  labName: string | null;
  doctorName: string | null;
  testedAt: string | null;
  documentUrl: string | null;
  notes: string | null;
  createdAt: string;
}

interface ParsedLabResult {
  testName: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  status?: string;
  date?: string;
}

interface ParsedMedication {
  name: string;
  dosage?: string;
  frequency?: string;
}

interface ParsedMedical {
  allergies: string[];
  chronicDiseases: string[];
  medications: ParsedMedication[];
  vaccinations: { name: string; date?: string }[];
  surgeries: { name: string; date?: string }[];
  diagnoses: { name: string; date?: string; doctor?: string }[];
  labResults: ParsedLabResult[];
}

interface SelectedItems {
  allergies: string[];
  chronicDiseases: string[];
  medications: ParsedMedication[];
  labResults: ParsedLabResult[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: string | null | undefined, fallback = '—') {
  return v?.trim() || fallback;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return '';
  const ms = Date.now() - new Date(dob).getTime();
  const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
  return `${years} лет`;
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Мужской', female: 'Женский', other: 'Другой',
};

const BLOOD_TYPE_MAP: Record<string, string> = {
  'A+': 'A (II) Rh+', 'A-': 'A (II) Rh−',
  'B+': 'B (III) Rh+', 'B-': 'B (III) Rh−',
  'AB+': 'AB (IV) Rh+', 'AB-': 'AB (IV) Rh−',
  'O+': 'O (I) Rh+', 'O-': 'O (I) Rh−',
};

const SMOKING_LABELS: Record<string, string> = {
  none: 'Не курю', occasional: 'Иногда', regular: 'Регулярно', ex: 'Бросил(а)',
};
const ALCOHOL_LABELS: Record<string, string> = {
  none: 'Не употребляю', occasional: 'Изредка', moderate: 'Умеренно', often: 'Часто',
};
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Малоактивный', light: 'Лёгкая активность',
  moderate: 'Умеренная активность', active: 'Высокая активность',
};
const SLEEP_LABELS: Record<string, string> = {
  '<6': 'Менее 6 часов', '6-7': '6–7 часов', '7-8': '7–8 часов', '8-9': '8–9 часов', '>9': 'Более 9 часов',
};

// ─── QR Code (simple data URL via canvas) ────────────────────────────────────

function QrPlaceholder({ code }: { code: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-2xl p-3"
      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', width: 90, height: 90 }}
    >
      <div className="grid grid-cols-5 gap-[2px]">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 10, height: 10, borderRadius: 2,
              background: (i % 7 === 0 || i % 3 === 0 || i === 12) ? 'white' : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>
      <span className="text-[9px] font-bold text-white/80 mt-1 tracking-wide">{code}</span>
    </div>
  );
}

// ─── AttachButton ─────────────────────────────────────────────────────────────

function AttachButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Прикрепить документ"
      className="flex items-center justify-center w-8 h-8 rounded-lg text-sm flex-shrink-0"
      style={{ background: '#e0d8f0', color: '#6a5a8e' }}
    >
      📎
    </button>
  );
}

// ─── Section accordion ────────────────────────────────────────────────────────

function Section({
  icon, title, children, defaultOpen = false, badge, onAttach,
}: {
  icon: string; title: string; children: React.ReactNode;
  defaultOpen?: boolean; badge?: string; onAttach?: () => void;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid #e8e4dc', background: 'white' }}
    >
      <div className="flex items-center hover:bg-gray-50 transition-colors">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left min-w-0"
        >
          <span className="text-xl">{icon}</span>
          <span className="flex-1 text-[14px] font-semibold" style={{ color: '#2a2540' }}>{title}</span>
          {badge && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-light, #f0d4dc)', color: 'var(--accent, #9c5e6c)' }}
            >
              {badge}
            </span>
          )}
          <span style={{ color: '#9a96a8', fontSize: 16, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>
        {onAttach && (
          <div className="pr-3">
            <AttachButton onClick={() => onAttach()} />
          </div>
        )}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: '#f0ece4' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-0" style={{ borderColor: '#f5f3ef' }}>
      <span className="text-[12px]" style={{ color: '#9a96a8' }}>{label}</span>
      <span className="text-[13px] font-medium text-right ml-4 max-w-[55%]" style={{ color: '#2a2540' }}>{value}</span>
    </div>
  );
}

function Tag({ label, color = '#f0d4dc', textColor = '#9c5e6c' }: { label: string; color?: string; textColor?: string }) {
  return (
    <span
      className="inline-block text-[12px] font-medium px-3 py-1 rounded-full mr-1.5 mb-1.5"
      style={{ background: color, color: textColor }}
    >
      {label}
    </span>
  );
}

// ─── LabResultCard ────────────────────────────────────────────────────────────

function LabResultCard({ result }: { result: LabResult }) {
  const isAbnormal = result.status === 'abnormal' || result.status === 'critical';
  const borderColor = result.status === 'normal' ? '#4caf50' : result.status === 'borderline' ? '#ff9800' : '#f44336';
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
      style={{ background: isAbnormal ? '#fde8e8' : '#f4faf4', borderLeft: `4px solid ${borderColor}` }}
    >
      <div>
        <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>{result.testName}</p>
        {result.labName && <p className="text-[10px]" style={{ color: '#9a96a8' }}>{result.labName}</p>}
        {result.testedAt && <p className="text-[10px]" style={{ color: '#9a96a8' }}>{result.testedAt}</p>}
      </div>
      <div className="text-right">
        <p className="text-[14px] font-bold" style={{ color: isAbnormal ? '#b03030' : '#2a7040' }}>
          {result.value} {result.unit}
        </p>
        {result.referenceRange && (
          <p className="text-[10px]" style={{ color: '#9a96a8' }}>норма: {result.referenceRange}</p>
        )}
      </div>
    </div>
  );
}

// ─── SuggestionsModal ─────────────────────────────────────────────────────────

function SuggestionsModal({
  suggestions,
  selected,
  setSelected,
  applying,
  onApply,
  onClose,
}: {
  suggestions: ParsedMedical;
  selected: SelectedItems;
  setSelected: React.Dispatch<React.SetStateAction<SelectedItems>>;
  applying: boolean;
  onApply: () => void;
  onClose: () => void;
}) {
  function toggleAllergy(a: string) {
    setSelected(s => ({
      ...s,
      allergies: s.allergies.includes(a) ? s.allergies.filter(x => x !== a) : [...s.allergies, a],
    }));
  }
  function toggleDisease(d: string) {
    setSelected(s => ({
      ...s,
      chronicDiseases: s.chronicDiseases.includes(d) ? s.chronicDiseases.filter(x => x !== d) : [...s.chronicDiseases, d],
    }));
  }
  function toggleMed(m: ParsedMedication) {
    setSelected(s => {
      const exists = s.medications.some(x => x.name === m.name);
      return {
        ...s,
        medications: exists ? s.medications.filter(x => x.name !== m.name) : [...s.medications, m],
      };
    });
  }
  function toggleLab(lr: ParsedLabResult) {
    setSelected(s => {
      const idx = s.labResults.findIndex(x => x.testName === lr.testName && x.date === lr.date);
      return {
        ...s,
        labResults: idx >= 0 ? s.labResults.filter((_, i) => i !== idx) : [...s.labResults, lr],
      };
    });
  }

  const content = (
    <div
      className="fixed inset-0 flex items-end justify-center z-[200]"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-[480px] rounded-t-3xl flex flex-col"
        style={{ background: '#fff', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <p className="text-[16px] font-bold" style={{ color: '#2a2540' }}>🤖 Найдено в документе</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#f4f3ef', color: '#6a6580' }}
          >
            ✕
          </button>
        </div>
        <p className="text-[12px] px-5 pb-3 flex-shrink-0" style={{ color: '#9a96a8' }}>
          Отметьте данные, которые хотите добавить в медкарту
        </p>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col gap-4">

          {/* Allergies */}
          {suggestions.allergies.length > 0 && (
            <div>
              <p className="text-[13px] font-semibold mb-2" style={{ color: '#2a2540' }}>⚠️ Аллергии</p>
              <div className="flex flex-col gap-1.5">
                {suggestions.allergies.map(a => (
                  <label key={a} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.allergies.includes(a)}
                      onChange={() => toggleAllergy(a)}
                      className="w-4 h-4 accent-[#9c5e6c]"
                    />
                    <span className="text-[13px]" style={{ color: '#2a2540' }}>{a}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Chronic diseases */}
          {suggestions.chronicDiseases.length > 0 && (
            <div>
              <p className="text-[13px] font-semibold mb-2" style={{ color: '#2a2540' }}>🏥 Хронические заболевания</p>
              <div className="flex flex-col gap-1.5">
                {suggestions.chronicDiseases.map(d => (
                  <label key={d} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.chronicDiseases.includes(d)}
                      onChange={() => toggleDisease(d)}
                      className="w-4 h-4 accent-[#9c5e6c]"
                    />
                    <span className="text-[13px]" style={{ color: '#2a2540' }}>{d}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Medications */}
          {suggestions.medications.length > 0 && (
            <div>
              <p className="text-[13px] font-semibold mb-2" style={{ color: '#2a2540' }}>💊 Препараты</p>
              <div className="flex flex-col gap-1.5">
                {suggestions.medications.map(m => (
                  <label key={m.name} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.medications.some(x => x.name === m.name)}
                      onChange={() => toggleMed(m)}
                      className="w-4 h-4 accent-[#9c5e6c]"
                    />
                    <span className="text-[13px]" style={{ color: '#2a2540' }}>
                      {m.name}
                      {m.dosage && <span style={{ color: '#9a96a8' }}> — {m.dosage}</span>}
                      {m.frequency && <span style={{ color: '#9a96a8' }}>, {m.frequency}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Lab results */}
          {suggestions.labResults.length > 0 && (
            <div>
              <p className="text-[13px] font-semibold mb-2" style={{ color: '#2a2540' }}>🧪 Лабораторные результаты</p>
              <div className="flex flex-col gap-2">
                {suggestions.labResults.map((lr, i) => {
                  const isChecked = selected.labResults.some(x => x.testName === lr.testName && x.date === lr.date);
                  const isAbnormal = lr.status === 'abnormal' || lr.status === 'critical';
                  return (
                    <label key={i} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleLab(lr)}
                        className="w-4 h-4 mt-0.5 accent-[#9c5e6c]"
                      />
                      <div
                        className="flex-1 rounded-lg px-3 py-2 flex items-center justify-between"
                        style={{
                          background: isAbnormal ? '#fde8e8' : '#f4faf4',
                          borderLeft: `3px solid ${isAbnormal ? '#f44336' : '#4caf50'}`,
                        }}
                      >
                        <div>
                          <p className="text-[12px] font-semibold" style={{ color: '#2a2540' }}>{lr.testName}</p>
                          {lr.date && <p className="text-[10px]" style={{ color: '#9a96a8' }}>{lr.date}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-bold" style={{ color: isAbnormal ? '#b03030' : '#2a7040' }}>
                            {lr.value} {lr.unit}
                          </p>
                          {lr.referenceRange && (
                            <p className="text-[10px]" style={{ color: '#9a96a8' }}>норма: {lr.referenceRange}</p>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nothing found */}
          {suggestions.allergies.length === 0 &&
           suggestions.chronicDiseases.length === 0 &&
           suggestions.medications.length === 0 &&
           suggestions.labResults.length === 0 && (
            <p className="text-[13px] text-center py-8" style={{ color: '#9a96a8' }}>
              В документе не найдено медицинских данных для добавления
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-3 flex-shrink-0 border-t" style={{ borderColor: '#f0ece4' }}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-[14px] font-semibold"
            style={{ background: '#f4f3ef', color: '#2a2540' }}
          >
            Отмена
          </button>
          <button
            onClick={onApply}
            disabled={applying}
            className="flex-1 py-3 rounded-2xl text-[14px] font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--accent, #9c5e6c) 0%, var(--accent-dark, #7a3d4a) 100%)' }}
          >
            {applying ? 'Добавляю…' : 'Добавить в карту'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MedicalCardClient({ data, locale }: { data: MedicalCardData | null; locale: string }) {
  const router = useRouter();

  // Lab results state
  const [labResults, setLabResults] = React.useState<LabResult[]>([]);
  const [labLoading, setLabLoading] = React.useState(true);

  // Document parsing state
  const [parsing, setParsing] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<ParsedMedical | null>(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = React.useState(false);
  const [selected, setSelected] = React.useState<SelectedItems>({
    allergies: [], chronicDiseases: [], medications: [], labResults: [],
  });
  const [applying, setApplying] = React.useState(false);
  const [applySuccess, setApplySuccess] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch lab results on mount
  React.useEffect(() => {
    fetch('/api/proxy/medical/lab-results')
      .then(r => r.json())
      .then((j: { data?: LabResult[] }) => setLabResults(j.data ?? []))
      .catch(() => {})
      .finally(() => setLabLoading(false));
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    const fd = new FormData();
    fd.append('file', await compressImageFile(file));
    try {
      const res = await fetch('/api/proxy/medical/parse-document', { method: 'POST', body: fd });
      const j = await res.json() as { data: ParsedMedical };
      setSuggestions(j.data);
      // Pre-select all
      setSelected({
        allergies:       j.data.allergies ?? [],
        chronicDiseases: j.data.chronicDiseases ?? [],
        medications:     j.data.medications ?? [],
        labResults:      j.data.labResults ?? [],
      });
      setShowSuggestionsModal(true);
    } catch {
      // ignore
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleApply() {
    setApplying(true);
    try {
      await fetch('/api/proxy/medical/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected),
      });
      setShowSuggestionsModal(false);
      setSuggestions(null);
      setApplySuccess('Данные добавлены в профиль!');
      setTimeout(() => setApplySuccess(''), 3000);
      router.refresh();
      // Refresh lab results
      fetch('/api/proxy/medical/lab-results')
        .then(r => r.json())
        .then((j: { data?: LabResult[] }) => setLabResults(j.data ?? []))
        .catch(() => {});
    } catch {
      // ignore
    } finally {
      setApplying(false);
    }
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-5xl">📋</div>
        <p className="text-[16px] font-semibold" style={{ color: '#2a2540' }}>Медкарта не найдена</p>
        <p className="text-[13px] text-center" style={{ color: '#9a96a8' }}>
          Пройдите онбординг, чтобы создать медицинскую карту
        </p>
        <Link
          href={`/${locale}/onboarding`}
          className="mt-2 px-6 py-3 rounded-2xl text-white font-semibold text-[14px]"
          style={{ background: 'linear-gradient(135deg, var(--accent, #9c5e6c) 0%, var(--accent-dark, #7a3d4a) 100%)' }}
        >
          Пройти онбординг
        </Link>
      </div>
    );
  }

  const { card, completionPercent, isMinor, personal, body, allergies, chronicConditions, lifestyle, emergency, doctor, insurance, teen } = data;

  // Compute BMI
  let bmi = '';
  if (body.height && body.weight) {
    const h = body.height / 100;
    const w = parseFloat(body.weight);
    if (h > 0 && w > 0) {
      const val = w / (h * h);
      bmi = val.toFixed(1);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">

      {/* ── Parsing toast ── */}
      {parsing && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg"
          style={{ background: '#2a2540', color: 'white', maxWidth: 320 }}
        >
          <span className="animate-spin text-lg">⏳</span>
          <span className="text-[13px] font-semibold">🤖 Анализирую документ…</span>
        </div>
      )}

      {/* ── Success toast ── */}
      {applySuccess && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg"
          style={{ background: '#2a7040', color: 'white', maxWidth: 320 }}
        >
          <span>✅</span>
          <span className="text-[13px] font-semibold">{applySuccess}</span>
        </div>
      )}

      {/* ── Hero card ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-5 flex flex-col gap-3"
        style={{
          background: 'linear-gradient(135deg, var(--accent, #9c5e6c) 0%, var(--accent-dark, #7a3d4a) 100%)',
          minHeight: 180,
        }}
      >
        {/* decorative circles */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">Медицинская карта</p>
            <p className="text-[22px] font-bold text-white mt-0.5">{fmt(personal.name)}</p>
            {personal.dateOfBirth && (
              <p className="text-[13px] text-white/80 mt-0.5">{fmtDate(personal.dateOfBirth)} · {calcAge(personal.dateOfBirth)}</p>
            )}
          </div>
          {card?.cardCode && <QrPlaceholder code={card.cardCode} />}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {body.bloodType && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="text-base">🩸</span>
              <span className="text-[13px] font-bold text-white">{BLOOD_TYPE_MAP[body.bloodType] ?? body.bloodType}</span>
            </div>
          )}
          {card?.cardCode && (
            <div className="px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="text-[12px] font-bold text-white/90 font-mono">{card.cardCode}</span>
            </div>
          )}
          {isMinor && (
            <div className="px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <span className="text-[12px] font-bold text-white">👶 Несовершеннолетний</span>
            </div>
          )}
        </div>

        {/* completion bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-white/70">Заполненность карты</span>
            <span className="text-[12px] font-bold text-white">{completionPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${completionPercent}%`, background: 'white' }}
            />
          </div>
        </div>
      </div>

      {/* ── Edit / onboarding CTA if incomplete ── */}
      {completionPercent < 80 && (
        <Link
          href={`/${locale}/onboarding`}
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
          style={{ background: '#fdf4e8', border: '1px solid #f5d9a0' }}
        >
          <span className="text-xl">✏️</span>
          <div className="flex-1">
            <p className="text-[13px] font-semibold" style={{ color: '#8a6a20' }}>Дополните карту</p>
            <p className="text-[11px]" style={{ color: '#b89040' }}>Заполнено {completionPercent}% — добавьте данные для врачей</p>
          </div>
          <span style={{ color: '#b89040' }}>›</span>
        </Link>
      )}

      {/* ── Hidden file input ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.txt,.doc,.docx"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ── Sections ── */}

      {/* 1. Personal */}
      <Section icon="👤" title="Личные данные" defaultOpen>
        <Row label="ФИО" value={fmt(personal.name)} />
        <Row label="Email" value={fmt(personal.email)} />
        <Row label="Дата рождения" value={personal.dateOfBirth ? `${fmtDate(personal.dateOfBirth)} (${calcAge(personal.dateOfBirth)})` : '—'} />
        <Row label="Пол" value={personal.gender ? (GENDER_LABELS[personal.gender] ?? personal.gender) : '—'} />
        <Row label="Телефон" value={fmt(personal.phone)} />
        <Row label="Город" value={fmt(personal.city)} />
        {personal.pinfl && <Row label="ПИНФЛ" value={personal.pinfl} />}
      </Section>

      {/* 2. Body metrics */}
      <Section icon="📏" title="Физические параметры" badge={body.bloodType ?? undefined}>
        <Row label="Рост" value={body.height ? `${body.height} см` : '—'} />
        <Row label="Вес" value={body.weight ? `${body.weight} кг` : '—'} />
        <Row label="Группа крови" value={body.bloodType ? (BLOOD_TYPE_MAP[body.bloodType] ?? body.bloodType) : '—'} />
        {bmi && <Row label="ИМТ" value={`${bmi} кг/м²`} />}
      </Section>

      {/* 3. Allergies */}
      <Section
        icon="⚠️"
        title="Аллергии"
        badge={allergies.length > 0 ? String(allergies.length) : undefined}
        onAttach={() => fileInputRef.current?.click()}
      >
        {allergies.length === 0 ? (
          <p className="text-[13px] py-2" style={{ color: '#9a96a8' }}>Аллергии не указаны</p>
        ) : (
          <div className="pt-2 flex flex-wrap">
            {allergies.map(a => (
              <Tag key={a.id} label={a.allergen} color="#fde8e8" textColor="#b03030" />
            ))}
          </div>
        )}
      </Section>

      {/* 4. Lab Results */}
      <Section
        icon="🧪"
        title="Лабораторные исследования"
        badge={labResults.length > 0 ? String(labResults.length) : undefined}
        onAttach={() => fileInputRef.current?.click()}
      >
        {labLoading ? (
          <div className="py-2 animate-pulse h-8 bg-gray-100 rounded" />
        ) : labResults.length === 0 ? (
          <p className="text-[13px] py-2" style={{ color: '#9a96a8' }}>Результаты не добавлены</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {labResults.map(lr => (
              <LabResultCard key={lr.id} result={lr} />
            ))}
          </div>
        )}
      </Section>

      {/* 5. Chronic conditions */}
      <Section
        icon="🏥"
        title="Хронические заболевания"
        badge={chronicConditions.length > 0 ? String(chronicConditions.length) : undefined}
        onAttach={() => fileInputRef.current?.click()}
      >
        {chronicConditions.length === 0 ? (
          <p className="text-[13px] py-2" style={{ color: '#9a96a8' }}>Хронические заболевания не указаны</p>
        ) : (
          <div className="pt-2 flex flex-wrap">
            {chronicConditions.map(c => (
              <Tag key={c.id} label={c.diagnosedYear ? `${c.name} (${c.diagnosedYear})` : c.name} color="#e8eef8" textColor="#2a4080" />
            ))}
          </div>
        )}
      </Section>

      {/* 6. Lifestyle */}
      {!isMinor && (
        <Section icon="🏃" title="Образ жизни">
          <Row label="Курение" value={lifestyle.smoking ? (SMOKING_LABELS[lifestyle.smoking] ?? lifestyle.smoking) : '—'} />
          <Row label="Алкоголь" value={lifestyle.alcohol ? (ALCOHOL_LABELS[lifestyle.alcohol] ?? lifestyle.alcohol) : '—'} />
          <Row label="Физическая активность" value={lifestyle.activity ? (ACTIVITY_LABELS[lifestyle.activity] ?? lifestyle.activity) : '—'} />
          <Row label="Сон" value={lifestyle.sleep ? (SLEEP_LABELS[lifestyle.sleep] ?? lifestyle.sleep) : '—'} />
          {lifestyle.diet && <Row label="Диета" value={lifestyle.diet} />}
          {lifestyle.nutrition && <Row label="Питание" value={lifestyle.nutrition} />}
        </Section>
      )}

      {/* 7. Emergency contact */}
      <Section icon="🆘" title="Экстренный контакт">
        {!emergency.name && !emergency.phone ? (
          <p className="text-[13px] py-2" style={{ color: '#9a96a8' }}>Экстренный контакт не указан</p>
        ) : (
          <>
            <Row label="Имя" value={fmt(emergency.name)} />
            <Row label="Телефон" value={fmt(emergency.phone)} />
            <Row label="Отношение" value={fmt(emergency.relation)} />
          </>
        )}
      </Section>

      {/* 8. Doctor / clinic */}
      <Section icon="🩺" title="Лечащий врач">
        {!doctor.name && !doctor.clinic ? (
          <p className="text-[13px] py-2" style={{ color: '#9a96a8' }}>Лечащий врач не указан</p>
        ) : (
          <>
            <Row label="Врач" value={fmt(doctor.name)} />
            {doctor.phone && <Row label="Телефон" value={doctor.phone} />}
            <Row label="Клиника" value={fmt(doctor.clinic)} />
          </>
        )}
      </Section>

      {/* 9. Insurance */}
      <Section icon="🛡️" title="Страховка">
        {!insurance.company ? (
          <p className="text-[13px] py-2" style={{ color: '#9a96a8' }}>Страховой полис не указан</p>
        ) : (
          <>
            <Row label="Страховая компания" value={fmt(insurance.company)} />
            <Row label="Номер полиса" value={fmt(insurance.number)} />
            <Row label="Действует до" value={fmtDate(insurance.expires)} />
            {insurance.hotline && <Row label="Горячая линия" value={insurance.hotline} />}
          </>
        )}
      </Section>

      {/* 10–12. Teen sections */}
      {isMinor && teen && (
        <>
          <Section icon="🏫" title="Школа">
            <Row label="Школа" value={fmt(teen.school)} />
            <Row label="Класс" value={fmt(teen.grade)} />
            <Row label="Зрение" value={fmt(teen.visionStatus)} />
          </Section>

          {teen.childDiseases && teen.childDiseases.length > 0 && (
            <Section icon="💉" title="Детские болезни" badge={String(teen.childDiseases.length)}>
              <div className="pt-2 flex flex-wrap">
                {teen.childDiseases.map((d, i) => (
                  <Tag key={i} label={d} color="#e8f0e8" textColor="#2a6040" />
                ))}
              </div>
            </Section>
          )}

          {teen.vaccinationHistory && teen.vaccinationHistory.length > 0 && (
            <Section icon="🩹" title="Вакцинация" badge={String(teen.vaccinationHistory.length)}>
              <div className="mt-2 flex flex-col gap-1">
                {teen.vaccinationHistory.map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#f5f3ef' }}>
                    <span className="text-[13px]" style={{ color: '#2a2540' }}>{v.name}</span>
                    <div className="flex items-center gap-2">
                      {v.date && <span className="text-[11px]" style={{ color: '#9a96a8' }}>{fmtDate(v.date)}</span>}
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: v.status === 'done' ? '#e8f5e8' : v.status === 'partial' ? '#fef8e8' : '#f5f0f0',
                          color: v.status === 'done' ? '#2a7040' : v.status === 'partial' ? '#8a6020' : '#8a3030',
                        }}
                      >
                        {v.status === 'done' ? 'Сделана' : v.status === 'partial' ? 'Частично' : 'Не сделана'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section icon="🏃" title="Образ жизни (подросток)">
            <Row label="Физическая активность" value={teen.screenTime ? (ACTIVITY_LABELS[teen.screenTime] ?? teen.screenTime) : '—'} />
            {lifestyle.activity && <Row label="Активность" value={ACTIVITY_LABELS[lifestyle.activity] ?? lifestyle.activity} />}
            {lifestyle.sleep && <Row label="Сон" value={SLEEP_LABELS[lifestyle.sleep] ?? lifestyle.sleep} />}
            {teen.screenTime && <Row label="Экранное время" value={teen.screenTime} />}
          </Section>
        </>
      )}

      {/* 13. Card info */}
      {card && (
        <Section icon="📋" title="Информация о карте">
          <Row label="Номер карты" value={card.cardCode} />
          <Row label="Создана" value={fmtDate(card.createdAt)} />
          <Row label="Статус" value={card.isActive ? 'Активна' : 'Неактивна'} />
          <Row label="Кол-во сканирований" value={String(card.accessCount)} />
        </Section>
      )}

      {/* Share / print action */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-semibold transition-colors"
          style={{ background: '#f5f3ef', color: '#2a2540' }}
        >
          🖨️ Распечатать
        </button>
        <Link
          href={`/${locale}/onboarding`}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-semibold"
          style={{ background: 'linear-gradient(135deg, var(--accent, #9c5e6c) 0%, var(--accent-dark, #7a3d4a) 100%)', color: 'white' }}
        >
          ✏️ Редактировать
        </Link>
      </div>

      {/* ── Suggestions Modal (portal) ── */}
      {showSuggestionsModal && suggestions && (
        <SuggestionsModal
          suggestions={suggestions}
          selected={selected}
          setSelected={setSelected}
          applying={applying}
          onApply={() => void handleApply()}
          onClose={() => { setShowSuggestionsModal(false); setSuggestions(null); }}
        />
      )}
    </div>
  );
}
