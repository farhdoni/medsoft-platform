'use client';

import { useCallback, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'error';

/**
 * MediaRecorder wrapper for voice messages.
 *
 * getUserMedia needs a secure context: it works on localhost as-is and on HTTPS
 * in production, so there is nothing to special-case here — but a plain-HTTP
 * deployment would fail at start(), which is what `error` reports.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // webm/opus is what Chrome and Firefox both produce; Safari falls back to
      // the browser default, which the upload allowlist accepts as audio/*.
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : undefined;
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.start();
      recorderRef.current = rec;
      setSeconds(0);
      setState('recording');
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return true;
    } catch {
      setState('error');
      cleanup();
      return false;
    }
  }, [cleanup]);

  /** Stops and resolves with the recording, or null when it was cancelled. */
  const stop = useCallback((): Promise<{ blob: Blob; seconds: number } | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') { setState('idle'); return Promise.resolve(null); }

    const elapsed = seconds;
    return new Promise((resolve) => {
      rec.onstop = () => {
        const cancelled = cancelledRef.current;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        cleanup();
        setState('idle');
        setSeconds(0);
        // Anything under a second is a mis-tap, not a message.
        resolve(cancelled || elapsed < 1 || blob.size === 0 ? null : { blob, seconds: elapsed });
      };
      rec.stop();
    });
  }, [seconds, cleanup]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    else { cleanup(); setState('idle'); setSeconds(0); }
  }, [cleanup]);

  return { state, seconds, start, stop, cancel };
}
