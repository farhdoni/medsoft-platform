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
  conversationId: string | null;
  otherUser: { id: string; name: string } | null;
}

export default function PatientVideoCallPage() {
  const { locale = 'ru', roomId } = useParams<{ locale: string; roomId: string }>() ?? {};
  const searchParams = useSearchParams();
  const callId = searchParams?.get('callId') ?? '';
  const router = useRouter();

  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [myName, setMyName] = useState('Пациент');

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

  function handleEnd() {
    // Redirect back to chat if we have conversationId
    if (callInfo?.conversationId) {
      router.push(`/${locale}/chats/${callInfo.conversationId}`);
    } else {
      router.push(`/${locale}/chats`);
    }
  }

  if (!callId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0d1117]">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Некорректная ссылка на звонок</p>
          <Link href={`/${locale}/chats`} className="text-[#6BA3D6] underline">
            Вернуться к чатам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <VideoCall
      roomId={roomId as string}
      callId={callId}
      myName={myName}
      otherName={callInfo?.otherUser?.name ?? 'Доктор'}
      onEnd={handleEnd}
    />
  );
}
