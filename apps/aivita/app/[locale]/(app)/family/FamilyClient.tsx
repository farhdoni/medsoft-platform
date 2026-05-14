'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Plus, Shield, Clock, UserCheck, UserX } from 'lucide-react';
import { Icon } from '@/components/cabinet/icons/Icon';
import { FamilyMemberModal, type FamilyMember } from '@/components/family/FamilyMemberModal';

const PROXY = '/api/proxy';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkRequest {
  id: string;
  fromUserId: string;
  fromName: string | null;
  fromAvatarUrl: string | null;
  familyMemberId: string;
  createdAt: string;
}

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
  const [members,      setMembers]      = useState<FamilyMember[]>([]);
  const [requests,     setRequests]     = useState<LinkRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editMember,   setEditMember]   = useState<FamilyMember | null>(null);
  const [responding,   setResponding]   = useState<string | null>(null); // request id being responded to

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, requestsRes] = await Promise.all([
        fetch(`${PROXY}/family`),
        fetch(`${PROXY}/family/link-requests`),
      ]);
      const membersJson = await membersRes.json() as { data?: FamilyMember[] };
      const requestsJson = await requestsRes.json() as { data?: LinkRequest[] };
      setMembers(membersJson.data ?? []);
      setRequests(requestsJson.data ?? []);
    } catch {
      setMembers([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  function openAdd() { setEditMember(null); setModalOpen(true); }
  function openEdit(m: FamilyMember) { setEditMember(m); setModalOpen(true); }

  async function handleRespond(requestId: string, action: 'accept' | 'reject') {
    setResponding(requestId);
    try {
      await fetch(`${PROXY}/family/link-request/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await loadData();
    } catch {
      // silently ignore
    } finally {
      setResponding(null);
    }
  }

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

      {/* ── Incoming link requests ────────────────────────────────────────── */}
      {!loading && requests.length > 0 && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#9a96a8' }}>
            📨 Запросы на привязку
          </p>
          <div className="space-y-2 mb-5">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: '#fffbf0', border: '1px solid #ffe7a0' }}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg overflow-hidden"
                  style={{ background: '#f0d4dc' }}
                >
                  {req.fromAvatarUrl
                    ? <img src={req.fromAvatarUrl} alt="" className="w-full h-full object-cover" />
                    : '👤'}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>
                    {req.fromName ?? 'Пользователь Aivita'}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#6a6580' }}>
                    хочет добавить вас в семью
                  </p>

                  {/* Buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => void handleRespond(req.id, 'accept')}
                      disabled={responding === req.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition hover:opacity-80 disabled:opacity-40"
                      style={{ background: '#d4e8d8', color: '#2a5a3a' }}
                    >
                      <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      {responding === req.id ? '…' : '✅ Принять'}
                    </button>
                    <button
                      onClick={() => void handleRespond(req.id, 'reject')}
                      disabled={responding === req.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition hover:opacity-80 disabled:opacity-40"
                      style={{ background: '#fde8e8', color: '#8a3a3a' }}
                    >
                      <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                      Отклонить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Members list (skeleton) ───────────────────────────────────────── */}
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
            {members.map((m, idx) => {
              const isPending = m.inviteStatus === 'pending';
              const isRejected = m.inviteStatus === 'rejected';
              return (
                <button
                  key={m.id}
                  onClick={() => openEdit(m)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border text-left transition-colors hover:bg-[#faf8f5] active:scale-[0.99]"
                  style={{ borderColor: isPending ? '#ffe7a0' : '#e8e4dc' }}
                >
                  <div
                    className="w-11 h-11 rounded-[14px] flex-shrink-0 flex items-center justify-center text-xl"
                    style={{ background: SOFT_BGS[idx % SOFT_BGS.length] }}
                  >
                    {RELATION_EMOJIS[m.memberRelation] ?? '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>{m.memberName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-[11px]" style={{ color: '#9a96a8' }}>
                        {RELATION_LABELS[m.memberRelation] ?? m.memberRelation}
                        {!isPending && !isRejected && m.memberBirthDate
                          ? ` · ${calcAge(m.memberBirthDate)} лет`
                          : ''}
                      </p>
                      {isPending && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold"
                          style={{ background: '#fff3cd', color: '#856404' }}
                        >
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          Ожидает подтверждения
                        </span>
                      )}
                      {isRejected && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold"
                          style={{ background: '#fde8e8', color: '#8a3a3a' }}
                        >
                          Отклонено
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#9a96a8' }} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && members.length === 0 && requests.length === 0 && (
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
        <Plus className="w-4 h-4" aria-hidden="true" />
        Добавить члена семьи
      </button>

      {/* ── Privacy note ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: '#fdf0f3', border: '1px solid #f0d4dc' }}>
        <div className="w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <Shield className="w-4 h-4" style={{ color: '#9c5e6c' }} aria-hidden="true" />
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
        onSaved={() => void loadData()}
      />
    </>
  );
}
