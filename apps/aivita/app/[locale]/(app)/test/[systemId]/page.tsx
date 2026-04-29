'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const QUESTIONS = [
  {
    id: 'q1',
    text: 'Как часто не высыпаешься?',
    sub: 'За последние 30 дней',
    min: 0, max: 7,
    minLabel: 'Никогда', maxLabel: 'Каждый день',
    fact: '3 ночи плохого сна = риск гипертонии +18%',
  },
  {
    id: 'q2',
    text: 'Насколько часто испытываешь стресс?',
    sub: 'По шкале от 0 до 10',
    min: 0, max: 10,
    minLabel: 'Никогда', maxLabel: 'Постоянно',
    fact: 'Хронический стресс снижает иммунитет на 30%',
  },
  {
    id: 'q3',
    text: 'Сколько часов в день сидишь?',
    sub: 'Включая работу и отдых',
    min: 0, max: 16,
    minLabel: '0 часов', maxLabel: '16+ часов',
    fact: 'Сидение более 8 часов в день = риск сердечных заболеваний +15%',
  },
];

export default function SystemTestPage({ params }: { params: Promise<{ systemId: string }> }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(QUESTIONS.length).fill(3));
  const [done, setDone] = useState(false);

  const q = QUESTIONS[current];

  function next() {
    if (current < QUESTIONS.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      setDone(true);
    }
  }

  if (done) {
    const avgScore = Math.round(100 - (answers.reduce((a, b) => a + b) / answers.length) * 8);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5">
        <span className="text-4xl mb-4">🧠</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-2">ПСИХО И СТРЕСС</p>
        <h3 className="text-xl font-semibold text-navy mb-6 text-center">
          Твой результат <em className="font-serif italic font-normal text-pink-500">системы</em>
        </h3>
        <div className="text-center mb-6">
          <span className="text-6xl font-light text-pink-500">{avgScore}</span>
          <span className="text-xl text-[rgb(var(--text-muted))]"> / 100</span>
        </div>
        <div className="space-y-3 w-full max-w-sm mb-6">
          <div className="bg-orange-50 rounded-2xl border border-orange-100 p-4">
            <p className="text-sm text-orange-700 font-medium">⚠ Зона роста</p>
            <p className="text-xs text-orange-600 mt-1">Сон <em>прерывистый</em>. Начни с 10 минут вечерней рутины.</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
            <p className="text-sm text-emerald-700 font-medium">✓ Что в плюсе</p>
            <p className="text-xs text-emerald-600 mt-1">Уровень тревоги <em>в норме</em></p>
          </div>
        </div>
        <Link href="/test" className="w-full max-w-sm flex items-center justify-center h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink text-sm">
          Следующая система →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-5 pt-5 pb-8 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/test" className="w-10 h-10 rounded-2xl bg-white/70 backdrop-blur border border-[rgba(120,160,200,0.2)] flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-navy" />
        </Link>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-pink-blue-mint rounded-full transition-all"
            style={{ width: `${((current + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-[rgb(var(--text-muted))] font-medium">{current + 1} / {QUESTIONS.length}</span>
      </div>

      {/* Question */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-2">🧠 ПСИХО И СТРЕСС</p>
      <h3 className="text-xl font-semibold text-navy mb-1">
        Как часто{' '}
        <em className="font-serif italic font-normal text-pink-500">{q.text.toLowerCase().replace('как часто ', '')}</em>
      </h3>
      <p className="text-xs text-[rgb(var(--text-secondary))] mb-6">{q.sub}</p>

      {/* Slider */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[rgb(var(--text-secondary))]">Значение</span>
          <span className="text-3xl font-light text-pink-500 font-serif">{answers[current]}</span>
        </div>
        <input
          type="range"
          min={q.min}
          max={q.max}
          value={answers[current]}
          onChange={(e) => {
            const newAnswers = [...answers];
            newAnswers[current] = Number(e.target.value);
            setAnswers(newAnswers);
          }}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #ec4899 0%, #3b82f6 ${((answers[current] - q.min) / (q.max - q.min)) * 100}%, #e5e7eb ${((answers[current] - q.min) / (q.max - q.min)) * 100}%)`,
          }}
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-[rgb(var(--text-muted))]">{q.minLabel}</span>
          <span className="text-xs text-[rgb(var(--text-muted))]">{q.maxLabel}</span>
        </div>
      </div>

      {/* Educational card */}
      <div className="bg-gradient-to-r from-pink-50 to-blue-50 rounded-2xl border border-[rgba(236,72,153,0.1)] p-4 mb-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-1">💡 ЗНАЕШЬ ЧТО</p>
        <p className="text-xs text-[rgb(var(--text-secondary))]">{q.fact}</p>
      </div>

      <button
        onClick={next}
        className="mt-6 w-full flex items-center justify-center h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm"
      >
        {current < QUESTIONS.length - 1 ? 'Дальше →' : 'Завершить'}
      </button>
    </div>
  );
}
