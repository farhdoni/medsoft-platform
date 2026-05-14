'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

const PROXY = '/api/proxy';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VaxEntry { name: string; status: string; date?: string }

interface ChildCard {
  id: string;
  memberName: string;
  memberBirthDate: string | null;
  memberGender: string | null;
  memberRelation: string;
  cardNumber: string | null;
  heightCm: number | null;
  weightKg: string | null;
  bloodGroup: string | null;
  rhFactor: string | null;
  allergies: string[] | null;
  chronicDiseases: string[] | null;
  childDiseases: string[] | null;
  vaccinations: VaxEntry[] | null;
  parentNotes: string | null;
  migratedToUserId: string | null;
  vaccineCalendar: Array<{ name: string; rec: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Accordion Section ────────────────────────────────────────────────────────

function Section({ title, emoji, children, defaultOpen = false }: {
  title: string; emoji: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-white border mb-3 overflow-hidden" style={{ borderColor: '#e8e4dc' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>
          {emoji} {title}
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: '#9a96a8' }} aria-hidden="true" />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#9a96a8' }} aria-hidden="true" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#f0ece8' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Vax status badge ─────────────────────────────────────────────────────────

function VaxBadge({ status }: { status: string }) {
  if (status === 'done')     return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#d4e8d8', color: '#2a5a3a' }}>✅ Сделана</span>;
  if (status === 'not_done') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fde8e8', color: '#8a3a3a' }}>❌ Нет</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0ece8', color: '#9a96a8' }}>❓ Не знаю</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChildCardClient({ memberId, locale }: { memberId: string; locale: string }) {
  const [card,    setCard]    = useState<ChildCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);

  // Edit fields
  const [editNotes, setEditNotes] = useState('');

  const loadCard = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${PROXY}/family/${memberId}/card`);
      const json = await res.json() as { data?: ChildCard };
      if (json.data) {
        setCard(json.data);
        setEditNotes(json.data.parentNotes ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { void loadCard(); }, [loadCard]);

  async function handleSaveNotes() {
    if (!card) return;
    setSaving(true);
    try {
      await fetch(`${PROXY}/family/${memberId}/card`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentNotes: editNotes }),
      });
      setCard(prev => prev ? { ...prev, parentNotes: editNotes } : prev);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="pt-6 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#f0ece8' }} />
        ))}
      </div>
    );
  }

  if (!card) {
    return (
      <div className="pt-10 text-center">
        <p className="text-[15px] font-semibold" style={{ color: '#2a2540' }}>Карта не найдена</p>
        <Link href={`/${locale}/family`} className="text-[13px] mt-2 underline" style={{ color: '#6BA3D6' }}>
          ← Назад к семье
        </Link>
      </div>
    );
  }

  const age = card.memberBirthDate ? calcAge(card.memberBirthDate) : null;
  const shareUrl = card.cardNumber ? `https://aivita.uz/card/${card.cardNumber}` : '';

  return (
    <>
      {/* ── Back ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-4 pb-3">
        <Link
          href={`/${locale}/family`}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#f0ece8' }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: '#2a2540' }} aria-hidden="true" />
        </Link>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#9a96a8' }}>
          Медкарта ребёнка
        </p>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className="rounded-3xl p-6 mb-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #5580b0 0%, #6BA3D6 100%)' }}
      >
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />

        <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {card.memberRelation === 'son' ? 'СЫН' : card.memberRelation === 'daughter' ? 'ДОЧЬ' : 'РЕБЁНОК'}
        </p>
        <h1 className="text-[22px] font-extrabold text-white leading-tight mb-0.5">
          {card.memberName}
        </h1>
        {card.memberBirthDate && (
          <p className="text-[12px] mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {formatDate(card.memberBirthDate)}{age !== null ? ` · ${age} лет` : ''}
          </p>
        )}
        {card.cardNumber && (
          <p className="text-[13px] font-mono font-bold mb-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {card.cardNumber}
          </p>
        )}

        {/* QR code */}
        {card.cardNumber && shareUrl && (
          <div className="flex items-start gap-4">
            <div
              className="p-2.5 rounded-2xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <QRCodeSVG
                value={shareUrl}
                size={80}
                fgColor="#ffffff"
                bgColor="transparent"
                level="M"
              />
            </div>
            <div className="pt-1">
              <p className="text-[11px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                QR для врача
              </p>
              <p className="text-[10px] font-mono break-all" style={{ color: 'rgba(255,255,255,0.6)' }}>
                aivita.uz/card/{card.cardNumber}
              </p>
            </div>
          </div>
        )}

        {card.migratedToUserId && (
          <div
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
          >
            🔄 Мигрирована в личный аккаунт
          </div>
        )}
      </section>

      {/* ── Sections ──────────────────────────────────────────────────────── */}

      <Section title="Антропометрия" emoji="📏" defaultOpen>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[
            { label: 'Рост',          value: card.heightCm ? `${card.heightCm} см`    : '—' },
            { label: 'Вес',           value: card.weightKg ? `${card.weightKg} кг`    : '—' },
            { label: 'Группа крови',  value: [card.bloodGroup, card.rhFactor].filter(Boolean).join(' ') || '—' },
            { label: 'Возраст',       value: age !== null ? `${age} лет` : '—' },
          ].map(f => (
            <div key={f.label} className="rounded-xl p-3" style={{ background: '#f4f3ef' }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>{f.label}</p>
              <p className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>{f.value}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Аллергии" emoji="⚠️">
        <div className="mt-3">
          {(card.allergies ?? []).length === 0
            ? <p className="text-[13px]" style={{ color: '#9a96a8' }}>Не указаны</p>
            : (
              <div className="flex flex-wrap gap-2">
                {(card.allergies ?? []).map(a => (
                  <span key={a} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#fde8e8', color: '#8a3a3a' }}>
                    {a}
                  </span>
                ))}
              </div>
            )
          }
        </div>
      </Section>

      <Section title="Хронические заболевания" emoji="🏥">
        <div className="mt-3">
          {(card.chronicDiseases ?? []).length === 0
            ? <p className="text-[13px]" style={{ color: '#9a96a8' }}>Не указаны</p>
            : (
              <div className="flex flex-wrap gap-2">
                {(card.chronicDiseases ?? []).map(d => (
                  <span key={d} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#fff3cd', color: '#856404' }}>
                    {d}
                  </span>
                ))}
              </div>
            )
          }
        </div>
      </Section>

      <Section title="Детские болезни" emoji="🤧">
        <div className="mt-3">
          {(card.childDiseases ?? []).length === 0
            ? <p className="text-[13px]" style={{ color: '#9a96a8' }}>Не указаны</p>
            : (
              <div className="flex flex-wrap gap-2">
                {(card.childDiseases ?? []).map(d => (
                  <span key={d} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#dbeeff', color: '#4a7fb5' }}>
                    ✓ {d}
                  </span>
                ))}
              </div>
            )
          }
        </div>
      </Section>

      <Section title="Прививки" emoji="💉">
        <div className="mt-3 space-y-2">
          {(card.vaccineCalendar ?? []).length === 0 && (card.vaccinations ?? []).length === 0
            ? <p className="text-[13px]" style={{ color: '#9a96a8' }}>Не указаны</p>
            : (card.vaccineCalendar ?? []).map(v => {
              const entry = (card.vaccinations ?? []).find(e => e.name === v.name);
              return (
                <div key={v.name} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#f0ece8' }}>
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: '#2a2540' }}>{v.name}</p>
                    <p className="text-[10px]" style={{ color: '#9a96a8' }}>{v.rec}</p>
                  </div>
                  {entry ? <VaxBadge status={entry.status} /> : <span className="text-[10px]" style={{ color: '#b0acbc' }}>—</span>}
                </div>
              );
            })
          }
        </div>
      </Section>

      <Section title="Заметки родителя" emoji="📝">
        <div className="mt-3">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={4}
                autoFocus
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none focus:border-[#6BA3D6] transition-colors"
                style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void handleSaveNotes()}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-opacity"
                  style={{ background: '#6BA3D6' }}
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditNotes(card.parentNotes ?? ''); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-opacity"
                  style={{ background: '#f0ece8', color: '#9a96a8' }}
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <p className="flex-1 text-[13px] leading-relaxed" style={{ color: card.parentNotes ? '#2a2540' : '#9a96a8' }}>
                {card.parentNotes ?? 'Нет заметок'}
              </p>
              <button
                onClick={() => setEditing(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition hover:opacity-70"
                style={{ background: '#f0ece8' }}
              >
                <Edit2 className="w-3.5 h-3.5" style={{ color: '#9a96a8' }} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
