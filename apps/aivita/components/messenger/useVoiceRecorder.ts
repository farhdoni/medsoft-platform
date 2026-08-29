'use client';

import { useCallback, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'error';

/**
 * Why a recording attempt failed. The caller maps this to a message — the hook
 * deliberately holds no copy of its own so the two chat screens can word things
 * their own way while still branching on the same set of causes.
 */
export type RecorderErrorKind =
  | 'permission'   // user (or a WebView host that never asked) said no
  | 'no-device'    // no microphone attached
  | 'unsupported'  // MediaRecorder / mediaDevices missing
  | 'insecure'     // http:// — getUserMedia is not exposed at all
  | 'failed';      // everything else

export type StartResult = { ok: true } | { ok: false; kind: RecorderErrorKind };

/**
 * Container formats in preference order.
 *
 * Chrome and Firefox produce webm/opus. Safari — desktop and iOS — supports
 * neither and only ever reports mp4, so a hard-coded webm request there throws
 * at construction time and the button looks dead. The last resort is passing no
 * mimeType at all and letting the browser choose whatever it likes.
 */
export const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
] as const;

/**
 * First candidate the browser admits to supporting, or undefined to mean
 * "let MediaRecorder pick". Injectable predicate so this stays unit-testable
 * without a DOM.
 */
export function pickRecorderMime(
  isTypeSupported: (type: string) => boolean,
): string | undefined {
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    try {
      if (isTypeSupported(candidate)) return candidate;
    } catch {
      // A browser without MediaRecorder.isTypeSupported behaves as "no".
    }
  }
  return undefined;
}

/**
 * File extension for a recorded blob.
 *
 * MediaRecorder reports the full media type including codec parameters
 * ("audio/webm;codecs=opus"), so the base type has to be split off first —
 * matching on the whole string silently yields no extension, and a file with no
 * extension comes back from the uploads route as application/octet-stream,
 * which no <audio> element will play.
 */
export function extForMime(mime: string): string {
  const base = mime.split(';')[0].trim().toLowerCase();
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/aac': 'aac',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
  };
  return map[base] ?? 'webm';
}

/** Maps a getUserMedia rejection onto the reason the UI has to explain. */
function classify(err: unknown): RecorderErrorKind {
  const name = (err as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'permission';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return 'no-device';
  }
  return 'failed';
}

/**
 * MediaRecorder wrapper for voice messages.
 *
 * getUserMedia needs a secure context: it works on localhost as-is and on HTTPS
 * in production. Anywhere else `navigator.mediaDevices` is simply absent, which
 * is reported as `insecure` rather than as a generic failure.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const mimeRef = useRef<string>('audio/webm');

  const cleanup = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async (): Promise<StartResult> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('idle');
      // Secure context is the usual reason the API is missing outright.
      const insecure =
        typeof window !== 'undefined' && typeof window.isSecureContext === 'boolean'
          ? !window.isSecureContext
          : false;
      return { ok: false, kind: insecure ? 'insecure' : 'unsupported' };
    }
    if (typeof MediaRecorder === 'undefined') {
      setState('idle');
      return { ok: false, kind: 'unsupported' };
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      // 'error' would stick forever; the button has to stay usable for a retry
      // once the user flips the permission in browser settings.
      setState('idle');
      cleanup();
      return { ok: false, kind: classify(err) };
    }

    try {
      streamRef.current = stream;
      const mime = pickRecorderMime((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mimeRef.current = rec.mimeType || mime || 'audio/webm';
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.start();
      recorderRef.current = rec;
      setSeconds(0);
      setState('recording');
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return { ok: true };
    } catch (err) {
      setState('idle');
      cleanup();
      return { ok: false, kind: classify(err) };
    }
  }, [cleanup]);

  /** Stops and resolves with the recording, or null when it was cancelled. */
  const stop = useCallback((): Promise<{ blob: Blob; seconds: number; mime: string } | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') { setState('idle'); return Promise.resolve(null); }

    const elapsed = seconds;
    return new Promise((resolve) => {
      rec.onstop = () => {
        const cancelled = cancelledRef.current;
        const mime = rec.mimeType || mimeRef.current || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        cleanup();
        setState('idle');
        setSeconds(0);
        // Anything under a second is a mis-tap, not a message.
        resolve(cancelled || elapsed < 1 || blob.size === 0 ? null : { blob, seconds: elapsed, mime });
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
