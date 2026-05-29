'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#f4f3ef', card: '#fff', border: '#e8e4dc',
  accent: '#9c5e6c', accentBg: '#f0d4dc',
  green: '#3a7a4a', greenBg: '#d4e8d8',
  blue: '#6BA3D6', blueBg: '#d4dff0',
  orange: '#e8873a', orangeBg: '#fff3cd',
  red: '#dc3545', redBg: '#fde8e8',
  t1: '#2a2540', t2: '#6a6580', t3: '#9a96a8',
};

// ─── Symptom catalog ─────────────────────────────────────────────────────────
const SYMPTOMS_BY_AREA: Record<string, string[]> = {
  head:    ['Головная боль', 'Головокружение', 'Боль в ухе', 'Боль в горле', 'Насморк'],
  chest:   ['Боль в груди', 'Кашель', 'Одышка', 'Сердцебиение'],
  abdomen: ['Боль в животе', 'Тошнота', 'Изжога', 'Вздутие'],
  back:    ['Боль в спине', 'Боль в пояснице'],
  arms:    ['Боль в руке', 'Онемение руки', 'Слабость'],
  legs:    ['Боль в ноге', 'Отёк ноги', 'Судороги'],
};

const ALL_SYMPTOMS = [
  'Головная боль', 'Боль в животе', 'Температура', 'Кашель',
  'Боль в груди', 'Боль в спине', 'Тошнота', 'Головокружение', 'Одышка', 'Другое',
];

const BODY_AREAS = [
  { id: 'head', label: 'Голова', y: 50, x: 50, r: 22 },
  { id: 'chest', label: 'Грудь', y: 130, x: 50, r: 26 },
  { id: 'abdomen', label: 'Живот', y: 200, x: 50, r: 24 },
  { id: 'back', label: 'Спина', y: 170, x: 50, r: 0 },
  { id: 'arms', label: 'Руки', y: 150, x: 50, r: 0 },
  { id: 'legs', label: 'Ноги', y: 300, x: 50, r: 0 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface SymptomResult {
  condition: string;
  probability: 'high' | 'medium' | 'low';
  description: string;
  specialist: string;
  urgency: 'routine' | 'soon' | 'urgent';
}

interface StepData {
  sessionId: string;
  question: string;
  options: string[];
  step: number;
  totalSteps: number;
  isLast: boolean;
  results?: SymptomResult[];
}

type Phase = 'select' | 'questions' | 'results';

const PROB_LABEL: Record<string, string> = { high: 'Высокая', medium: 'Средняя', low: 'Низкая' };
const PROB_COLOR: Record<string, string> = { high: C.red, medium: C.orange, low: C.green };
const URG_LABEL: Record<string, { icon: string; label: string; color: string }> = {
  urgent:  { icon: '🔴', label: 'Срочно', color: C.red },
  soon:    { icon: '🟡', label: 'В ближайшие дни', color: C.orange },
  routine: { icon: '🟢', label: 'Плановый приём', color: C.green },
};

// ─── Body SVG silhouette ──────────────────────────────────────────────────────
function BodySilhouette({ selectedArea, onSelect }: { selectedArea: string | null; onSelect: (a: string) => void }) {
  const areas = [
    { id: 'head',    label: 'Голова', d: 'M50,20 a18,18 0 1,0 0.01,0 Z' },
    { id: 'chest',   label: 'Грудь',  d: 'M30,55 Q25,90 32,110 L68,110 Q75,90 70,55 Z' },
    { id: 'abdomen', label: 'Живот',  d: 'M32,110 Q30,140 35,160 L65,160 Q70,140 68,110 Z' },
    { id: 'arms',    label: 'Руки',   d: 'M15,60 Q10,95 12,120 L25,120 Q23,95 28,60 Z M75,60 Q77,95 75,120 L88,120 Q90,95 85,60 Z' },
    { id: 'legs',    label: 'Ноги',   d: 'M34,162 Q30,210 30,250 L45,250 Q45,210 48,162 Z M52,162 Q55,210 55,250 L70,250 Q70,210 66,162 Z' },
    { id: 'back',    label: 'Спина',  d: '' }, // handled via chest area visually
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg viewBox="0 0 100 270" width={110} height={270} style={{ overflow: 'visible' }}>
        {/* Body outline */}
        <ellipse cx="50" cy="35" rx="18" ry="18" fill="#e8e4dc" stroke="#ccc" strokeWidth="1" />
        <path d="M30,55 Q25,90 32,110 L68,110 Q75,90 70,55 Z" fill="#e8e4dc" stroke="#ccc" strokeWidth="1" />
        <path d="M32,110 Q30,140 35,162 L65,162 Q70,140 68,110 Z" fill="#e8e4dc" stroke="#ccc" strokeWidth="1" />
        <path d="M14,58 Q8,95 10,122 L24,122 Q22,95 28,58 Z" fill="#e8e4dc" stroke="#ccc" strokeWidth="1" />
        <path d="M86,58 Q92,95 90,122 L76,122 Q78,95 72,58 Z" fill="#e8e4dc" stroke="#ccc" strokeWidth="1" />
        <path d="M33,162 Q28,210 28,252 L46,252 Q46,210 48,162 Z" fill="#e8e4dc" stroke="#ccc" strokeWidth="1" />
        <path d="M52,162 Q54,210 54,252 L72,252 Q72,210 67,162 Z" fill="#e8e4dc" stroke="#ccc" strokeWidth="1" />

        {/* Clickable areas */}
        <ellipse cx="50" cy="35" rx="18" ry="18"
          fill={selectedArea === 'head' ? C.accent + '60' : 'transparent'}
          stroke={selectedArea === 'head' ? C.accent : 'transparent'} strokeWidth="2"
          style={{ cursor: 'pointer' }} onClick={() => onSelect('head')} />
        <path d="M28,53 Q22,92 30,112 L70,112 Q78,92 72,53 Z"
          fill={selectedArea === 'chest' ? C.accent + '60' : 'transparent'}
          stroke={selectedArea === 'chest' ? C.accent : 'transparent'} strokeWidth="2"
          style={{ cursor: 'pointer' }} onClick={() => onSelect('chest')} />
        <path d="M30,112 Q28,143 33,164 L67,164 Q72,143 70,112 Z"
          fill={selectedArea === 'abdomen' ? C.accent + '60' : 'transparent'}
          stroke={selectedArea === 'abdomen' ? C.accent : 'transparent'} strokeWidth="2"
          style={{ cursor: 'pointer' }} onClick={() => onSelect('abdomen')} />
        <path d="M12,56 Q6,93 8,124 L26,124 Q24,93 30,56 Z M74,56 Q76,93 74,124 L92,124 Q94,93 88,56 Z"
          fill={selectedArea === 'arms' ? C.accent + '60' : 'transparent'}
          stroke={selectedArea === 'arms' ? C.accent : 'transparent'} strokeWidth="2"
          style={{ cursor: 'pointer' }} onClick={() => onSelect('arms')} />
        <path d="M31,164 Q26,212 26,254 L48,254 Q48,212 50,164 Z M50,164 Q52,212 52,254 L74,254 Q74,212 69,164 Z"
          fill={selectedArea === 'legs' ? C.accent + '60' : 'transparent'}
          stroke={selectedArea === 'legs' ? C.accent : 'transparent'} strokeWidth="2"
          style={{ cursor: 'pointer' }} onClick={() => onSelect('legs')} />
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {['head','chest','abdomen','arms','legs'].map(id => (
          <button key={id}
            onClick={() => onSelect(id)}
            style={{
              padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${selectedArea === id ? C.accent : C.border}`,
              background: selectedArea === id ? C.accentBg : C.card, fontSize: 12, fontWeight: 600,
              color: selectedArea === id ? C.accent : C.t2, cursor: 'pointer',
            }}>
            {{ head: 'Голова', chest: 'Грудь', abdomen: 'Живот', arms: 'Руки', legs: 'Ноги' }[id]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SymptomCheckerPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ru';
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('select');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [stepData, setStepData] = useState<StepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const visibleSymptoms = selectedArea
    ? (SYMPTOMS_BY_AREA[selectedArea] ?? ALL_SYMPTOMS)
    : ALL_SYMPTOMS;

  const handleStart = useCallback(async () => {
    if (!selectedSymptom) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proxy/symptom-checker/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mainSymptom: selectedSymptom, bodyArea: selectedArea ?? undefined }),
      });
      const json = await res.json() as { data?: StepData; error?: string };
      if (json.data) { setStepData(json.data); setPhase('questions'); }
      else setError(json.error ?? 'Ошибка');
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); }
  }, [selectedSymptom, selectedArea]);

  const handleAnswer = useCallback(async (option: string) => {
    if (!stepData) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proxy/symptom-checker/answer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: stepData.sessionId, question: stepData.question, answer: option }),
      });
      const json = await res.json() as { data?: StepData; error?: string };
      if (json.data) {
        setStepData(json.data);
        if (json.data.isLast && json.data.results) setPhase('results');
      } else setError(json.error ?? 'Ошибка');
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); }
  }, [stepData]);

  const handleReset = () => {
    setPhase('select');
    setSelectedArea(null);
    setSelectedSymptom(null);
    setStepData(null);
    setError('');
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background: C.card, padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => router.back()} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: C.t2, padding: 0 }}>←</button>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 1 }}>AI ДИАГНОСТИКА</p>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.t1, margin: 0 }}>Проверка симптомов</h1>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        {/* ── Step: Select ──────────────────────────────────────────────────── */}
        {phase === 'select' && (
          <>
            <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 16 }}>Выберите область на теле или симптом</p>
              <BodySilhouette selectedArea={selectedArea} onSelect={(a) => { setSelectedArea(prev => prev === a ? null : a); setSelectedSymptom(null); }} />
            </div>

            <div style={{ background: C.card, borderRadius: 20, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 12 }}>
                {selectedArea ? `Симптомы — ${BODY_AREAS.find(a => a.id === selectedArea)?.label ?? selectedArea}` : 'Что вас беспокоит?'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {visibleSymptoms.map(s => (
                  <button key={s} onClick={() => setSelectedSymptom(prev => prev === s ? null : s)}
                    style={{
                      padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${selectedSymptom === s ? C.accent : C.border}`,
                      background: selectedSymptom === s ? C.accentBg : '#fafaf8',
                      fontSize: 13, fontWeight: 600, color: selectedSymptom === s ? C.accent : C.t2, cursor: 'pointer',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {error && <p style={{ color: C.red, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</p>}

            <button
              onClick={handleStart}
              disabled={!selectedSymptom || loading}
              style={{
                width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                background: selectedSymptom ? `linear-gradient(135deg, ${C.accent}, #7a3848)` : C.border,
                color: selectedSymptom ? '#fff' : C.t3, fontSize: 16, fontWeight: 700, cursor: selectedSymptom ? 'pointer' : 'default',
                transition: 'all .2s',
              }}>
              {loading ? 'Запускаю...' : selectedSymptom ? `🩺 Начать опрос — ${selectedSymptom}` : 'Выберите симптом'}
            </button>

            <p style={{ fontSize: 11, color: C.t3, textAlign: 'center', marginTop: 12 }}>
              Не является медицинским диагнозом. Для точного заключения обратитесь к врачу.
            </p>
          </>
        )}

        {/* ── Step: Questions ───────────────────────────────────────────────── */}
        {phase === 'questions' && stepData && (
          <>
            {/* Progress */}
            <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: C.t3, fontWeight: 600 }}>Шаг {stepData.step} из {stepData.totalSteps}</p>
                <p style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>{Math.round((stepData.step / stepData.totalSteps) * 100)}%</p>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: C.accentBg, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${C.accent}, #7a3848)`, width: `${(stepData.step / stepData.totalSteps) * 100}%`, transition: 'width .4s' }} />
              </div>
            </div>

            {/* Symptom badge */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{ padding: '5px 12px', borderRadius: 20, background: C.accentBg, fontSize: 12, fontWeight: 600, color: C.accent }}>🩺 {selectedSymptom}</span>
            </div>

            {/* Question */}
            <div style={{ background: C.card, borderRadius: 20, padding: 24, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: C.t1, marginBottom: 20, lineHeight: 1.4 }}>{stepData.question}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stepData.options.map(opt => (
                  <button key={opt} onClick={() => !loading && handleAnswer(opt)} disabled={loading}
                    style={{
                      padding: '14px 18px', borderRadius: 14, border: `1.5px solid ${C.border}`,
                      background: '#fafaf8', fontSize: 14, fontWeight: 600, color: C.t1,
                      cursor: loading ? 'default' : 'pointer', textAlign: 'left',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={e => { if (!loading) (e.currentTarget.style.borderColor = C.accent); (e.currentTarget.style.background = C.accentBg); }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor = C.border); (e.currentTarget.style.background = '#fafaf8'); }}>
                    {opt}
                  </button>
                ))}
              </div>
              {loading && (
                <div style={{ textAlign: 'center', marginTop: 16, color: C.t3, fontSize: 13 }}>
                  ⏳ Анализирую...
                </div>
              )}
              {error && <p style={{ color: C.red, fontSize: 13, marginTop: 12, textAlign: 'center' }}>{error}</p>}
            </div>

            <button onClick={handleReset} style={{ width: '100%', padding: '12px', borderRadius: 14, border: `1px solid ${C.border}`, background: 'none', color: C.t3, fontSize: 13, cursor: 'pointer' }}>
              ← Начать заново
            </button>
          </>
        )}

        {/* ── Step: Results ─────────────────────────────────────────────────── */}
        {phase === 'results' && stepData?.results && (
          <>
            <div style={{ background: `linear-gradient(135deg, ${C.accentBg}, #d4dff0)`, borderRadius: 20, padding: 20, marginBottom: 20, border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>РЕЗУЛЬТАТЫ АНАЛИЗА</p>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: C.t1, margin: 0 }}>Возможные состояния</h2>
              <p style={{ fontSize: 12, color: C.t2, marginTop: 6 }}>На основе симптома «{selectedSymptom}» и ваших ответов</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {stepData.results.map((r, i) => {
                const urg = URG_LABEL[r.urgency];
                const probColor = PROB_COLOR[r.probability] ?? C.t2;
                return (
                  <div key={i} style={{
                    background: C.card, borderRadius: 18, padding: 18, border: `1px solid ${C.border}`,
                    borderLeft: `4px solid ${urg?.color ?? C.border}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.t1, flex: 1, marginRight: 8 }}>{r.condition}</p>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: probColor, background: probColor + '20', flexShrink: 0 }}>
                        {PROB_LABEL[r.probability] ?? r.probability}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.5, marginBottom: 10 }}>{r.description}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 10, background: C.blueBg ?? '#d4dff0', fontSize: 12, fontWeight: 600, color: C.blue }}>👨‍⚕️ {r.specialist}</span>
                      {urg && <span style={{ padding: '4px 10px', borderRadius: 10, background: urg.color + '15', fontSize: 12, fontWeight: 600, color: urg.color }}>{urg.icon} {urg.label}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => router.push(`/${locale}/ai-chat`)}
                        style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1.5px solid ${C.accent}`, background: 'none', fontSize: 13, fontWeight: 700, color: C.accent, cursor: 'pointer' }}>
                        💬 Спросить AI
                      </button>
                      <button
                        onClick={() => router.push(`/${locale}/chat`)}
                        style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.accent}, #7a3848)`, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                        📅 Записаться
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: '#fff9e6', borderRadius: 14, padding: 14, marginBottom: 16, border: '1px solid #f0e08a' }}>
              <p style={{ fontSize: 12, color: '#856404', lineHeight: 1.5, margin: 0 }}>
                ⚠️ <strong>Это не диагноз.</strong> Результаты носят информационный характер. Для точного медицинского заключения обратитесь к врачу.
              </p>
            </div>

            <button onClick={handleReset} style={{ width: '100%', padding: '14px', borderRadius: 16, border: `1.5px solid ${C.accent}`, background: 'none', fontSize: 15, fontWeight: 700, color: C.accent, cursor: 'pointer' }}>
              🔄 Проверить другой симптом
            </button>
          </>
        )}
      </div>
    </div>
  );
}
