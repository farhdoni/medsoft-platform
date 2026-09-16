'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface DateOfBirthPickerProps {
  /** Current value as 'YYYY-MM-DD', or null/undefined if unset. Read once on mount —
   *  pass a `key` prop to reset the picker when the underlying record changes
   *  (e.g. switching which family member is being edited). */
  value?: string | null;
  /** Fires with a complete 'YYYY-MM-DD' once day+month+year are all chosen and the
   *  date isn't in the future. Fires with `null` when a set value is cleared
   *  (only reachable when `clearable`). Never fires for a partial selection. */
  onChange: (value: string | null) => void;
  disabled?: boolean;
  /** Shows a "clear" control once a complete date is set. Use for optional fields. */
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CURRENT_YEAR = new Date().getFullYear();
// Newest first (this year) down to 90 years ago, uniformly across every call site.
const YEARS = Array.from({ length: 91 }, (_, i) => CURRENT_YEAR - i);

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate(); // day 0 of next month = last day of `month`
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function parseValue(value?: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return { day: d as number | '', month: m as number | '', year: y as number | '' };
  }
  return { day: '' as const, month: '' as const, year: '' as const };
}

const SIZES: Record<NonNullable<DateOfBirthPickerProps['size']>, { select: string; gap: string }> = {
  sm: { select: 'text-[13px] rounded-[8px] px-2 py-1', gap: 'gap-1.5' },
  md: { select: 'text-[14px] rounded-[10px] px-2.5 py-2', gap: 'gap-2' },
  lg: { select: 'text-[15px] rounded-[12px] px-2 py-3', gap: 'gap-2' },
};

export function DateOfBirthPicker({
  value,
  onChange,
  disabled,
  clearable = false,
  size = 'md',
  className,
}: DateOfBirthPickerProps) {
  const t = useTranslations('app.common.dobPicker');
  // Static, translated month names — NOT Intl.DateTimeFormat(locale, {month:'long'}):
  // ICU month data for 'uz' is missing in browsers/runtimes with reduced ICU, which
  // silently renders stub names ("M01".."M12") instead of "Yanvar".."Dekabr".
  const monthNames = t.raw('months') as string[];

  const [day, setDay] = useState<number | ''>(() => parseValue(value).day);
  const [month, setMonth] = useState<number | ''>(() => parseValue(value).month);
  const [year, setYear] = useState<number | ''>(() => parseValue(value).year);
  const [futureError, setFutureError] = useState(false);

  const maxDay = year !== '' && month !== '' ? daysInMonth(year, month) : 31;
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

  function commit(nextDay: number | '', nextMonth: number | '', nextYear: number | '') {
    if (nextDay === '' || nextMonth === '' || nextYear === '') {
      setFutureError(false);
      return;
    }
    const iso = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
    if (iso > todayStr()) {
      setFutureError(true);
      return;
    }
    setFutureError(false);
    onChange(iso);
  }

  function handleDay(v: number | '') {
    setDay(v);
    commit(v, month, year);
  }
  function handleMonth(v: number | '') {
    const cap = day !== '' && v !== '' ? Math.min(day, daysInMonth(year || CURRENT_YEAR, v)) : day;
    setMonth(v);
    if (cap !== day) setDay(cap);
    commit(cap, v, year);
  }
  function handleYear(v: number | '') {
    const cap = day !== '' && v !== '' && month !== '' ? Math.min(day, daysInMonth(v, month)) : day;
    setYear(v);
    if (cap !== day) setDay(cap);
    commit(cap, month, v);
  }
  function handleClear() {
    setDay('');
    setMonth('');
    setYear('');
    setFutureError(false);
    onChange(null);
  }

  const sz = SIZES[size];
  const selectClass = `${sz.select} border outline-none bg-white w-full text-center disabled:opacity-50 disabled:cursor-not-allowed`;
  const selectStyle = { borderColor: '#e8e4dc', color: '#2a2540' };
  const hasValue = day !== '' || month !== '' || year !== '';

  return (
    <div className={className}>
      <div className={`grid grid-cols-3 ${sz.gap}`}>
        <select
          aria-label={t('day')}
          className={selectClass}
          style={selectStyle}
          disabled={disabled}
          value={day}
          onChange={e => handleDay(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">{t('day')}</option>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          aria-label={t('month')}
          className={selectClass}
          style={selectStyle}
          disabled={disabled}
          value={month}
          onChange={e => handleMonth(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">{t('month')}</option>
          {monthNames.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
        </select>

        <select
          aria-label={t('year')}
          className={selectClass}
          style={selectStyle}
          disabled={disabled}
          value={year}
          onChange={e => handleYear(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">{t('year')}</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {futureError && (
        <p className="text-[11px] mt-1" style={{ color: '#c0435a' }}>{t('future')}</p>
      )}

      {clearable && hasValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="text-[11px] mt-1 underline"
          style={{ color: '#9a96a8' }}
        >
          {t('clear')}
        </button>
      )}
    </div>
  );
}
