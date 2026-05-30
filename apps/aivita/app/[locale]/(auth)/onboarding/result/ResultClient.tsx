'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { completeOnboarding } from './actions';

const C = {
  bg: '#f4f3ef', card: '#ffffff', border: '#e8e4dc', accent: '#9c5e6c',
  text: '#2a2540', text2: '#6a6580', muted: '#9a96a8',
  green: '#3a7a4a',
};

type Factors = { sleep: number; stress: number; activity: number; nutrition: number };
type Action = { key: string; title: string; subtitle: string };
export interface Snapshot {
  totalScore: number;
  realAge: number | null;
  healthAge: number | null;
  factors: Factors;
  insight: string;
  growthZone: string;
  actions: Action[];
}

const DEFAULT_SNAPSHOT: Snapshot = {
  totalScore: 70, realAge: null, healthAge: null,
  factors: { sleep: 70, stress: 70, activity: 70, nutrition: 70 },
  insight: 'Твоя картина здоровья готова. Давай начнём с малого и будем улучшать её шаг за шагом.',
  growthZone: 'Старт', actions: [{ key: 'chat', title: 'Спросить AI-доктора', subtitle: 'Любой вопрос о здоровье' }],
};

const FACTOR_META: Record<keyof Factors, { icon: string; label: string; bg: string; fg: string }> = {
  sleep: { icon: '😴', label: 'Сон', bg: '#e0d8f0', fg: '#8b6aae' },
  stress: { icon: '🧘', label: 'Стресс', bg: '#d4dff0', fg: '#6BA3D6' },
  activity: { icon: '🏃', label: 'Активность', bg: '#d4e8d8', fg: '#3a7a4a' },
  nutrition: { icon: '🥗', label: 'Питание', bg: '#fff3cd', fg: '#e8873a' },
};
const ACTION_ICON: Record<string, { icon: string; bg: string }> = {
  sleep: { icon: '😴', bg: '#e0d8f0' }, stress: { icon: '🧘', bg: '#d4dff0' },
  activity: { icon: '🏃', bg: '#d4e8d8' }, nutrition: { icon: '🥗', bg: '#fff3cd' },
  chat: { icon: '💬', bg: '#f3e7ea' },
};

const STEPS = ['✓ Возраст и образ жизни', '✓ Сон и активность', '✓ Анамнез и риски', '✓ Считаю Health Score…'];

export function ResultClient({ locale, snapshot }: { locale: string; snapshot: Snapshot | null }) {
  const data = snapshot ?? DEFAULT_SNAPSHOT;
  const [phase, setPhase] = useState<'analyzing' | 'result'>('analyzing');
  const [stepIdx, setStepIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [ringReady, setRingReady] = useState(false);
  const [barsReady, setBarsReady] = useState(false);

  // analyzing → result sequence
  useEffect(() => {
    if (phase !== 'analyzing') return;
    if (stepIdx < STEPS.length - 1) {
      const t = setTimeout(() => setStepIdx((i) => i + 1), 620);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase('result'), 620);
    return () => clearTimeout(t);
  }, [phase, stepIdx]);

  // reveal animations
  useEffect(() => {
    if (phase !== 'result') return;
    const r = setTimeout(() => setRingReady(true), 60);
    const b = setTimeout(() => setBarsReady(true), 220);
    let cur = 0;
    const iv = setInterval(() => {
      cur += Math.ceil((data.totalScore - cur) / 8) || 1;
      if (cur >= data.totalScore) { cur = data.totalScore; clearInterval(iv); }
      setCount(cur);
    }, 45);
    return () => { clearTimeout(r); clearTimeout(b); clearInterval(iv); };
  }, [phase, data.totalScore]);

  const RADIUS = 76;
  const CIRC = 2 * Math.PI * RADIUS;
  const offset = ringReady ? CIRC - (CIRC * data.totalScore) / 100 : CIRC;

  const wrap: CSSProperties = { minHeight: '100vh', background: C.bg, fontFamily: "'Outfit', system-ui, sans-serif", color: C.text };
  const inner: CSSProperties = { maxWidth: 480, margin: '0 auto', padding: '54px 22px 28px' };

  if (phase === 'analyzing') {
    return (
      <div style={wrap}>
        <div style={{ ...inner, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', gap: 22 }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#f3e7ea', display: 'grid', placeItems: 'center', fontSize: 40 }}>🧬</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 600 }}>Анализирую твои ответы…</div>
            <div style={{ fontSize: 13, color: C.text2, maxWidth: 230, margin: '8px auto 0', lineHeight: 1.5 }}>AIVITA строит твою персональную картину здоровья</div>
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, minHeight: 18 }}>{STEPS[stepIdx]}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{ ...inner }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.green, textTransform: 'uppercase', margin: '6px 0 2px' }}>Готово</p>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 18px' }}>
          Твой <span style={{ fontStyle: 'italic', color: C.accent, fontWeight: 500 }}>Health Score</span>
        </h1>

        {/* Ring */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <div style={{ position: 'relative', width: 172, height: 172 }}>
            <svg width="172" height="172" viewBox="0 0 172 172" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="86" cy="86" r={RADIUS} fill="none" stroke="#ece7df" strokeWidth="11" />
              <circle cx="86" cy="86" r={RADIUS} fill="none" stroke={C.accent} strokeWidth="11" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>из 100</div>
            </div>
          </div>
        </div>

        {/* Age cards */}
        {data.realAge !== null && data.healthAge !== null && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 0' }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '13px 14px' }}>
              <p style={{ fontSize: 11, color: C.text2, margin: '0 0 3px' }}>Твой возраст</p>
              <p style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{data.realAge}</p>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '13px 14px' }}>
              <p style={{ fontSize: 11, color: C.text2, margin: '0 0 3px' }}>Возраст здоровья</p>
              <p style={{ fontSize: 17, fontWeight: 600, margin: 0, color: data.healthAge <= data.realAge ? C.green : C.accent }}>{data.healthAge}</p>
            </div>
          </div>
        )}

        {/* Factors */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '15px 16px', marginBottom: 14 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.muted, margin: '0 0 12px' }}>Из чего складывается</h2>
          {(Object.keys(FACTOR_META) as (keyof Factors)[]).map((k) => {
            const m = FACTOR_META[k];
            const v = data.factors[k];
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', fontSize: 15, background: m.bg, flexShrink: 0 }}>{m.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 500, width: 80, flexShrink: 0 }}>{m.label}</div>
                <div style={{ flex: 1, height: 7, background: '#eee9e2', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 6, background: m.fg, width: barsReady ? `${v}%` : 0, transition: 'width 1s cubic-bezier(.2,.8,.2,1)' }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, width: 30, textAlign: 'right' }}>{v}</div>
              </div>
            );
          })}
        </div>

        {/* AI insight */}
        <div style={{ background: 'linear-gradient(135deg,#f6ecef 0%,#eef2f6 100%)', border: '1px solid #efe2e6', borderRadius: 22, padding: '16px 17px', marginBottom: 18 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: .6, textTransform: 'uppercase', color: C.accent, background: '#fff', border: '1px solid #efe2e6', padding: '4px 9px', borderRadius: 20, marginBottom: 9 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, boxShadow: '0 0 0 3px #f3e7ea' }} />AIVITA AI
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: C.text }}>{data.insight}</div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {data.actions.map((a, i) => {
            const ic = ACTION_ICON[a.key] ?? ACTION_ICON.chat;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '11px 13px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 16, background: ic.bg, flexShrink: 0 }}>{ic.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: C.text2 }}>{a.subtitle}</div>
                </div>
                <div style={{ color: C.muted, fontSize: 16 }}>›</div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <form action={completeOnboarding.bind(null, locale)}>
          <button type="submit"
            style={{ width: '100%', height: 54, border: 'none', borderRadius: 16, background: C.accent, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 10px 24px rgba(156,94,108,.32)' }}>
            Открыть приложение →
          </button>
        </form>
      </div>
    </div>
  );
}
