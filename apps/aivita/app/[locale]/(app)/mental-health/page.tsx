'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#f4f3ef', card: '#fff', border: '#e8e4dc',
  accent: '#9c5e6c', accentBg: '#f0d4dc',
  green: '#3a7a4a', greenBg: '#d4e8d8',
  blue: '#6BA3D6', blueBg: '#d4dff0',
  purple: '#8b6aae', purpleBg: '#e0d8f0',
  orange: '#e8873a', orangeBg: '#fff3cd',
  t1: '#2a2540', t2: '#6a6580', t3: '#9a96a8',
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'mood',       label: '😊 Настроение' },
  { id: 'breathing',  label: '🌬 Дыхание' },
  { id: 'meditation', label: '🧘 Медитация' },
  { id: 'therapist',  label: '🤝 Терапевт' },
];

// ─── Mood emojis ──────────────────────────────────────────────────────────────
const MOODS = [
  { v: 5, emoji: '😄', label: 'Отлично', color: C.green },
  { v: 4, emoji: '🙂', label: 'Хорошо',  color: '#5a9a6a' },
  { v: 3, emoji: '😐', label: 'Нормально', color: C.orange },
  { v: 2, emoji: '😔', label: 'Плохо',   color: '#d06040' },
  { v: 1, emoji: '😢', label: 'Ужасно',  color: '#c0384a' },
];

const FACTORS = ['Работа', 'Семья', 'Здоровье', 'Сон', 'Финансы', 'Отношения', 'Спорт', 'Питание'];

// ─── Breathing exercises ──────────────────────────────────────────────────────
const BREATHING_EXERCISES = [
  { id: '4-7-8', label: '4-7-8 Релакс', desc: 'Вдох 4с, задержка 7с, выдох 8с', pattern: [4, 7, 8], phases: ['Вдох', 'Задержите', 'Выдох'] },
  { id: 'box',   label: '☐ Бокс',       desc: '4-4-4-4: равное дыхание',         pattern: [4, 4, 4, 4], phases: ['Вдох', 'Задержите', 'Выдох', 'Задержите'] },
  { id: 'deep',  label: '🌊 Глубокое',  desc: '5с вдох, 5с выдох',               pattern: [5, 5], phases: ['Вдох', 'Выдох'] },
];

// ─── Meditations ──────────────────────────────────────────────────────────────
const MEDITATIONS = [
  {
    id: 'morning', label: 'Утреннее спокойствие', duration: 5, emoji: '🌅',
    steps: [
      { t: 0,   text: 'Закройте глаза и сядьте удобно.' },
      { t: 30,  text: 'Сделайте три глубоких вдоха. Почувствуйте своё тело.' },
      { t: 60,  text: 'Представьте тёплый золотой свет, наполняющий вас.' },
      { t: 120, text: 'Подумайте о трёх вещах, за которые вы благодарны сегодня.' },
      { t: 210, text: 'Почувствуйте, как день начинается с ясностью и покоем.' },
      { t: 270, text: 'Медленно откройте глаза. Хорошего дня! 🌟' },
    ],
  },
  {
    id: 'stress', label: 'Снятие стресса', duration: 10, emoji: '🌿',
    steps: [
      { t: 0,   text: 'Найдите тихое место. Сделайте три глубоких вдоха.' },
      { t: 30,  text: 'Почувствуйте, как с каждым выдохом уходит напряжение.' },
      { t: 90,  text: 'Скажите себе: «Я в безопасности. Всё в порядке.»' },
      { t: 180, text: 'Представьте тихое место на природе. Вы там одни.' },
      { t: 360, text: 'Слышите птиц, ветер, воду. Вы полностью расслаблены.' },
      { t: 540, text: 'Медленно возвращайтесь. Вы справитесь с любой задачей.' },
    ],
  },
  {
    id: 'sleep', label: 'Перед сном', duration: 15, emoji: '🌙',
    steps: [
      { t: 0,   text: 'Лягте удобно. Закройте глаза.' },
      { t: 60,  text: 'Расслабьте мышцы лица, шеи, плеч.' },
      { t: 180, text: 'Расслабьте руки, живот, ноги. Тело тяжелеет.' },
      { t: 360, text: 'Дышите медленно. Каждый выдох погружает вас глубже.' },
      { t: 600, text: 'Вы в тёплом, тихом месте. Совершенно в безопасности.' },
      { t: 840, text: 'Позвольте себе отпустить день и уснуть. Спокойной ночи 🌙' },
    ],
  },
  {
    id: 'focus', label: 'Фокус', duration: 7, emoji: '🎯',
    steps: [
      { t: 0,  text: 'Выпрямите спину. Дышите ровно.' },
      { t: 30, text: 'Сосредоточьтесь на одной точке перед вами.' },
      { t: 90, text: 'Каждая мысль — как облако. Просто наблюдайте, не цепляясь.' },
      { t: 180, text: 'Вы полностью здесь. Ум чист и готов к работе.' },
      { t: 360, text: 'Три вдоха — и вы в состоянии потока. Начинайте!' },
    ],
  },
  {
    id: 'gratitude', label: 'Благодарность', duration: 5, emoji: '💛',
    steps: [
      { t: 0,  text: 'Закройте глаза. Сделайте глубокий вдох.' },
      { t: 30, text: 'Вспомните трёх людей, которым вы благодарны. Почему?' },
      { t: 90, text: 'Почувствуйте тепло в груди от этих мыслей.' },
      { t: 180, text: 'Что хорошего произошло сегодня? Даже мелочи важны.' },
      { t: 270, text: 'Вы завершаете с благодарностью. Откройте глаза 💛' },
    ],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface MoodEntry { id: number; mood: number; factors: string[]; note?: string | null; date: string }
interface ChatMessage { id?: number; role: 'user' | 'assistant'; content: string }

// ─── Breathing animation ──────────────────────────────────────────────────────
function BreathingCircle({ phase, label, duration }: { phase: number; label: string; duration: number }) {
  const isExpand = label === 'Вдох';
  const isHold = label === 'Задержите';
  const scale = isExpand ? 1.5 : isHold ? 1.5 : 1.0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '30px 0' }}>
      <div style={{
        width: 160, height: 160, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.purpleBg} 0%, ${C.blueBg} 100%)`,
        border: `3px solid ${C.purple}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${scale})`,
        transition: `transform ${duration}s ease-in-out`,
        boxShadow: `0 0 ${isHold ? '40px' : '20px'} ${C.purple}30`,
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 28, margin: 0 }}>🌬</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.purple, margin: '4px 0 0' }}>{duration}с</p>
        </div>
      </div>
      <p style={{ fontSize: 22, fontWeight: 800, color: C.t1 }}>{label}</p>
      <p style={{ fontSize: 13, color: C.t3 }}>Фаза {phase + 1}</p>
    </div>
  );
}

// ─── Chart (mood history) ─────────────────────────────────────────────────────
function MoodChart({ entries }: { entries: MoodEntry[] }) {
  if (entries.length < 2) return null;
  const last30 = entries.slice(-30);
  const maxMood = 5;
  const w = 280, h = 60;
  const pts = last30.map((e, i) => {
    const x = (i / (last30.length - 1)) * (w - 10) + 5;
    const y = h - 4 - ((e.mood - 1) / (maxMood - 1)) * (h - 8);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: C.t3, marginBottom: 8 }}>Настроение за 30 дней</p>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        <polyline points={pts} fill="none" stroke={C.accent} strokeWidth={2.5} strokeLinejoin="round" />
        {last30.map((e, i) => {
          const x = (i / (last30.length - 1)) * (w - 10) + 5;
          const y = h - 4 - ((e.mood - 1) / (maxMood - 1)) * (h - 8);
          return <circle key={i} cx={x} cy={y} r={3} fill={C.accent} />;
        })}
      </svg>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MentalHealthPage() {
  const params = useParams();
  const router = useRouter();

  const [tab, setTab] = useState<'mood' | 'breathing' | 'meditation' | 'therapist'>('mood');

  // Mood state
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [moodNote, setMoodNote] = useState('');
  const [moodSaved, setMoodSaved] = useState(false);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);

  // Breathing state
  const [breathEx, setBreathEx] = useState(BREATHING_EXERCISES[0]);
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState(0);
  const [breathTimer, setBreathTimer] = useState(0);
  const breathIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [breathCycles, setBreathCycles] = useState(0);

  // Meditation state
  const [selectedMed, setSelectedMed] = useState<typeof MEDITATIONS[0] | null>(null);
  const [medRunning, setMedRunning] = useState(false);
  const [medSeconds, setMedSeconds] = useState(0);
  const [medStep, setMedStep] = useState(0);
  const medIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Therapist state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load mood history on tab switch
  useEffect(() => {
    if (tab === 'mood' && moodHistory.length === 0) {
      fetch('/api/proxy/mental/mood?period=30d')
        .then(r => r.json())
        .then((j: { data?: MoodEntry[] }) => { if (j.data) setMoodHistory(j.data); })
        .catch(() => {});
    }
    if (tab === 'therapist' && chatMessages.length === 0) {
      fetch('/api/proxy/mental/therapist/history')
        .then(r => r.json())
        .then((j: { data?: ChatMessage[] }) => { if (j.data?.length) setChatMessages(j.data); })
        .catch(() => {});
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save mood ────────────────────────────────────────────────────────────────
  const handleSaveMood = async () => {
    if (!selectedMood) return;
    setMoodLoading(true);
    try {
      const res = await fetch('/api/proxy/mental/mood', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mood: selectedMood, factors: selectedFactors, note: moodNote || undefined }),
      });
      const json = await res.json() as { data?: MoodEntry };
      if (json.data) {
        setMoodSaved(true);
        setMoodHistory(prev => [json.data!, ...prev]);
      }
    } catch { /* silent */ }
    finally { setMoodLoading(false); }
  };

  // ── Breathing ────────────────────────────────────────────────────────────────
  const startBreathing = useCallback(() => {
    setBreathRunning(true);
    setBreathPhase(0);
    setBreathTimer(breathEx.pattern[0]);
    let phaseIdx = 0;
    let phaseTime = breathEx.pattern[0];

    breathIntervalRef.current = setInterval(() => {
      phaseTime -= 1;
      setBreathTimer(phaseTime);
      if (phaseTime <= 0) {
        phaseIdx = (phaseIdx + 1) % breathEx.pattern.length;
        if (phaseIdx === 0) setBreathCycles(c => c + 1);
        phaseTime = breathEx.pattern[phaseIdx];
        setBreathPhase(phaseIdx);
        setBreathTimer(phaseTime);
      }
    }, 1000);
  }, [breathEx]);

  const stopBreathing = useCallback(() => {
    if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    setBreathRunning(false);
  }, []);

  useEffect(() => () => { if (breathIntervalRef.current) clearInterval(breathIntervalRef.current); }, []);

  // ── Meditation ───────────────────────────────────────────────────────────────
  const startMeditation = useCallback((med: typeof MEDITATIONS[0]) => {
    setSelectedMed(med);
    setMedRunning(true);
    setMedSeconds(0);
    setMedStep(0);
    let secs = 0;

    medIntervalRef.current = setInterval(() => {
      secs += 1;
      setMedSeconds(secs);

      // Check which step to show
      const totalSecs = med.duration * 60;
      if (secs >= totalSecs) {
        if (medIntervalRef.current) clearInterval(medIntervalRef.current);
        setMedRunning(false);
        return;
      }
      const stepIdx = med.steps.findIndex((s, i) => {
        const next = med.steps[i + 1];
        return secs >= s.t && (!next || secs < next.t);
      });
      if (stepIdx >= 0) setMedStep(stepIdx);
    }, 1000);
  }, []);

  const stopMeditation = useCallback(() => {
    if (medIntervalRef.current) clearInterval(medIntervalRef.current);
    setMedRunning(false);
    setSelectedMed(null);
  }, []);

  useEffect(() => () => { if (medIntervalRef.current) clearInterval(medIntervalRef.current); }, []);

  const medPct = selectedMed ? Math.min((medSeconds / (selectedMed.duration * 60)) * 100, 100) : 0;
  const medTimeLeft = selectedMed ? Math.max((selectedMed.duration * 60) - medSeconds, 0) : 0;

  // ── Therapist chat ───────────────────────────────────────────────────────────
  const sendTherapistMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput('');
    setChatLoading(true);
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);

    try {
      const res = await fetch('/api/proxy/mental/therapist/message', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json() as { data?: { message: ChatMessage } };
      if (json.data?.message) setChatMessages(prev => [...prev, json.data!.message]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Произошла ошибка. Попробуйте ещё раз.' }]);
    } finally { setChatLoading(false); }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const todayMood = moodHistory.find(m => m.date === new Date().toISOString().split('T')[0]);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background: C.card, padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => router.back()} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: C.t2, padding: 0 }}>←</button>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 1 }}>ПСИХОЛОГИЯ</p>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.t1, margin: 0 }}>Ментальное здоровье</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.card, padding: '0 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 2, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            style={{
              padding: '12px 10px', border: 'none', background: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              color: tab === t.id ? C.accent : C.t3,
              borderBottom: `2.5px solid ${tab === t.id ? C.accent : 'transparent'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        {/* ── MOOD TAB ──────────────────────────────────────────────────────── */}
        {tab === 'mood' && (
          <>
            {!moodSaved && !todayMood ? (
              <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.t1, textAlign: 'center', marginBottom: 20 }}>Как вы сегодня?</p>

                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20 }}>
                  {MOODS.map(m => (
                    <button key={m.v} onClick={() => setSelectedMood(m.v)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '10px 8px', borderRadius: 14,
                        border: `2px solid ${selectedMood === m.v ? m.color : C.border}`,
                        background: selectedMood === m.v ? m.color + '20' : '#fafaf8',
                        cursor: 'pointer', transition: 'all .15s',
                      }}>
                      <span style={{ fontSize: 32 }}>{m.emoji}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: selectedMood === m.v ? m.color : C.t3 }}>{m.label}</span>
                    </button>
                  ))}
                </div>

                {selectedMood && (
                  <>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.t2, marginBottom: 10 }}>Что повлияло? (необязательно)</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {FACTORS.map(f => (
                        <button key={f} onClick={() => setSelectedFactors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                          style={{
                            padding: '5px 12px', borderRadius: 20,
                            border: `1.5px solid ${selectedFactors.includes(f) ? C.accent : C.border}`,
                            background: selectedFactors.includes(f) ? C.accentBg : '#fafaf8',
                            fontSize: 12, fontWeight: 600, color: selectedFactors.includes(f) ? C.accent : C.t2, cursor: 'pointer',
                          }}>
                          {f}
                        </button>
                      ))}
                    </div>
                    <textarea placeholder="Заметка (необязательно)..." value={moodNote} onChange={e => setMoodNote(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: '#fafaf8', fontSize: 13, color: C.t1, resize: 'none', outline: 'none', minHeight: 60, boxSizing: 'border-box', marginBottom: 12 }} />
                    <button onClick={handleSaveMood} disabled={moodLoading}
                      style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${C.accent}, #7a3848)`, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                      {moodLoading ? 'Сохраняю...' : '💾 Сохранить настроение'}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div style={{ background: C.greenBg, borderRadius: 20, padding: 20, marginBottom: 16, border: `1px solid ${C.green}30`, textAlign: 'center' }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>
                  {MOODS.find(m => m.v === (todayMood?.mood ?? selectedMood))?.emoji ?? '😊'}
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.green, marginBottom: 4 }}>Настроение сегодня сохранено!</p>
                <p style={{ fontSize: 13, color: C.t2 }}>
                  {MOODS.find(m => m.v === (todayMood?.mood ?? selectedMood))?.label}
                  {(todayMood?.factors?.length ?? 0) > 0 && ` · ${todayMood?.factors.join(', ')}`}
                </p>
              </div>
            )}

            {/* Mood history chart */}
            {moodHistory.length > 0 && (
              <div style={{ background: C.card, borderRadius: 20, padding: 20, border: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 8 }}>История настроения</p>
                <MoodChart entries={moodHistory} />
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {moodHistory.slice(0, 7).map(e => {
                    const m = MOODS.find(x => x.v === e.mood);
                    return (
                      <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 20 }}>{m?.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.t2 }}>{e.date}</span>
                          {e.note && <p style={{ fontSize: 11, color: C.t3, margin: '2px 0 0' }}>{e.note}</p>}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: m?.color }}>{m?.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── BREATHING TAB ─────────────────────────────────────────────────── */}
        {tab === 'breathing' && (
          <>
            {/* Exercise selector */}
            {!breathRunning && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {BREATHING_EXERCISES.map(ex => (
                  <button key={ex.id} onClick={() => { setBreathEx(ex); setBreathCycles(0); }}
                    style={{
                      padding: '16px 18px', borderRadius: 16, border: `2px solid ${breathEx.id === ex.id ? C.purple : C.border}`,
                      background: breathEx.id === ex.id ? C.purpleBg : C.card, textAlign: 'left', cursor: 'pointer',
                    }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: breathEx.id === ex.id ? C.purple : C.t1, margin: 0 }}>{ex.label}</p>
                    <p style={{ fontSize: 12, color: C.t3, margin: '4px 0 0' }}>{ex.desc}</p>
                    <p style={{ fontSize: 11, color: C.t3, margin: '4px 0 0' }}>
                      {ex.pattern.map((p, i) => `${ex.phases[i]} ${p}с`).join(' → ')}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Animation */}
            <div style={{ background: tab === 'breathing' ? '#1a1630' : C.card, borderRadius: 24, padding: 24, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              {breathRunning ? (
                <>
                  <BreathingCircle
                    phase={breathPhase}
                    label={breathEx.phases[breathPhase]}
                    duration={breathEx.pattern[breathPhase]}
                  />
                  <p style={{ textAlign: 'center', color: '#c0b8d0', fontSize: 13, marginBottom: 8 }}>Цикл {breathCycles + 1}</p>
                  <button onClick={stopBreathing}
                    style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: '#ffffff20', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    ⏹ Остановить
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: 48, marginBottom: 12 }}>🌬</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.t1, marginBottom: 6 }}>{breathEx.label}</p>
                  <p style={{ fontSize: 13, color: C.t3, marginBottom: 20 }}>{breathEx.desc}</p>
                  <button onClick={startBreathing}
                    style={{ padding: '14px 40px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                    ▶ Начать
                  </button>
                  {breathCycles > 0 && <p style={{ fontSize: 13, color: C.green, marginTop: 12 }}>✅ {breathCycles} цикл(ов) завершено</p>}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── MEDITATION TAB ────────────────────────────────────────────────── */}
        {tab === 'meditation' && (
          <>
            {!medRunning ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MEDITATIONS.map(med => (
                  <button key={med.id} onClick={() => startMeditation(med)}
                    style={{ padding: '18px', borderRadius: 18, border: `1px solid ${C.border}`, background: C.card, textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span style={{ fontSize: 36, flexShrink: 0 }}>{med.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.t1, margin: 0 }}>{med.label}</p>
                      <p style={{ fontSize: 12, color: C.t3, margin: '4px 0 0' }}>{med.duration} мин</p>
                    </div>
                    <span style={{ fontSize: 20, color: C.t3 }}>▶</span>
                  </button>
                ))}
              </div>
            ) : selectedMed && (
              <div style={{ background: '#1a1630', borderRadius: 24, padding: 24, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
                {/* Progress */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#d0c8e0' }}>{selectedMed.emoji} {selectedMed.label}</span>
                    <span style={{ fontSize: 13, color: '#908898' }}>{Math.floor(medTimeLeft / 60)}:{String(medTimeLeft % 60).padStart(2, '0')}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: '#302844' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${C.purple}, ${C.blue})`, width: `${medPct}%`, transition: 'width 1s linear' }} />
                  </div>
                </div>

                {/* Current instruction */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 0' }}>
                  {medPct >= 100 ? (
                    <>
                      <p style={{ fontSize: 48 }}>🎉</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 12 }}>Завершено!</p>
                    </>
                  ) : (
                    <p style={{ fontSize: 18, fontWeight: 600, color: '#e0d8f0', lineHeight: 1.6, maxWidth: 280 }}>
                      {selectedMed.steps[medStep]?.text}
                    </p>
                  )}
                </div>

                <button onClick={stopMeditation}
                  style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: '#ffffff15', color: '#c0b8d0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {medPct >= 100 ? '✅ Готово' : '⏹ Завершить'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── THERAPIST TAB ─────────────────────────────────────────────────── */}
        {tab === 'therapist' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 260px)', minHeight: 400 }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>🤝</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 6 }}>AI CBT-терапевт</p>
                  <p style={{ fontSize: 13, color: C.t3, lineHeight: 1.6 }}>Расскажите, как вы себя чувствуете, что вас беспокоит или что происходит в жизни.</p>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '12px 16px', borderRadius: 18,
                    background: m.role === 'user' ? `linear-gradient(135deg, ${C.accent}, #7a3848)` : C.card,
                    border: m.role === 'assistant' ? `1px solid ${C.border}` : 'none',
                    color: m.role === 'user' ? '#fff' : C.t1, fontSize: 14, lineHeight: 1.5,
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '12px 16px', borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, color: C.t3, fontSize: 14 }}>
                    ✍️ Печатает...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 10, padding: '12px 0 0', borderTop: `1px solid ${C.border}` }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTherapistMessage(); } }}
                placeholder="Напишите что-нибудь..."
                style={{ flex: 1, padding: '12px 16px', borderRadius: 20, border: `1.5px solid ${C.border}`, background: C.card, fontSize: 14, color: C.t1, outline: 'none' }}
              />
              <button onClick={sendTherapistMessage} disabled={!chatInput.trim() || chatLoading}
                style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', background: `linear-gradient(135deg, ${C.accent}, #7a3848)`, color: '#fff', fontSize: 18, cursor: chatInput.trim() ? 'pointer' : 'default', opacity: chatInput.trim() ? 1 : 0.5, flexShrink: 0 }}>
                ↑
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
