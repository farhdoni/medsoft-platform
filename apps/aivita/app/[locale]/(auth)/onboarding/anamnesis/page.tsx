'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { OrbBackground } from '@/components/shared/orb-background';

const CONDITIONS = [
  'Гипертония', 'Гастрит', 'Диабет', 'Астма',
  'Аллергии', 'Сердце', 'Щитовидка', 'Анемия',
  'Мигрень', 'Другое',
];

export default function OnboardingAnamnesisPage() {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(item: string) {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 flex flex-col flex-1 px-5 pt-5 pb-8 max-w-sm mx-auto w-full">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link href="../onboarding/age" className="w-10 h-10 rounded-2xl bg-white/70 backdrop-blur border border-[rgba(120,160,200,0.2)] flex items-center justify-center hover:bg-white transition-colors">
            <ChevronLeft className="w-5 h-5 text-navy" />
          </Link>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-gradient-pink-blue-mint rounded-full" />
          </div>
          <span className="text-xs text-[rgb(var(--text-muted))] font-medium">4 / 6</span>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mt-6 mb-2">
          ХРОНИЧЕСКИЕ ЗАБОЛЕВАНИЯ
        </p>
        <h3 className="text-2xl font-semibold text-navy mb-1">
          Что было{' '}
          <em className="font-serif italic font-normal text-pink-500">в прошлом</em>?
        </h3>
        <p className="text-[rgb(var(--text-secondary))] text-sm mb-6">
          Можно несколько вариантов или ничего
        </p>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CONDITIONS.map((cond) => {
            const isSelected = selected.includes(cond);
            return (
              <button
                key={cond}
                onClick={() => toggle(cond)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-medium border transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-50 to-blue-50 border-pink-400 text-pink-700'
                    : 'bg-white/70 backdrop-blur border-[rgba(120,160,200,0.2)] text-navy hover:bg-white'
                }`}
              >
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {cond}
              </button>
            );
          })}
        </div>

        {/* Privacy hint */}
        <div className="bg-gradient-to-r from-blue-50 to-pink-50 rounded-2xl border border-[rgba(120,160,200,0.15)] p-4 mb-6">
          <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">
            🔒 <strong>Данные шифруются</strong> и доступны только тебе. Никаких страховых компаний.
          </p>
        </div>

        <div className="space-y-2 mt-auto">
          <Link
            href="../onboarding/result"
            className="w-full flex items-center justify-center h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm"
          >
            Продолжить
          </Link>
          <Link
            href="../onboarding/result"
            className="w-full flex items-center justify-center h-12 text-[rgb(var(--text-secondary))] text-sm hover:text-navy transition-colors"
          >
            Ничего из этого нет →
          </Link>
        </div>
      </div>
    </div>
  );
}
