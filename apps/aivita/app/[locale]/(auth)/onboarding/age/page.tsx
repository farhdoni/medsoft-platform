'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { saveBirthDate } from './actions';
import { calcAge, getTodayDate } from '@/lib/date-utils';

const C = {
  bg: '#f4f3ef', card: '#ffffff', border: '#e8e4dc', accent: '#9c5e6c', soft: '#f3e7ea',
  text: '#2a2540', text2: '#6a6580', muted: '#9a96a8',
};
const MIN_AGE = 12;
const MAX_AGE = 90;

const CURRENT_YEAR = new Date().getFullYear();
// Newest eligible birth year first (turns MIN_AGE this year), oldest last
// (turns MAX_AGE this year) — the 12–90 age rule is enforced by this range,
// not by a separate cap elsewhere.
const MAX_BIRTH_YEAR = CURRENT_YEAR - MIN_AGE;
const MIN_BIRTH_YEAR = CURRENT_YEAR - MAX_AGE;
const YEARS = Array.from({ length: MAX_BIRTH_YEAR - MIN_BIRTH_YEAR + 1 }, (_, i) => MAX_BIRTH_YEAR - i);

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate(); // day 0 of next month = last day of `month`
}

const selectStyle = {
  className: 'text-[15px] rounded-[12px] border px-2 py-3 outline-none bg-white w-full text-center',
  style: { borderColor: C.border, color: C.text },
};

export default function OnboardingAgePage() {
  const t = useTranslations('app.onboarding');
  const locale = useLocale();
  const [day, setDay] = useState<number | ''>('');
  const [month, setMonth] = useState<number | ''>('');
  const [year, setYear] = useState<number | ''>('');
  const [pending, startTransition] = useTransition();

  // Static per-locale list, not Intl.DateTimeFormat(locale, {month:'long'}) —
  // verified in-browser that this engine's ICU data has no 'uz' month names
  // and silently falls back to "M01".."M12". Can't rely on the end user's
  // browser having full ICU either, so the dictionary is the source of truth.
  const monthNames = t.raw('age.months') as string[];

  const maxDay = year !== '' && month !== '' ? daysInMonth(year, month) : 31;
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

  function handleMonthChange(m: number) {
    setMonth(m);
    if (day !== '' && year !== '') {
      const cap = daysInMonth(year, m);
      if (day > cap) setDay(cap);
    }
  }
  function handleYearChange(y: number) {
    setYear(y);
    if (day !== '' && month !== '') {
      const cap = daysInMonth(y, month);
      if (day > cap) setDay(cap);
    }
  }

  const allSelected = day !== '' && month !== '' && year !== '';
  const birthDate = allSelected
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : null;

  const age = birthDate ? calcAge(birthDate) : null;
  const isFuture = birthDate ? birthDate > getTodayDate() : false;
  const ageOutOfRange = age !== null && (age < MIN_AGE || age > MAX_AGE);
  const canSubmit = allSelected && !isFuture && !ageOutOfRange && !pending;

  function submit() {
    if (!birthDate || !canSubmit) return;
    startTransition(() => { void saveBirthDate(locale, birthDate); });
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "var(--font-app), system-ui, sans-serif", color: C.text }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Link href="../onboarding/welcome" aria-label="Назад"
            style={{ width: 40, height: 40, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 18, display: 'grid', placeItems: 'center', textDecoration: 'none' }}>‹</Link>
          <div style={{ flex: 1, height: 6, background: '#eee9e2', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '33%', background: C.accent, borderRadius: 6 }} />
          </div>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>2 / 6</span>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: C.accent, margin: '16px 0 6px' }}>{t('age.eyebrow')}</p>
        <h1 style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2, margin: '0 0 6px' }}>
          {t('age.title')} <span style={{ fontStyle: 'italic', color: C.accent, fontWeight: 500 }}>{t('age.titleEm')}</span>
        </h1>
        <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.5, margin: '0 0 24px' }}>{t('age.sub')}</p>

        {/* Day / Month / Year selects */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <div style={{ fontSize: 40 }}>🎂</div>

          <div className="grid grid-cols-3 gap-2" style={{ width: '100%', maxWidth: 340 }}>
            <select
              {...selectStyle}
              value={day}
              onChange={e => setDay(e.target.value === '' ? '' : Number(e.target.value))}
              aria-label={t('age.day')}
            >
              <option value="">{t('age.day')}</option>
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              {...selectStyle}
              value={month}
              onChange={e => handleMonthChange(Number(e.target.value))}
              aria-label={t('age.month')}
            >
              <option value="">{t('age.month')}</option>
              {monthNames.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
            </select>

            <select
              {...selectStyle}
              value={year}
              onChange={e => handleYearChange(Number(e.target.value))}
              aria-label={t('age.year')}
            >
              <option value="">{t('age.year')}</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {ageOutOfRange && (
            <p style={{ fontSize: 12, color: '#c0435a', textAlign: 'center', margin: 0 }}>{t('age.rangeError')}</p>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <button onClick={submit} disabled={!canSubmit}
            style={{ width: '100%', height: 54, border: 'none', borderRadius: 16, background: C.accent, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'default', boxShadow: '0 10px 24px rgba(156,94,108,.32)', opacity: canSubmit ? 1 : 0.5 }}>
            {t('age.cont')}
          </button>
        </div>
      </div>
    </div>
  );
}
