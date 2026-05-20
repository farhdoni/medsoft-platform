'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { VideoCall } from '@/components/video/VideoCall';
import Link from 'next/link';

const PROXY = '/api/proxy';

interface CallInfo {
  id: string;
  roomId: string;
  status: string;
  otherUser: { id: string; name: string } | null;
}

export default function DoctorVideoCallPage() {
  const { locale = 'ru', roomId } = useParams<{ locale: string; roomId: string }>() ?? {};
  const searchParams = useSearchParams();
  const callId = searchParams?.get('callId') ?? '';
  const router = useRouter();

  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [myName, setMyName] = useState('Врач');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (!callId) return;
    fetch(`${PROXY}/video-call/${callId}`)
      .then(r => r.json())
      .then(j => { if (j.data) setCallInfo(j.data); })
      .catch(() => {});
    fetch(`${PROXY}/users`)
      .then(r => r.json())
      .then(j => { if (j.data?.name) setMyName(j.data.name); })
      .catch(() => {});
  }, [callId]);

  function handleEnd(duration: number) {
    setCallDuration(duration);
    setShowNotes(true);
  }

  async function handleSaveNotes() {
    if (!callId) return;
    setSaving(true);
    await fetch(`${PROXY}/video-call/${callId}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    }).catch(() => {});
    setSaving(false);
    router.push(`/${locale}/doctor-chats`);
  }

  if (!callId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0d1117]">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Некорректная ссылка на звонок</p>
          <Link href={`/${locale}/doctor-chats`} className="text-[#6BA3D6] underline">
            Вернуться к чатам
          </Link>
        </div>
      </div>
    );
  }

  // Post-call notes modal
  if (showNotes) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <h2 className="text-base font-bold text-[#2a2540] mb-1">Заметки о консультации</h2>
          <p className="text-xs text-[#9a96a8] mb-4">
            Звонок с {callInfo?.otherUser?.name ?? 'пациентом'} завершён
            {callDuration > 0 && ` · ${Math.floor(callDuration / 60)} мин ${callDuration % 60} сек`}
          </p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
            placeholder="Введите заметки по консультации..."
            className="w-full p-3 rounded-xl border text-sm outline-none resize-none mb-4"
            style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
          />
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/${locale}/doctor-chats`)}
              className="flex-1 py-3 rounded-xl text-sm font-medium border text-[#9a96a8]"
            >
              Пропустить
            </button>
            <button
              onClick={handleSaveNotes}
              disabled={saving || !notes.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#6BA3D6', opacity: saving || !notes.trim() ? 0.6 : 1 }}
            >
              {saving ? 'Сохранение...' : '💾 Сохранить'}
            </button>
          </div>
          <div className="mt-3 pt-3 border-t">
            <Link
              href={`/${locale}/doctor-scribe?patientId=${callInfo?.otherUser?.id ?? ''}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: '#f0f4ff', color: '#6BA3D6' }}
            >
              🎙️ Открыть AI-скрайб
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VideoCall
      roomId={roomId as string}
      callId={callId}
      myName={myName}
      otherName={callInfo?.otherUser?.name ?? 'Пациент'}
      onEnd={handleEnd}
    />
  );
}
