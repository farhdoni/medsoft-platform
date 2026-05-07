'use client';
import { useState, useRef, useCallback } from 'react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  lang?: string;
  className?: string;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  readonly resultIndex: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export default function VoiceInput({ onTranscript, lang = 'ru-RU', className }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState('');
  const [seconds, setSeconds] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSupported = typeof window !== 'undefined' &&
    (typeof window.SpeechRecognition !== 'undefined' || typeof window.webkitSpeechRecognition !== 'undefined');

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterim('');
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startRecording = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognitionImpl = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) return;

    const recognition: SpeechRecognitionInstance = new SpeechRecognitionImpl();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      if (finalTranscript) {
        onTranscript(finalTranscript);
        stopRecording();
      } else {
        setInterim(interimTranscript);
      }
    };

    recognition.onerror = () => stopRecording();
    recognition.onend = () => { setIsRecording(false); setInterim(''); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  }, [isSupported, lang, onTranscript, stopRecording]);

  if (!isSupported) return null;

  if (isRecording) {
    return (
      <button onClick={stopRecording}
        className={`flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-2xl text-xs font-medium animate-pulse ${className ?? ''}`}>
        <span className="w-2 h-2 bg-white rounded-full shrink-0" />
        <span className="max-w-[80px] truncate">{interim || `${seconds}с`}</span>
        <span>⏹</span>
      </button>
    );
  }

  return (
    <button onClick={startRecording}
      className={`w-10 h-10 rounded-full bg-[#f4f3ef] flex items-center justify-center text-lg hover:bg-[#e8e4dc] transition-colors shrink-0 ${className ?? ''}`}
      title="Голосовой ввод"
      aria-label="Голосовой ввод">
      🎤
    </button>
  );
}
