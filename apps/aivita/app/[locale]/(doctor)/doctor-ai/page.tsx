'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import VoiceInput from '@/components/voice/VoiceInput';


interface Patient { user: { id: string; name: string }; connection: { consultationCount: number }; }
interface Vital { type: string; value: any; recordedAt: string; }
interface Message { role: 'user' | 'assistant'; content: string; }

function initials(n: string) { return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

const QUICK_PROMPTS = ['Анализ данных пациента', 'Предложить диагноз', 'Рекомендовать анализы', 'Оценить риски', 'Предложить лечение'];

export default function DoctorAiPage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientVitals, setPatientVitals] = useState<Vital[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiRequest<Patient[]>('/doctor/patients?status=active')
      .then(res => { if ('data' in res) setPatients(res.data ?? []); });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const selectPatient = async (p: Patient) => {
    setSelectedPatient(p);
    setMessages([]);
    setSessionId(null);

    const res = await apiRequest<{ data: Vital[] }>(`/doctor/patients/${p.user.id}`);
    if ('data' in res && (res.data as any).latestVitals) {
      setPatientVitals((res.data as any).latestVitals);
    }
  };

  const buildPatientContext = () => {
    if (!selectedPatient) return '';
    const vitalsSummary = patientVitals.slice(0, 5).map(v => {
      const val = typeof v.value === 'object' ? JSON.stringify(v.value) : v.value;
      return `${v.type}: ${val}`;
    }).join(', ');
    return `Пациент: ${selectedPatient.user.name}. Показатели: ${vitalsSummary || 'нет данных'}. Консультаций: ${selectedPatient.connection.consultationCount}.`;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    try {
      // Create or reuse chat session
      let sid = sessionId;
      if (!sid) {
        const sRes = await apiRequest<{ id: string }>('/chat/sessions', { method: 'POST', body: {} });
        if ('data' in sRes) { sid = sRes.data.id; setSessionId(sid); }
      }

      if (!sid) { setStreaming(false); return; }

      const patientCtx = buildPatientContext();
      const systemNote = `[DOCTOR_MODE] Ты AI-ассистент для врача. Используй медицинскую терминологию. Давай дифференциальные диагнозы. Контекст пациента: ${patientCtx}`;
      const fullMsg = messages.length === 0 ? `${systemNote}\n\nВопрос врача: ${text}` : text;

      // Send message with required role field
      const res = await apiRequest<{ userMessage: { content: string }; aiMessage: { content: string } }>(
        `/chat/sessions/${sid}/messages`,
        { method: 'POST', body: { role: 'user', content: fullMsg } }
      );

      if ('data' in res) {
        const aiContent = res.data?.aiMessage?.content ?? 'Нет ответа';
        setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка ответа' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка соединения. Попробуйте снова.' }]);
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <div className="min-h-screen bg-[#f4f3ef] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#f4f3ef]/90 backdrop-blur-md px-4 pt-12 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <Icon3D name="sparkle" size={28} />
          <div>
            <h1 className="text-xl font-bold text-[#2a2540]">AI-ассистент врача</h1>
            <p className="text-xs text-[#9a96a8]">Анализ пациентов, диагнозы, рекомендации</p>
          </div>
        </div>

        {/* Patient selector */}
        <select
          value={selectedPatient?.user.id ?? ''}
          onChange={e => {
            const p = patients.find(pt => pt.user.id === e.target.value);
            if (p) selectPatient(p); else setSelectedPatient(null);
          }}
          className="w-full p-2.5 rounded-xl border text-sm outline-none bg-white"
          style={{ borderColor: '#e8e4dc', color: selectedPatient ? '#2a2540' : '#9a96a8' }}>
          <option value="">Выбрать пациента для анализа...</option>
          {patients.map(p => (
            <option key={p.user.id} value={p.user.id}>{p.user.name}</option>
          ))}
        </select>
      </div>

      {/* Patient summary */}
      {selectedPatient && patientVitals.length > 0 && (
        <div className="mx-4 mb-3 p-3 rounded-xl bg-white border" style={{ borderColor: '#e8e4dc' }}>
          <p className="text-xs font-semibold text-[#9a96a8] mb-2">Показатели пациента</p>
          <div className="flex gap-2 flex-wrap">
            {patientVitals.slice(0, 4).map((v, i) => {
              const val = typeof v.value === 'object' ? Object.values(v.value).join('/') : v.value;
              return (
                <span key={i} className="text-xs px-2 py-1 rounded-lg font-medium"
                  style={{ background: '#f0eefc', color: '#6e5fa0' }}>
                  {v.type.replace('_', ' ')}: {val}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
              <Icon3D name="sparkle" size={32} />
            </div>
            <p className="text-[#9a96a8] text-sm mb-4">
              {selectedPatient ? `Задайте вопрос о ${selectedPatient.user.name}` : 'Выберите пациента и задайте вопрос'}
            </p>
            {selectedPatient && (
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_PROMPTS.map(p => (
                  <button key={p} onClick={() => sendMessage(p)}
                    className="text-xs px-3 py-1.5 rounded-full border font-medium text-[#6e5fa0] transition-colors active:bg-[#e8e4f0]"
                    style={{ borderColor: '#6e5fa0' }}>{p}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full flex-shrink-0 mr-2 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
                <Icon3D name="sparkle" size={14} />
              </div>
            )}
            <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
            }`}
              style={{
                background: m.role === 'user' ? '#6e5fa0' : '#fff',
                color: m.role === 'user' ? '#fff' : '#2a2540',
                border: m.role === 'assistant' ? '1px solid #e8e4dc' : 'none',
              }}>
              {m.content || (streaming && i === messages.length - 1 ? (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[#9a96a8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#9a96a8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#9a96a8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white" style={{ borderColor: '#e8e4dc' }}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedPatient ? 'Задайте вопрос о пациенте...' : 'Сначала выберите пациента...'}
            disabled={!selectedPatient}
            rows={1}
            className="flex-1 p-3 rounded-xl border text-sm outline-none resize-none disabled:opacity-50"
            style={{ borderColor: '#e8e4dc', color: '#2a2540', maxHeight: 120 }}
          />
          {selectedPatient && (
            <VoiceInput onTranscript={(text) => setInput(prev => prev ? prev + ' ' + text : text)} />
          )}
          <button onClick={() => sendMessage(input)} disabled={streaming || !input.trim() || !selectedPatient}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)', opacity: streaming || !input.trim() || !selectedPatient ? 0.4 : 1 }}>
            {streaming ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-[#9a96a8] mt-2 text-center">
          ⚠️ AI-предположение. Окончательный диагноз ставит врач.
        </p>
      </div>
    </div>
  );
}
