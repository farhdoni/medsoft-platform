'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type LatestVitals = Record<string, { value: Record<string, unknown>; recordedAt: string } | null>;

type Alert = { icon: string; level: 'danger' | 'warn' | 'ok'; title: string; text: string };

// ─── Alert logic ──────────────────────────────────────────────────────────────

function getAlerts(latest: LatestVitals): Alert[] {
  const alerts: Alert[] = [];

  const hr = (latest['heart_rate']?.value as { value?: number })?.value;
  if (hr !== undefined) {
    if (hr > 100) alerts.push({ icon: '❤️', level: 'warn', title: 'Пульс повышен', text: `${hr} bpm — выше нормы (60–100 bpm). Отдохните и измерьте повторно.` });
    else if (hr < 50) alerts.push({ icon: '❤️', level: 'warn', title: 'Пульс занижен', text: `${hr} bpm — ниже нормы (60–100 bpm). Обратитесь к врачу.` });
    else alerts.push({ icon: '❤️', level: 'ok', title: 'Пульс в норме', text: `${hr} bpm — в пределах нормы (60–100 bpm).` });
  }

  const bp = latest['blood_pressure']?.value as { systolic?: number; diastolic?: number } | undefined;
  if (bp?.systolic !== undefined && bp?.diastolic !== undefined) {
    if (bp.systolic >= 140 || bp.diastolic >= 90)
      alerts.push({ icon: '🩺', level: 'danger', title: 'Давление высокое', text: `${bp.systolic}/${bp.diastolic} mmHg — гипертония. Обратитесь к врачу.` });
    else if (bp.systolic < 90 || bp.diastolic < 60)
      alerts.push({ icon: '🩺', level: 'warn', title: 'Давление низкое', text: `${bp.systolic}/${bp.diastolic} mmHg — гипотония. Пейте больше воды.` });
    else
      alerts.push({ icon: '🩺', level: 'ok', title: 'Давление в норме', text: `${bp.systolic}/${bp.diastolic} mmHg — нормальный уровень.` });
  }

  const sugar = (latest['blood_sugar']?.value as { value?: number })?.value;
  if (sugar !== undefined) {
    if (sugar > 126) alerts.push({ icon: '🩸', level: 'danger', title: 'Сахар повышен', text: `${sugar} мг/дл — вероятная гипергликемия. Проконсультируйтесь с врачом.` });
    else if (sugar < 70) alerts.push({ icon: '🩸', level: 'danger', title: 'Сахар занижен', text: `${sugar} мг/дл — гипогликемия. Съешьте что-нибудь сладкое.` });
    else alerts.push({ icon: '🩸', level: 'ok', title: 'Сахар в норме', text: `${sugar} мг/дл — в пределах нормы (70–126 мг/дл).` });
  }

  const temp = (latest['temperature']?.value as { value?: number })?.value;
  if (temp !== undefined) {
    if (temp >= 38) alerts.push({ icon: '🌡️', level: 'danger', title: 'Температура высокая', text: `${temp}°C — жар. Примите жаропонижающее и обратитесь к врачу.` });
    else if (temp >= 37.5) alerts.push({ icon: '🌡️', level: 'warn', title: 'Температура повышена', text: `${temp}°C — субфебрильная. Наблюдайте за динамикой.` });
    else if (temp < 36) alerts.push({ icon: '🌡️', level: 'warn', title: 'Температура понижена', text: `${temp}°C — ниже нормы. Согрейтесь.` });
    else alerts.push({ icon: '🌡️', level: 'ok', title: 'Температура в норме', text: `${temp}°C — нормальная температура тела.` });
  }

  const sleep = (latest['sleep_hours']?.value as { hours?: number })?.hours;
  if (sleep !== undefined) {
    if (sleep < 6) alerts.push({ icon: '😴', level: 'warn', title: 'Мало сна', text: `${sleep} ч — недосыпание. Рекомендуется 7–9 часов в сутки.` });
    else if (sleep > 10) alerts.push({ icon: '😴', level: 'warn', title: 'Много сна', text: `${sleep} ч — избыточный сон. Может указывать на усталость или болезнь.` });
    else alerts.push({ icon: '😴', level: 'ok', title: 'Сон в норме', text: `${sleep} ч — хороший сон. Отличная работа!` });
  }

  const spo2 = (latest['spo2']?.value as { value?: number })?.value;
  if (spo2 !== undefined) {
    if (spo2 < 94) alerts.push({ icon: '🫁', level: 'danger', title: 'SpO2 критически низкий', text: `${spo2}% — опасно низкий уровень кислорода. Срочно обратитесь к врачу.` });
    else if (spo2 < 96) alerts.push({ icon: '🫁', level: 'warn', title: 'SpO2 снижен', text: `${spo2}% — чуть ниже нормы (96–100%). Следите за дыханием.` });
    else alerts.push({ icon: '🫁', level: 'ok', title: 'SpO2 в норме', text: `${spo2}% — нормальный уровень кислорода.` });
  }

  const water = (latest['water_ml']?.value as { value?: number })?.value;
  if (water !== undefined) {
    if (water < 1500) alerts.push({ icon: '💧', level: 'warn', title: 'Мало воды', text: `${water} мл — пейте больше. Рекомендуется 2000–2500 мл в день.` });
    else alerts.push({ icon: '💧', level: 'ok', title: 'Водный баланс в норме', text: `${water} мл — хорошее потребление воды.` });
  }

  const steps = (latest['steps']?.value as { value?: number })?.value;
  if (steps !== undefined) {
    if (steps < 5000) alerts.push({ icon: '👟', level: 'warn', title: 'Мало шагов', text: `${steps.toLocaleString()} шагов — старайтесь ходить больше. Цель: 8000–10000 шагов.` });
    else if (steps >= 10000) alerts.push({ icon: '👟', level: 'ok', title: 'Отличная активность', text: `${steps.toLocaleString()} шагов — вы достигли дневной нормы!` });
    else alerts.push({ icon: '👟', level: 'ok', title: 'Хорошая активность', text: `${steps.toLocaleString()} шагов — хороший результат.` });
  }

  return alerts;
}

const LEVEL_STYLE: Record<Alert['level'], { bg: string; border: string; badge: string; badgeText: string }> = {
  danger: { bg: '#fff0f0', border: '#ffc5c5', badge: '#ff4444', badgeText: 'Внимание' },
  warn:   { bg: '#fffbec', border: '#ffe4a0', badge: '#e8a000', badgeText: 'Следите' },
  ok:     { bg: '#f0faf4', border: '#b8e8c8', badge: '#3aa86a', badgeText: 'Норма' },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  latest: LatestVitals;
  /** On home page show only warnings, link to vitals for full view */
  compact?: boolean;
  locale?: string;
}

export function AiMonitor({ latest, compact = false, locale = 'ru' }: Props) {
  const alerts = getAlerts(latest);
  const [expanded, setExpanded] = useState(false);

  const dangerCount = alerts.filter(a => a.level === 'danger').length;
  const warnCount   = alerts.filter(a => a.level === 'warn').length;
  const nonOk       = alerts.filter(a => a.level !== 'ok');

  // compact mode: show only non-ok alerts (max 3), hide if all ok
  if (compact && nonOk.length === 0) return null;
  if (alerts.length === 0) return null;

  const visible = compact
    ? nonOk.slice(0, 3)
    : expanded ? alerts : nonOk.slice(0, 3);

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[13px] font-bold" style={{ color: '#6a6580' }}>AI-МОНИТОР</h2>
        <div className="flex items-center gap-1.5">
          {dangerCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#ff4444' }}>
              {dangerCount} критично
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#e8a000' }}>
              {warnCount} внимание
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {visible.map((alert, i) => {
          const s = LEVEL_STYLE[alert.level];
          return (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-[14px] border"
              style={{ background: s.bg, borderColor: s.border }}
            >
              <span className="text-[18px] flex-shrink-0 mt-0.5">{alert.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-bold" style={{ color: '#2a2540' }}>{alert.title}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: s.badge }}>
                    {s.badgeText}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: '#6a6580' }}>{alert.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* compact: links to vitals and health analysis */}
      {compact && (
        <div className="mt-2 flex gap-2">
          <Link
            href={`/${locale}/vitals`}
            className="flex-1 flex items-center justify-center text-[12px] font-semibold py-2 rounded-[12px] transition-colors hover:bg-[#f4f3ef]"
            style={{ color: 'var(--accent-dark)' }}
          >
            Все показатели →
          </Link>
          <Link
            href={`/${locale}/health-analysis`}
            className="flex-1 flex items-center justify-center text-[12px] font-semibold py-2 rounded-[12px] transition-colors hover:bg-[#f4f3ef]"
            style={{ color: 'var(--accent-dark)' }}
          >
            AI-анализ →
          </Link>
        </div>
      )}

      {/* full mode: expand/collapse */}
      {!compact && alerts.length > visible.length && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 w-full text-[12px] font-semibold py-2 rounded-[12px] transition-colors hover:bg-[#f4f3ef]"
          style={{ color: '#9a96a8' }}
        >
          Показать все {alerts.length} показателей ↓
        </button>
      )}
      {!compact && expanded && alerts.some(a => a.level === 'ok') && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-1 w-full text-[12px] font-semibold py-2 rounded-[12px] transition-colors hover:bg-[#f4f3ef]"
          style={{ color: '#9a96a8' }}
        >
          Свернуть ↑
        </button>
      )}
    </section>
  );
}
