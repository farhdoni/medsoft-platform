'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Plus, Shield } from 'lucide-react';
import { Icon } from '@/components/cabinet/icons/Icon';
import { FamilyMemberModal, type FamilyMember } from '@/components/family/FamilyMemberModal';

const PROXY = '/api/proxy';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function plural(n: number): string {
  if (n === 1) return 'участник';
  if (n >= 2 && n <= 4) return 'участника';
  return 'участников';
}

const RELATION_LABELS: Record<string, string> = {
  wife: 'Жена', husband: 'Муж', son: 'Сын', daughter: 'Дочь',
  mother: 'Мама', father: 'Папа', brother: 'Брат', sister: 'Сестра',
  spouse: 'Супруг/а', child: 'Ребёнок', parent: 'Родитель', other: 'Другое',
};

const SOFT_BGS = ['#f0d4dc', '#e8e4f8', '#d4e8d8', '#d4dff0', '#e8f0d4'];

const RELATION_EMOJIS: Record<string, string> = {
  wife: '👩', husband: '👨', son: '👦', daughter: '👧',
  mother: '👩‍🦳', father: '👨‍🦳', brother: '🧑', sister: '👩',
  spouse: '💑', child: '🧒', parent: '🧑‍🦳', other: '👤',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function FamilyClient() {
  const [members,    setMembers]    = useState<FamilyMember[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${PROXY}/family`);
      const json = await res.json() as { data?: FamilyMember[] };
      setMembers(json.data ?? []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  function openAdd() { setEditMember(null); setModalOpen(true); }
  function openEdit(m: FamilyMember) { setEditMember(m); setModalOpen(true); }

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className="rounded-3xl p-6 mb-5 flex items-center gap-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--accent, #9c5e6c) 0%, var(--accent-dark, #7a3d4a) 100%)' }}
      >
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>СЕМЬЯ</p>
          <p className="text-[22px] font-extrabold text-white leading-tight">
            {loading ? '…' : members.length === 0 ? 'Пригласи близких' : `${members.length} ${plural(members.length)}`}
          </p>
          <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Здоровье близких в одном месте
          </p>
        </div>
        <div className="flex-shrink-0"><Icon name="family" size={56} /></div>
      </section>

      {/* ── Members list ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-2 mb-5">
          {[1, 2].map(i => (
            <div key={i} className="h-[70px] rounded-2xl bg-white border animate-pulse" style={{ borderColor: '#e8e4dc' }} />
          ))}
        </div>
      )}

      {!loading && members.length > 0 && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#9a96a8' }}>Члены семьи</p>
          <div className="space-y-2 mb-5">
            {members.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => openEdit(m)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border text-left transition-colors hover:bg-[#faf8f5] active:scale-[0.99]"
                style={{ borderColor: '#e8e4dc' }}
              >
                <div
                  className="w-11 h-11 rounded-[14px] flex-shrink-0 flex items-center justify-center text-xl"
                  style={{ background: SOFT_BGS[idx % SOFT_BGS.length] }}
                >
                  {RELATION_EMOJIS[m.memberRelation] ?? '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>{m.memberName}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#9a96a8' }}>
                    {RELATION_LABELS[m.memberRelation] ?? m.memberRelation}
                    {m.memberBirthDate ? ` · ${calcAge(m.memberBirthDate)} лет` : ''}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#9a96a8' }} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center mb-5">
          <div className="w-20 h-20 rounded-[24px] flex items-center justify-center" style={{ background: '#e8e4f8' }}>
            <Icon name="family" size={40} />
          </div>
          <p className="text-[15px] font-semibold" style={{ color: '#2a2540' }}>Семья пока пуста</p>
          <p className="text-[13px] max-w-[220px] leading-relaxed" style={{ color: '#9a96a8' }}>
            Добавь близких, чтобы следить за их здоровьем в одном месте
          </p>
        </div>
      )}

      {/* ── Add button ────────────────────────────────────────────────────── */}
      <button
        onClick={openAdd}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-white text-[13px] font-semibold border-2 border-dashed transition-colors mb-5 hover:bg-[#faf8f5]"
        style={{ borderColor: '#e8e4dc', color: 'var(--accent, #9c5e6c)' }}
      >
        <Plus className="w-4 h-4" />
        Добавить члена семьи
      </button>

      {/* ── Privacy note ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: '#fdf0f3', border: '1px solid #f0d4dc' }}>
        <div className="w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <Shield className="w-4 h-4" style={{ color: '#9c5e6c' }} />
        </div>
        <div>
          <p className="text-[13px] font-semibold mb-0.5" style={{ color: '#2a2540' }}>Что видит семья</p>
          <p className="text-[11px] leading-relaxed" style={{ color: '#6a6580' }}>
            Общие метрики (Health Score, шаги). <strong>Не видят:</strong> AI-чат, мед. документы, заметки.
          </p>
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <FamilyMemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        member={editMember}
        onSaved={() => void loadMembers()}
      />
    </>
  );
}
