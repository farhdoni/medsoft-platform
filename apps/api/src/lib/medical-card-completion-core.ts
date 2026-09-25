// Pure part of lib/medical-card-completion.ts — no DB import, so it can be
// unit-tested directly.
//
// Заполненность медкарты: 14 вопросов, засчитывается только реально
// отвеченный. Для аллергий и хронических болезней ответ — это либо хотя бы
// одна запись, либо явное «нет» (health_profiles.*_none = true). Пустой
// список без «нет» — «не указано», не засчитывается.

export interface CompletionInput {
  name?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  phone?: string | null;
  city?: string | null;
  heightCm?: number | null;
  weightKg?: string | number | null;
  bloodType?: string | null;
  smokingStatus?: string | null;
  exerciseFrequency?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  allergiesCount: number;
  allergiesNone?: boolean | null;
  chronicCount: number;
  chronicNone?: boolean | null;
}

export interface Completion {
  percent: number;
  filled: number;
  total: number;
}

function answered(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
}

export function medicalCardCompletion(i: CompletionInput): Completion {
  const checks = [
    answered(i.name),
    answered(i.birthDate),
    answered(i.gender),
    answered(i.phone),
    answered(i.city),
    answered(i.heightCm),
    answered(i.weightKg),
    answered(i.bloodType),
    i.allergiesCount > 0 || i.allergiesNone === true,
    i.chronicCount > 0 || i.chronicNone === true,
    answered(i.smokingStatus),
    answered(i.exerciseFrequency),
    answered(i.emergencyContactName),
    answered(i.emergencyContactPhone),
  ];
  const filled = checks.filter(Boolean).length;
  return { percent: Math.round((filled / checks.length) * 100), filled, total: checks.length };
}
