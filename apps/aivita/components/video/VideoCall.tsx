'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

const PROXY = '/api/proxy';

interface VideoCallProps {
  roomId: string;
  callId: string;
  myName: string;
  otherName: string;
  onEnd: (duration: number) => void;
}

function fmtTimer(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function VideoCall({ roomId, callId, myName, otherName, onEnd }: VideoCallProps) {
  const [seconds, setSeconds] = useState(0);
  const [joined, setJoined] = useState(false);
  const [ending, setEnding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const endedRef = useRef(false);

  const handleEnd = useCallback(async () => {
    if (endedRef.current || ending) return;
    endedRef.current = true;
    setEnding(true);
    try {
      const res = await fetch(`${PROXY}/video-call/${callId}/end`, { method: 'POST' }).then(r => r.json());
      onEnd(res.data?.duration ?? seconds);
    } catch {
      onEnd(seconds);
    }
  }, [callId, ending, onEnd, seconds]);

  // Join on mount
  useEffect(() => {
    fetch(`${PROXY}/video-call/${callId}/join`, { method: 'POST' })
      .then(() => {
        setJoined(true);
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      })
      .catch(() => {
        setJoined(true);
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      });
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callId]);

  // Listen for Jitsi postMessage hangup events
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      if (ev.origin !== 'https://meet.jit.si') return;
      const d = ev.data;
      const name = typeof d === 'object' && d !== null ? (d as Record<string, unknown>).name : d;
      if (name === 'readyToClose' || name === 'videoConferenceLeft') {
        void handleEnd();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [handleEnd]);

  const jitsiUrl = [
    `https://meet.jit.si/${roomId}`,
    `#userInfo.displayName=${encodeURIComponent(myName)}`,
    `&config.startWithAudioMuted=false`,
    `&config.startWithVideoMuted=false`,
    `&config.prejoinPageEnabled=false`,
    `&config.disableDeepLinking=true`,
    `&interfaceConfig.SHOW_JITSI_WATERMARK=false`,
    `&interfaceConfig.DEFAULT_REMOTE_DISPLAY_NAME=${encodeURIComponent('AIVITA')}`,
  ].join('');

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0d1117' }}>
      {/* Header bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #6BA3D6, #3a6fa0)' }}>
            {(otherName ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">{otherName}</p>
            <p className="text-white/60 text-xs mt-0.5">
              {joined ? (
                <span className="font-mono">{fmtTimer(seconds)}</span>
              ) : 'Подключение...'}
            </p>
          </div>
        </div>
        <button
          onClick={() => void handleEnd()}
          disabled={ending}
          className="flex items-center justify-center rounded-full transition-all active:scale-90"
          style={{ width: 56, height: 56, background: ending ? '#6b7280' : '#dc3545' }}
          title="Завершить звонок"
        >
          {ending ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" width={24} height={24} fill="white">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Jitsi iframe */}
      <div className="flex-1 relative">
        {!joined && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#0d1117' }}>
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-[3px] border-[#6BA3D6] border-t-transparent rounded-full animate-spin" />
              <p className="text-white/70 text-sm">Подключение к звонку...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={jitsiUrl}
          allow="camera; microphone; display-capture; autoplay; clipboard-write"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 0,
          }}
          title="Видеозвонок AIVITA"
        />
      </div>
    </div>
  );
}
