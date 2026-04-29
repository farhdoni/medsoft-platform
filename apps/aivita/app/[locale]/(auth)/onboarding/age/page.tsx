'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { OrbBackground } from '@/components/shared/orb-background';

const AGE_OPTIONS = [
  { value: '18-29', emoji: '🌱', label: '18–29', sub: 'Молодость' },
  { value: '30-44', emoji: '⚡', label: '30–44', sub: 'Активный возраст' },
  { value: '45-59', emoji: '🌿', label: '45–59', sub: 'Зрелость' },
  { value: '60+', emoji: '🌳', label: '60+', sub: 'Опыт' },
];

export default function OnboardingAgePage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 flex flex-col flex-1 px-5 pt-5 pb-8 max-w-sm mx-auto w-full">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link href="../onboarding/welcome" className="w-10 h-10 rounded-2xl bg-white/70 backdrop-blur border border-[rgba(120,160,200,0.2)] flex items-center justify-center hover:bg-white transition-colors">
            <ChevronLeft className="w-5 h-5 text-navy" />
          </Link>
          {/* Progress bar */}
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-pink-blue-mint rounded-full" />
          </div>
          <span className="text-xs text-[rgb(var(--text-muted))] font-medium">2 / 6</span>
        </div>

        {/* Label */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mt-6 mb-2">О ТЕБЕ</p>
        <h3 className="text-2xl font-semibold text-navy mb-1">
          Сколько тебе{' '}
          <em className="font-serif italic font-normal text-pink-500">лет</em>?
        </h3>
        <p className="text-[rgb(var(--text-secondary))] text-sm mb-6">
          Возраст — основа для расчёта риска и персональных рекомендаций
        </p>

        {/* Options */}
        <div className="space-y-2 flex-1">
          {AGE_OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full flex items-center gap-4 h-16 px-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'border-pink-400 bg-gradient-to-r from-pink-50 to-blue-50 shadow-soft'
                    : 'border-[rgba(120,160,200,0.2)] bg-white/60 backdrop-blur hover:bg-white/80'
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                  isSelected ? 'bg-gradient-pink-blue-mint' : 'bg-gray-50'
                }`}>
                  {opt.emoji}
                </div>
                {/* Text */}
                <div className="flex-1 text-left">
                  <div className={`font-semibold text-sm ${isSelected ? 'text-navy' : 'text-navy'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-[rgb(var(--text-secondary))]">{opt.sub}</div>
                </div>
                {/* Radio */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? 'border-pink-500 bg-gradient-pink-blue-mint' : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-6">
          <Link
            href={selected ? '../onboarding/anamnesis' : '#'}
            onClick={(e) => !selected && e.preventDefault()}
            className={`w-full flex items-center justify-center h-14 font-bold rounded-2xl text-sm transition-all ${
              selected
                ? 'bg-gradient-pink-blue-mint text-white shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Продолжить
          </Link>
        </div>
      </div>
    </div>
  );
}
