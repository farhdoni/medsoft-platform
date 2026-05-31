'use client';

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg: '#f4f3ef', card: '#ffffff', border: '#e8e4dc', accent: '#9c5e6c', soft: '#f3e7ea',
  text: '#2a2540', text2: '#6a6580', muted: '#9a96a8',
};

const LANGS = [
  { code: 'ru', flag: '🇷🇺', name: 'Русский', greet: 'Привет!', sub: 'Твой AI-помощник для здоровья',
    tag: 'Здоровье — это', em: 'не случайность', body: 'aivita показывает, где ты сейчас, и ведёт туда, где ты хочешь быть',
    start: 'Начать →', has: 'У меня уже есть аккаунт', choose: 'Выбери язык' },
  { code: 'uz', flag: '🇺🇿', name: "O'zbek", greet: 'Salom!', sub: "Sog'liq uchun AI yordamchingiz",
    tag: "Sog'liq bu", em: 'tasodif emas', body: "aivita hozir qayerdaligingizni ko'rsatadi va siz xohlagan joyga yo'naltiradi",
    start: 'Boshlash →', has: 'Menda hisob bor', choose: 'Tilni tanlang' },
  { code: 'en', flag: '🇬🇧', name: 'English', greet: 'Hello!', sub: 'Your AI health companion',
    tag: 'Health is', em: 'not a coincidence', body: 'aivita shows where you are now and guides you where you want to be',
    start: 'Get started →', has: 'I already have an account', choose: 'Choose your language' },
] as const;

type LangCode = (typeof LANGS)[number]['code'];

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<LangCode | null>(null);
  const lang = LANGS.find((l) => l.code === selected) ?? null;

  function choose(code: LangCode) {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setSelected(code);
  }

  const wrap: CSSProperties = { minHeight: '100vh', background: C.bg, fontFamily: "var(--font-app), system-ui, sans-serif", color: C.text };
  const inner: CSSProperties = { maxWidth: 480, margin: '0 auto', padding: '24px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100vh' };

  // ── Stage 1: language picker ──
  if (!lang) {
    return (
      <div style={wrap}>
        <div style={{ ...inner, justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 8 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: C.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 34, fontWeight: 800, marginBottom: 18, boxShadow: '0 12px 30px rgba(156,94,108,.3)' }}>a</div>
          <p style={{ fontSize: 14, color: C.text2, marginBottom: 16 }}>Выбери язык · Tilni tanlang · Choose language</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => choose(l.code)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ fontSize: 22 }}>{l.flag}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{l.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Stage 2: intro in chosen language ──
  return (
    <div style={wrap}>
      <div style={inner}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 6 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: C.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 34, fontWeight: 800, marginBottom: 14, boxShadow: '0 12px 30px rgba(156,94,108,.3)' }}>a</div>
          <h1 style={{ fontSize: 30, fontWeight: 600 }}>{lang.greet}</h1>
          <p style={{ fontSize: 14, color: C.text2 }}>{lang.sub}</p>
          <h2 style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2, marginTop: 18 }}>
            {lang.tag} <span style={{ fontStyle: 'italic', color: C.accent, fontWeight: 500 }}>{lang.em}</span>
          </h2>
          <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.5, marginTop: 4 }}>{lang.body}</p>
        </div>
        <div style={{ paddingTop: 14 }}>
          <button onClick={() => router.push(`/${lang.code}/onboarding/age`)}
            style={{ width: '100%', height: 54, border: 'none', borderRadius: 16, background: C.accent, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 10px 24px rgba(156,94,108,.32)' }}>
            {lang.start}
          </button>
          <button onClick={() => router.push(`/${lang.code}/sign-in`)}
            style={{ width: '100%', height: 46, marginTop: 4, background: 'none', border: 'none', color: C.text2, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
            {lang.has}
          </button>
        </div>
      </div>
    </div>
  );
}
