'use client';

import { useState, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { saveLifestyle, type LifestyleAnswers } from './actions';

const C = {
  bg: '#f4f3ef', card: '#ffffff', border: '#e8e4dc', accent: '#9c5e6c',
  text: '#2a2540', text2: '#6a6580', muted: '#9a96a8',
};

type Q = { key: keyof LifestyleAnswers; icon: string; title: string; options: { value: string; label: string }[] };

const QUESTIONS: Q[] = [
  { key: 'sleepHoursPerNight', icon: '😴', title: 'Сколько обычно спишь?', options: [
    { value: '<6', label: 'Меньше 6ч' }, { value: '6-7', label: '6–7ч' }, { value: '7-8', label: '7–8ч' }, { value: '>8', label: 'Больше 8ч' } ] },
  { key: 'stressLevel', icon: '🧘', title: 'Уровень стресса в жизни?', options: [
    { value: 'low', label: 'Низкий' }, { value: 'moderate', label: 'Средний' }, { value: 'high', label: 'Высокий' } ] },
  { key: 'exerciseFrequency', icon: '🏃', title: 'Как часто двигаешься?', options: [
    { value: 'rare', label: 'Почти нет' }, { value: 'sometimes', label: 'Иногда' }, { value: 'often', label: 'Часто' }, { value: 'daily', label: 'Каждый день' } ] },
  { key: 'nutritionType', icon: '🥗', title: 'Как питаешься?', options: [
    { value: 'balanced', label: 'Сбалансированно' }, { value: 'vegetarian', label: 'Вегетарианец' }, { value: 'vegan', label: 'Веган' }, { value: 'fastfood', label: 'Часто фастфуд' } ] },
];

export default function OnboardingLifestylePage() {
  const params = useParams();
  const locale = (typeof params?.locale === 'string' ? params.locale : 'ru');
  const router = useRouter();
  const [answers, setAnswers] = useState<LifestyleAnswers>({});
  const [pending, startTransition] = useTransition();

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const allAnswered = answeredCount === QUESTIONS.length;

  function pick(key: keyof LifestyleAnswers, value: string) {
    setAnswers((p) => ({ ...p, [key]: value }));
  }
  function submit() {
    startTransition(() => { void saveLifestyle(locale, answers); });
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "var(--font-app), system-ui, sans-serif", color: C.text }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Header + progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button onClick={() => router.back()} aria-label="Назад"
            style={{ width: 40, height: 40, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 18, cursor: 'pointer' }}>‹</button>
          <div style={{ flex: 1, height: 6, background: '#eee9e2', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '83%', background: C.accent, borderRadius: 6 }} />
          </div>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>5 / 6</span>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: C.accent, margin: '18px 0 6px' }}>Образ жизни</p>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px' }}>Пара быстрых вопросов</h1>
        <p style={{ fontSize: 14, color: C.text2, margin: '0 0 20px' }}>Это нужно, чтобы посчитать твой персональный Health Score.</p>

        {QUESTIONS.map((q) => (
          <div key={q.key} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>{q.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{q.title}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {q.options.map((o) => {
                const active = answers[q.key] === o.value;
                return (
                  <button key={o.value} onClick={() => pick(q.key, o.value)}
                    style={{
                      fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: '10px 14px', borderRadius: 14, cursor: 'pointer',
                      border: `1px solid ${active ? C.accent : C.border}`,
                      background: active ? '#f3e7ea' : C.card,
                      color: active ? C.accent : C.text,
                      transition: 'all .15s',
                    }}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <button onClick={submit} disabled={pending}
            style={{
              width: '100%', height: 54, border: 'none', borderRadius: 16, fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
              color: '#fff', cursor: pending ? 'default' : 'pointer',
              background: allAnswered ? C.accent : '#cdbcc2',
              boxShadow: allAnswered ? '0 10px 24px rgba(156,94,108,.32)' : 'none', opacity: pending ? 0.7 : 1,
            }}>
            {pending ? 'Считаю…' : allAnswered ? 'Узнать мой Health Score →' : `Ответь на ${QUESTIONS.length - answeredCount} вопрос(а)`}
          </button>
          <button onClick={submit} disabled={pending}
            style={{ width: '100%', height: 44, marginTop: 4, background: 'none', border: 'none', color: C.text2, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
            Пропустить →
          </button>
        </div>
      </div>
    </div>
  );
}
