'use client';

import { useState } from 'react';
import Link from 'next/link';
import { OrbBackground } from '@/components/shared/orb-background';

// ─── Translations ──────────────────────────────────────────────────────────────

const LANGS = [
  {
    code: 'ru',
    flag: '🇷🇺',
    name: 'Русский',
    greeting: 'Привет!',
    sub: 'Ваш ИИ-помощник для здоровья',
    tagline: 'Здоровье — это',
    taglineEm: 'не случайность',
    body: 'aivita показывает где вы сейчас, и направляет туда, где вы хотите быть',
    start: 'Начать →',
    hasAccount: 'У меня уже есть аккаунт',
    changeLabel: 'Изменить язык',
  },
  {
    code: 'uz',
    flag: '🇺🇿',
    name: "O'zbek",
    greeting: 'Salom!',
    sub: "Sog'liq uchun AI yordamchingiz",
    tagline: "Sog'liq bu",
    taglineEm: 'tasodif emas',
    body: "aivita hozir qayerdaligingizni ko'rsatadi va siz bo'lishni xohlagan joyga yo'naltiradi",
    start: 'Boshlash →',
    hasAccount: 'Menda allaqachon hisob bor',
    changeLabel: 'Tilni o\'zgartirish',
  },
  {
    code: 'en',
    flag: '🇬🇧',
    name: 'English',
    greeting: 'Hello!',
    sub: 'Your AI health companion',
    tagline: 'Health is',
    taglineEm: 'not a coincidence',
    body: 'aivita shows where you are now and guides you to where you want to be',
    start: 'Get started →',
    hasAccount: 'I already have an account',
    changeLabel: 'Change language',
  },
] as const;

type LangCode = 'ru' | 'uz' | 'en';

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingWelcomePage() {
  const [selected, setSelected] = useState<LangCode | null>(null);

  const lang = LANGS.find(l => l.code === selected) ?? null;

  function chooseLang(code: LangCode) {
    // Persist via NEXT_LOCALE cookie (next-intl reads this)
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setSelected(code);
  }

  // ── STATE 1: Language picker ─────────────────────────────────────────────────
  if (!lang) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center px-6 pb-10 overflow-hidden">
        <OrbBackground />

        <div className="relative z-10 w-full max-w-sm">

          {/* Compact orb */}
          <div className="flex justify-center mb-8">
            <div className="relative animate-[drift-1_6s_ease-in-out_infinite]">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-400 via-blue-400 to-emerald-400 flex items-center justify-center shadow-[0_8px_32px_rgba(156,94,108,0.4)]">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <span className="text-4xl">💚</span>
                </div>
              </div>
              <div className="absolute inset-0 rounded-full border border-pink-200/40 scale-110 animate-spin-slow" />
            </div>
          </div>

          {/* Trilingual greeting */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-baseline flex-wrap gap-x-2 gap-y-1 mb-2">
              {LANGS.map((l, i) => (
                <span key={l.code} className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-navy">{l.greeting}</span>
                  {i < LANGS.length - 1 && (
                    <span className="text-pink-300 font-light text-xl">·</span>
                  )}
                </span>
              ))}
            </div>
            <p className="text-[13px] text-gray-400 leading-relaxed">
              Выберите язык&nbsp;·&nbsp;Til tanlang&nbsp;·&nbsp;Choose language
            </p>
          </div>

          {/* Language cards */}
          <div className="space-y-3">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => chooseLang(l.code as LangCode)}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/75 backdrop-blur-xl border border-[rgba(120,160,200,0.18)] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all text-left group"
              >
                <span className="text-3xl">{l.flag}</span>
                <div className="flex-1">
                  <div className="font-bold text-navy text-[15px]">{l.greeting}</div>
                  <div className="text-xs text-gray-400">{l.name} · {l.sub}</div>
                </div>
                <span className="text-gray-300 group-hover:text-pink-400 text-lg transition-colors">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── STATE 2: Welcome in selected language ─────────────────────────────────────
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 pb-10 overflow-hidden">
      <OrbBackground />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">

        {/* Language badge — tap to re-pick */}
        <button
          onClick={() => setSelected(null)}
          className="absolute top-0 right-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur border border-[rgba(120,160,200,0.2)] text-xs text-gray-500 hover:text-navy hover:bg-white transition-all shadow-sm"
        >
          <span>{lang.flag}</span>
          <span>{lang.name}</span>
          <span className="text-gray-300">✕</span>
        </button>

        {/* Floating orb */}
        <div className="relative mb-10 mt-10 animate-[drift-1_6s_ease-in-out_infinite]">
          <div className="w-52 h-52 rounded-full bg-gradient-to-br from-pink-400 via-blue-400 to-emerald-400 flex items-center justify-center shadow-[0_12px_40px_rgba(156,94,108,0.45)]">
            <div className="w-44 h-44 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-6xl">💚</span>
            </div>
          </div>
          <div className="absolute inset-0 rounded-full border border-pink-200/40 scale-110 animate-spin-slow" />
          <div className="absolute inset-0 rounded-full border border-blue-200/30 scale-125 animate-[spin_20s_linear_infinite_reverse]" />
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 mb-8">
          <div className="h-2 w-8 rounded-full bg-gradient-pink-blue-mint" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full bg-gray-200" />
          ))}
        </div>

        <h2 className="text-3xl font-semibold text-navy mb-3">
          {lang.tagline}{' '}
          <em className="font-serif italic font-normal text-pink-500">{lang.taglineEm}</em>
        </h2>
        <p className="text-[rgb(var(--text-secondary))] text-sm mb-10 leading-relaxed">
          {lang.body}
        </p>

        <div className="w-full space-y-3">
          <Link
            href={`/${lang.code}/onboarding/age`}
            className="w-full flex items-center justify-center h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm"
          >
            {lang.start}
          </Link>
          <Link
            href={`/${lang.code}/sign-in`}
            className="w-full flex items-center justify-center h-12 text-[rgb(var(--text-secondary))] text-sm hover:text-navy transition-colors"
          >
            {lang.hasAccount}
          </Link>
        </div>
      </div>
    </div>
  );
}
