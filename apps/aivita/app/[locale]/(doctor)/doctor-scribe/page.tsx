'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';

interface Patient {
  connection: { patientId: string };
  user: { id: string; name: string };
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface SOAPProtocol {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10: string;
  medications: Medication[];
  followUp: string;
}

interface SRResult { readonly isFinal: boolean; [index: number]: { transcript: string }; }
interface SREvent extends Event {
  readonly resultIndex: number;
  readonly results: { length: number; [i: number]: SRResult };
}
interface SRInstance {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void;
  onresult: ((ev: SREvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
}
type SRCtor = new () => SRInstance;

function initials(n: string) {
  return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function SOAPCard({ label, value, bg, color, onChange }: {
  label: string; value: string; bg: string; color: string; onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: bg }}>
      <p className="text-xs font-bold mb-2" style={{ color }}>{label}</p>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full bg-transparent text-sm resize-none outline-none text-[#2a2540] leading-relaxed"
        placeholder="—"
      />
    </div>
  );
}

export default function DoctorScribePage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const searchParams = useSearchParams();
  const preselectedId = searchParams?.get('patientId') ?? '';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(preselectedId);
  const [patientSearch, setPatientSearch] = useState('');
  const [showDrop, setShowDrop] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [speechOk, setSpeechOk] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [protocol, setProtocol] = useState<SOAPProtocol | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const recRef = useRef<SRInstance | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setSpeechOk(!!(w['SpeechRecognition'] ?? w['webkitSpeechRecognition']));
  }, []);

  useEffect(() => {
    apiRequest<Patient[]>('/doctor/patients?status=active')
      .then(res => { if ('data' in res) setPatients(res.data ?? []); });
  }, []);

  useEffect(() => {
    if (preselectedId && patients.length > 0) {
      const found = patients.find(p => p.user.id === preselectedId);
      if (found) setPatientSearch(found.user.name);
    }
  }, [preselectedId, patients]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredPatients = patients.filter(p =>
    p.user.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const selectedPatient = patients.find(p => p.user.id === patientId);

  const startRecording = useCallback(() => {
    const w = window as unknown as Record<string, unknown>;
    const SR = (w['SpeechRecognition'] ?? w['webkitSpeechRecognition']) as SRCtor | undefined;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'ru-RU';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev: SREvent) => {
      let fin = '';
      let int = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) fin += r[0].transcript + ' ';
        else int += r[0].transcript;
      }
      if (fin) setTranscript(prev => prev + fin);
      setInterim(int);
    };
    rec.onerror = () => { setIsRecording(false); setInterim(''); };
    rec.onend = () => { setIsRecording(false); setInterim(''); };
    recRef.current = rec;
    rec.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recRef.current?.stop();
    setIsRecording(false);
    setInterim('');
  }, []);

  const handleGenerate = async () => {
    if (!patientId || !transcript.trim()) return;
    setGenerating(true);
    setProtocol(null);
    const res = await apiRequest<SOAPProtocol>('/doctor/scribe', {
      method: 'POST',
      body: { patientId, transcript: transcript.trim() },
    });
    setGenerating(false);
    if ('data' in res && res.data) setProtocol(res.data);
  };

  const handleSave = async () => {
    if (!patientId || !protocol) return;
    setSaving(true);
    await apiRequest('/doctor/scribe/save', {
      method: 'POST',
      body: { patientId, transcript, protocol },
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCopy = () => {
    if (!protocol) return;
    const meds = protocol.medications?.map(m => `${m.name} ${m.dosage} ${m.frequency} ${m.duration}`).join('; ');
    const text = [
      `S (Жалобы): ${protocol.subjective}`,
      `O (Осмотр): ${protocol.objective}`,
      `A (Оценка): ${protocol.assessment}`,
      `P (План): ${protocol.plan}`,
      `МКБ-10: ${protocol.icd10}`,
      meds ? `Назначения: ${meds}` : '',
      `Следующий визит: ${protocol.followUp}`,
    ].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  const updP = (key: keyof SOAPProtocol, val: string) => {
    if (!protocol) return;
    setProtocol({ ...protocol, [key]: val });
  };

  const canGenerate = !!patientId && !!transcript.trim() && !generating;

  return (
    <div className="pb-32">
      <div className="sticky top-0 z-30 bg-app/90 backdrop-blur-md px-4 pt-12 pb-3">
        <h1 className="text-xl font-bold text-[#2a2540]">🎙️ AI-скрайб</h1>
        <p className="text-xs text-[#9a96a8] mt-0.5">Голосовой ввод приёма</p>
      </div>

      <div className="px-4 space-y-4">

        {/* Patient selector */}
        <div ref={dropRef} className="relative">
          <label className="text-xs font-semibold text-[#9a96a8] block mb-1.5">Пациент</label>
          <input
            value={patientSearch}
            onChange={e => { setPatientSearch(e.target.value); setShowDrop(true); setPatientId(''); }}
            onFocus={() => setShowDrop(true)}
            placeholder="Поиск по имени..."
            className="w-full p-3 rounded-xl border text-sm outline-none bg-white"
            style={{ borderColor: patientId ? '#6BA3D6' : '#e8e4dc', color: '#2a2540' }}
          />
          {patientId && selectedPatient && (
            <div className="absolute right-3 top-9">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                style={{ background: '#6BA3D6' }}>
                {initials(selectedPatient.user.name)}
              </div>
            </div>
          )}
          {showDrop && filteredPatients.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border z-50 max-h-48 overflow-y-auto">
              {filteredPatients.map(p => (
                <button
                  key={p.user.id}
                  onClick={() => { setPatientId(p.user.id); setPatientSearch(p.user.name); setShowDrop(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#f4f3ef] text-left"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #8eb5de, #6BA3D6)' }}>
                    {initials(p.user.name)}
                  </div>
                  <span className="text-sm text-[#2a2540]">{p.user.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Speech not supported */}
        {!speechOk && (
          <div className="rounded-xl p-4 text-sm text-[#c0304a]" style={{ background: '#fff0ec' }}>
            Используйте Chrome или Edge для голосового ввода. Или введите текст вручную ниже.
          </div>
        )}

        {/* Record button */}
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className="relative flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 select-none"
            style={{
              width: 80, height: 80,
              background: isRecording ? '#dc3545' : '#6BA3D6',
              boxShadow: isRecording
                ? '0 0 0 8px rgba(220,53,69,0.15), 0 8px 24px rgba(220,53,69,0.35)'
                : '0 8px 24px rgba(107,163,214,0.4)',
            }}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full animate-ping opacity-30"
                style={{ background: '#dc3545' }} />
            )}
            <span className="text-3xl" style={{ lineHeight: 1 }}>{isRecording ? '⏹' : '🎙'}</span>
          </button>
          <p className="text-xs text-[#9a96a8]">
            {isRecording ? 'Говорите... нажмите ⏹ для остановки' : 'Нажмите для записи'}
          </p>
        </div>

        {/* Transcript */}
        <div>
          <label className="text-xs font-semibold text-[#9a96a8] block mb-1.5">Расшифровка</label>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            rows={5}
            placeholder="Текст появится здесь во время записи. Вы можете редактировать перед генерацией..."
            className="w-full p-3 rounded-xl border text-sm outline-none resize-none leading-relaxed"
            style={{
              borderColor: '#e8e4dc', color: '#2a2540',
              background: isRecording ? '#f0f7ff' : 'white',
            }}
          />
          {interim && (
            <p className="text-xs text-[#9a96a8] mt-1 italic pl-1 opacity-70">{interim}</p>
          )}
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #8eb5de, #6BA3D6)',
            opacity: canGenerate ? 1 : 0.5,
            boxShadow: '0 4px 16px rgba(107,163,214,0.35)',
          }}
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Генерация протокола...
            </span>
          ) : '🤖 Сгенерировать протокол'}
        </button>

        {/* SOAP Result */}
        {protocol && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#2a2540] mt-1">Протокол SOAP</h2>

            <SOAPCard label="S — Субъективно (жалобы)" value={protocol.subjective}
              bg="#d4dff0" color="#2a5090" onChange={v => updP('subjective', v)} />
            <SOAPCard label="O — Объективно (осмотр)" value={protocol.objective}
              bg="#d4e8d8" color="#1a6632" onChange={v => updP('objective', v)} />
            <SOAPCard label="A — Оценка (диагноз)" value={protocol.assessment}
              bg="#fff3cd" color="#856404" onChange={v => updP('assessment', v)} />
            <SOAPCard label="P — План (назначения)" value={protocol.plan}
              bg="#e0d8f0" color="#4a2080" onChange={v => updP('plan', v)} />

            {/* ICD-10 */}
            <div className="rounded-xl p-4 bg-white border">
              <p className="text-xs font-bold text-[#9a96a8] mb-1.5">МКБ-10</p>
              <input
                value={protocol.icd10}
                onChange={e => updP('icd10', e.target.value)}
                className="w-full text-sm font-mono font-bold outline-none text-[#6BA3D6]"
                placeholder="—"
              />
            </div>

            {/* Medications */}
            {protocol.medications?.length > 0 && (
              <div className="rounded-xl p-4 bg-white border">
                <p className="text-xs font-bold text-[#9a96a8] mb-2">Назначения</p>
                <div className="flex flex-wrap gap-2">
                  {protocol.medications.map((m, i) => (
                    <span key={i}
                      className="text-xs px-3 py-1.5 rounded-full font-medium"
                      style={{ background: '#e0d8f0', color: '#4a2080' }}>
                      💊 {m.name} {m.dosage} · {m.frequency} · {m.duration}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up */}
            <div className="rounded-xl p-4 bg-white border">
              <p className="text-xs font-bold text-[#9a96a8] mb-1.5">Следующий визит</p>
              <input
                value={protocol.followUp}
                onChange={e => updP('followUp', e.target.value)}
                className="w-full text-sm outline-none text-[#2a2540]"
                placeholder="—"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pb-2">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
                style={{ background: saved ? '#2d7a56' : '#6BA3D6', opacity: saving ? 0.7 : 1 }}
              >
                {saved ? '✅ Сохранено' : saving ? 'Сохранение...' : '💾 Сохранить в медкарту'}
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-3 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98]"
                style={{ borderColor: '#6BA3D6', color: '#6BA3D6' }}
                title="Копировать"
              >
                📋
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
