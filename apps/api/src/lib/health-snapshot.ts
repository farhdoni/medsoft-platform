/**
 * Onboarding Health Snapshot — computes a baseline Health Score from the data
 * collected during onboarding (age, BMI, lifestyle). This is the "hook" engine:
 * it must be transparent and deterministic so the score feels earned, not random.
 *
 * The richer, system-test-based score (apps/api/.../health-score.ts) refines this
 * later once the user takes body-system tests.
 */

export interface LifestyleInput {
  birthDate?: string | null;          // ISO date
  heightCm?: number | null;
  weightKg?: number | string | null;
  sleepHoursPerNight?: string | null; // '<6' | '6-7' | '7-8' | '>8'
  stressLevel?: string | null;        // 'low' | 'moderate'/'medium' | 'high' | '1'..'5'
  exerciseFrequency?: string | null;  // 'never' | 'rare' | 'sometimes' | 'often' | 'daily'
  nutritionType?: string | null;      // 'balanced' | 'vegetarian' | 'vegan' | 'fastfood'
  smokingStatus?: string | null;      // 'never' | 'former' | 'current'
  alcoholFrequency?: string | null;   // 'never' | 'rare' | 'moderate' | 'frequent'
}

export interface HealthSnapshot {
  totalScore: number;                 // 1..99
  realAge: number | null;
  healthAge: number | null;
  factors: { sleep: number; stress: number; activity: number; nutrition: number };
  lowestFactors: string[];            // factor keys, weakest first (max 2)
  bmi: number | null;
}

const FACTOR_WEIGHTS = { sleep: 0.28, stress: 0.24, activity: 0.26, nutrition: 0.22 } as const;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function scoreSleep(v?: string | null): number {
  switch (v) { case '<6': return 45; case '6-7': return 72; case '7-8': return 95; case '>8': return 82; default: return 65; }
}
function scoreStress(v?: string | null): number {
  if (!v) return 65;
  const num = Number(v);
  if (!Number.isNaN(num) && num >= 1 && num <= 5) return clamp(Math.round(105 - num * 13), 35, 95); // 1→92 ... 5→40
  switch (v.toLowerCase()) {
    case 'low': return 90; case 'moderate': case 'medium': return 65; case 'high': return 40; default: return 65;
  }
}
function scoreActivity(v?: string | null): number {
  switch (v) { case 'never': return 35; case 'rare': return 55; case 'sometimes': return 72; case 'often': return 88; case 'daily': return 96; default: return 60; }
}
function scoreNutrition(v?: string | null): number {
  switch (v) { case 'balanced': return 92; case 'vegetarian': return 85; case 'vegan': return 80; case 'fastfood': return 42; default: return 65; }
}

function ageFromBirthDate(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const years = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return years > 0 && years < 130 ? Math.floor(years) : null;
}

function computeBmi(heightCm?: number | null, weightKg?: number | string | null): number | null {
  const h = Number(heightCm); const w = Number(weightKg);
  if (!h || !w || h < 80 || h > 250) return null;
  const m = h / 100;
  return Math.round((w / (m * m)) * 10) / 10;
}

export function computeHealthSnapshot(input: LifestyleInput): HealthSnapshot {
  const factors = {
    sleep: scoreSleep(input.sleepHoursPerNight),
    stress: scoreStress(input.stressLevel),
    activity: scoreActivity(input.exerciseFrequency),
    nutrition: scoreNutrition(input.nutritionType),
  };

  // Weighted base
  let total =
    factors.sleep * FACTOR_WEIGHTS.sleep +
    factors.stress * FACTOR_WEIGHTS.stress +
    factors.activity * FACTOR_WEIGHTS.activity +
    factors.nutrition * FACTOR_WEIGHTS.nutrition;

  // Lifestyle modifiers
  if (input.smokingStatus === 'current') total -= 8;
  else if (input.smokingStatus === 'former') total -= 2;
  if (input.alcoholFrequency === 'frequent') total -= 6;
  else if (input.alcoholFrequency === 'moderate') total -= 2;

  // BMI modifier
  const bmi = computeBmi(input.heightCm, input.weightKg);
  if (bmi !== null) {
    if (bmi < 18.5 || bmi >= 30) total -= 6;
    else if (bmi >= 25) total -= 3;
  }

  const totalScore = clamp(Math.round(total), 1, 99);

  const realAge = ageFromBirthDate(input.birthDate);
  const offset = Math.round((totalScore - 70) / 4); // better score → younger health age
  const healthAge = realAge !== null ? clamp(realAge - offset, 1, 120) : null;

  const lowestFactors = (Object.entries(factors) as Array<[string, number]>)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .filter(([, v]) => v < 75)
    .map(([k]) => k);

  return { totalScore, realAge, healthAge, factors, lowestFactors, bmi };
}

export const FACTOR_LABELS_RU: Record<string, string> = {
  sleep: 'Сон', stress: 'Стресс', activity: 'Активность', nutrition: 'Питание',
};
