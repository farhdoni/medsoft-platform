'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';

interface Patient {
  connection: { consultationCount: number; lastConsultationAt?: string };
  user: { id: string; name: string; avatarUrl?: string };
}
interface Note { id: string; text: string; isPinned: boolean; createdAt: string; doctorId: string; }

function initials(n: string) { return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function fmtTime(s: string) {
  const d = new Date(s);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
}

export default function DoctorChatsPage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiRequest<Patient[]>('/doctor/patients?status=active')
      .then(res => { if ('data' in res) setPatients(res.data ?? []); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingNotes(true);
    setNotes([]);
    apiRequest<Note[]>(`/doctor/notes?patientId=${selected.user.id}`)
      .then(res => { if ('data' in res) setNotes((res.data ?? []).slice().reverse()); })
      .finally(() => setLoadingNotes(false));
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const handleSend = async () => {
    if (!input.trim() || !selected) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    const res = await apiRequest<Note>('/doctor/notes', {
      method: 'POST', body: { patientId: selected.user.id, text },
    });
    if ('data' in res) setNotes(prev => [...prev, res.data]);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Mobile: show list or chat
  const [showList, setShowList] = useState(true);

  if (loading) return (
    <div className="min-h-screen bg-[#f4f3ef] flex items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-[#6e5fa0] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f3ef] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#f4f3ef]/90 backdrop-blur-md px-4 pt-12 pb-3 flex items-center gap-3">
        {!showList && selected && (
          <button onClick={() => { setShowList(true); setSelected(null); }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border text-[#6e5fa0] font-bold text-lg" style={{ borderColor: '#e8e4dc' }}>‹</button>
        )}
        <h1 className="text-xl font-bold text-[#2a2540] flex-1">
          {!showList && selected ? selected.user.name : 'Чаты'}
        </h1>
        {!showList && selected && (
          <Link href={`/${locale}/doctor-patient/${selected.user.id}`}
            className="text-xs text-[#6e5fa0] font-medium">Карточка →</Link>
        )}
      </div>

      {/* Patient list */}
      {showList && (
        <div className="px-4 pb-4 space-y-2 flex-1">
          {patients.length === 0 && (
            <div className="text-center py-12">
              <Icon3D name="chat" size={48} />
              <p className="text-[#9a96a8] text-sm mt-3">Нет активных пациентов</p>
            </div>
          )}
          {patients.map(p => {
            return (
              <button key={p.user.id} onClick={() => { setSelected(p); setShowList(false); }}
                className="w-full bg-white rounded-2xl p-4 border flex items-center gap-3 text-left active:opacity-80"
                style={{ borderColor: '#e8e4dc' }}>
                <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                  style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
                  {initials(p.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2a2540] text-sm">{p.user.name}</p>
                  <p className="text-xs text-[#9a96a8] mt-0.5">{p.connection.consultationCount} консультаций</p>
                </div>
                {p.connection.lastConsultationAt && (
                  <span className="text-[10px] text-[#9a96a8] flex-shrink-0">{fmtTime(p.connection.lastConsultationAt)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Chat view */}
      {!showList && selected && (
        <div className="flex flex-col flex-1" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {loadingNotes && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#6e5fa0] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loadingNotes && notes.length === 0 && (
              <div className="text-center py-8">
                <p className="text-[#9a96a8] text-sm">Нет заметок — начните переписку</p>
              </div>
            )}
            {notes.map(n => (
              <div key={n.id} className="flex justify-end">
                <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm"
                  style={{ background: '#6e5fa0', color: '#fff' }}>
                  <p>{n.text}</p>
                  <p className="text-[10px] text-white/60 mt-1 text-right">{fmtTime(n.createdAt)}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-2 border-t bg-white" style={{ borderColor: '#e8e4dc' }}>
            <div className="flex items-end gap-2 pt-3">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Написать заметку..."
                rows={1}
                className="flex-1 p-3 rounded-xl border text-sm outline-none resize-none"
                style={{ borderColor: '#e8e4dc', color: '#2a2540', maxHeight: 120 }}
              />
              <button onClick={handleSend} disabled={sending || !input.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-opacity"
                style={{ background: '#6e5fa0', opacity: !input.trim() ? 0.4 : 1 }}>
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>

            {/* Quick action */}
            <div className="flex gap-2 mt-2 pb-1">
              <Link href={`/${locale}/doctor-prescriptions`}
                className="text-xs px-3 py-1.5 rounded-full border font-medium text-[#6e5fa0]"
                style={{ borderColor: '#6e5fa0' }}>
                💊 Назначить
              </Link>
              <Link href={`/${locale}/doctor-appointments`}
                className="text-xs px-3 py-1.5 rounded-full border font-medium text-[#6e5fa0]"
                style={{ borderColor: '#6e5fa0' }}>
                📅 Записать
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
