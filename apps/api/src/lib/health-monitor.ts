/**
 * AI Health Monitor — analyzes health changes and returns recommendations.
 *
 * Two-tier approach:
 *  1. Fast threshold checks (no API calls) for numeric vitals
 *  2. Rule-based analysis for text fields (allergies, chronic conditions)
 */

export interface HealthAnalysis {
  level: 'critical' | 'important' | 'info' | 'none';
  message: string;
  recommendation: string;
  specialization: string | null;
}

// ─── Numeric thresholds ────────────────────────────────────────────────────────

const CRITICAL: Record<string, { min?: number; max?: number; spec: string; label: string }> = {
  glucose:     { max: 11.0, min: 3.5,  spec: 'Эндокринолог',  label: 'Глюкоза' },
  blood_sugar: { max: 11.0, min: 3.5,  spec: 'Эндокринолог',  label: 'Сахар крови' },
  systolic:    { max: 180,  min: 80,   spec: 'Кардиолог',     label: 'Давление (систолическое)' },
  diastolic:   { max: 110,  min: 50,   spec: 'Кардиолог',     label: 'Давление (диастолическое)' },
  heart_rate:  { max: 140,  min: 40,   spec: 'Кардиолог',     label: 'Пульс' },
  heartRate:   { max: 140,  min: 40,   spec: 'Кардиолог',     label: 'Пульс' },
  spo2:        {            min: 92,   spec: 'Пульмонолог',   label: 'Сатурация' },
  temperature: { max: 39.5, min: 35.0, spec: 'Терапевт',      label: 'Температура' },
};

const IMPORTANT: Record<string, { min?: number; max?: number; spec: string; label: string }> = {
  glucose:     { max: 6.1, min: 4.0, spec: 'Эндокринолог',  label: 'Глюкоза' },
  blood_sugar: { max: 6.1, min: 4.0, spec: 'Эндокринолог',  label: 'Сахар крови' },
  systolic:    { max: 140, min: 90,  spec: 'Кардиолог',     label: 'Давление' },
  diastolic:   { max: 90,  min: 60,  spec: 'Кардиолог',     label: 'Давление' },
  bmi:         { max: 30,            spec: 'Диетолог',       label: 'ИМТ' },
  weight:      { max: 150,           spec: 'Диетолог',       label: 'Вес' },
};

// ─── Text-field rules ─────────────────────────────────────────────────────────

interface TextRule {
  keywords: string[];
  level: 'critical' | 'important' | 'info';
  message: string;
  recommendation: string;
  specialization: string | null;
}

const CHRONIC_RULES: TextRule[] = [
  {
    keywords: ['ибс', 'инфаркт', 'стенокардия', 'сердечная недостаточность'],
    level: 'critical',
    message: '⚠️ Выявлено серьёзное кардиологическое заболевание.',
    recommendation: 'Обратитесь к Кардиологу для контроля. Избегайте чрезмерных нагрузок.',
    specialization: 'Кардиолог',
  },
  {
    keywords: ['диабет', 'сахарный диабет', 'diabetes'],
    level: 'important',
    message: '💡 Обнаружен сахарный диабет.',
    recommendation: 'Регулярно контролируйте уровень сахара. Запишитесь к Эндокринологу.',
    specialization: 'Эндокринолог',
  },
  {
    keywords: ['астма', 'бронхит', 'хобл', 'пневмония'],
    level: 'important',
    message: '💡 Выявлено заболевание дыхательной системы.',
    recommendation: 'Контролируйте показатели SpO2. Проконсультируйтесь с Пульмонологом.',
    specialization: 'Пульмонолог',
  },
  {
    keywords: ['гипертония', 'гипертензия', 'высокое давление'],
    level: 'important',
    message: '💡 Выявлена артериальная гипертония.',
    recommendation: 'Регулярно измеряйте давление и наблюдайтесь у Кардиолога.',
    specialization: 'Кардиолог',
  },
  {
    keywords: ['ожирение', 'лишний вес', 'метаболический синдром'],
    level: 'important',
    message: '💡 Выявлена проблема с весом.',
    recommendation: 'Рекомендуется консультация Диетолога и регулярные физические нагрузки.',
    specialization: 'Диетолог',
  },
];

const ALLERGY_RULES: TextRule[] = [
  {
    keywords: ['пенициллин', 'антибиотик', 'амоксициллин', 'ампициллин'],
    level: 'important',
    message: '💊 Аллергия на антибиотики зафиксирована.',
    recommendation: 'Сообщайте об этой аллергии каждому врачу и в аптеке. Носите с собой информацию.',
    specialization: 'Аллерголог',
  },
  {
    keywords: ['аспирин', 'нпвс', 'ибупрофен', 'диклофенак'],
    level: 'important',
    message: '💊 Аллергия на НПВС/Аспирин зафиксирована.',
    recommendation: 'Исключите нестероидные противовоспалительные препараты. Проконсультируйтесь с Аллергологом.',
    specialization: 'Аллерголог',
  },
  {
    keywords: ['анафилаксия', 'анафилактический шок'],
    level: 'critical',
    message: '⚠️ Риск анафилаксии! Тяжёлая аллергическая реакция в анамнезе.',
    recommendation: 'Всегда носите с собой адреналин (эпинефрин). Запишитесь к Аллергологу.',
    specialization: 'Аллерголог',
  },
];

// ─── Main function ─────────────────────────────────────────────────────────────

export function analyzeHealthChange(
  field: string,
  value: unknown,
): HealthAnalysis {
  const NONE: HealthAnalysis = { level: 'none', message: '', recommendation: '', specialization: null };

  if (!value) return NONE;

  // ── 1. Numeric threshold check ──
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (!isNaN(numValue)) {
    const crit = CRITICAL[field];
    if (crit) {
      const tooHigh = crit.max !== undefined && numValue > crit.max;
      const tooLow  = crit.min !== undefined && numValue < crit.min;
      if (tooHigh || tooLow) {
        const dir = tooHigh ? 'повышен(а)' : 'понижен(а)';
        return {
          level: 'critical',
          message: `⚠️ ${crit.label} ${dir}: ${numValue}. Требуется срочная консультация.`,
          recommendation: `Обратитесь к ${crit.spec}у. Если самочувствие ухудшается — вызовите скорую (103).`,
          specialization: crit.spec,
        };
      }
    }

    const imp = IMPORTANT[field];
    if (imp) {
      const tooHigh = imp.max !== undefined && numValue > imp.max;
      const tooLow  = imp.min !== undefined && numValue < imp.min;
      if (tooHigh || tooLow) {
        return {
          level: 'important',
          message: `💡 ${imp.label} выходит за пределы нормы: ${numValue}.`,
          recommendation: `Рекомендуем проконсультироваться с ${imp.spec}ом.`,
          specialization: imp.spec,
        };
      }
    }
    return NONE;
  }

  // ── 2. Text field rule check ──
  const text = String(value).toLowerCase();

  if (field === 'chronicConditions' || field === 'chronic' || field === 'name') {
    for (const rule of CHRONIC_RULES) {
      if (rule.keywords.some((kw) => text.includes(kw))) {
        return { level: rule.level, message: rule.message, recommendation: rule.recommendation, specialization: rule.specialization };
      }
    }
  }

  if (field === 'allergies' || field === 'allergen') {
    for (const rule of ALLERGY_RULES) {
      if (rule.keywords.some((kw) => text.includes(kw))) {
        return { level: rule.level, message: rule.message, recommendation: rule.recommendation, specialization: rule.specialization };
      }
    }
  }

  if (field === 'smokingStatus') {
    const isSmokingBad = ['да', 'курю', 'бывший курильщик', 'иногда', 'электронная сигарета'].some((kw) => text.includes(kw));
    if (isSmokingBad) {
      return {
        level: 'important',
        message: '🚬 Курение значительно увеличивает риск заболеваний сердца и лёгких.',
        recommendation: 'Рекомендуем бросить курить. Обратитесь к Терапевту за помощью.',
        specialization: 'Терапевт',
      };
    }
  }

  return NONE;
}

// ─── Vital field mapping ───────────────────────────────────────────────────────

export const VITAL_FIELD_MAP: Record<string, string> = {
  blood_sugar:  'blood_sugar',
  heart_rate:   'heart_rate',
  spo2:         'spo2',
  temperature:  'temperature',
  weight:       'weight',
};

/** Extract numeric value from vital JSONB value field */
export function extractVitalValue(type: string, value: Record<string, unknown>): unknown {
  if (typeof value.value === 'number') return value.value;
  if (type === 'blood_pressure') {
    // check systolic and diastolic separately
    return null; // handled separately in the route
  }
  return null;
}
