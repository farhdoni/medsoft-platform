import { cookies } from 'next/headers';
import { api } from '@/lib/api-client';

export interface MealRecord {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  emoji?: string | null;
  calories: string;
  proteinG?: string | null;
  fatG?: string | null;
  carbsG?: string | null;
  consumedAt: string;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export async function loadNutritionData() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';
  const today = new Date().toISOString().split('T')[0];

  const [summaryRes, waterRes] = await Promise.all([
    api.nutrition.summary(sessionCookie, today),
    api.healthScore.vitals(sessionCookie, `type=water_ml&from=${today}`),
  ]);

  type SummaryData = { totals: NutritionTotals; meals: MealRecord[]; count: number };
  type WaterVital = { value: { value: number; unit: string }; recordedAt: string };

  const summary: SummaryData | null =
    'data' in summaryRes ? (summaryRes.data as SummaryData) : null;
  const waterVitals: WaterVital[] =
    'data' in waterRes ? (waterRes.data as WaterVital[]) : [];

  const waterMl = waterVitals
    .filter((v) => v.recordedAt.startsWith(today))
    .reduce((sum, v) => sum + (v.value?.value ?? 0), 0);

  return {
    totals: summary?.totals ?? { calories: 0, protein: 0, fat: 0, carbs: 0 },
    meals: (summary?.meals ?? []).sort(
      (a, b) => new Date(a.consumedAt).getTime() - new Date(b.consumedAt).getTime()
    ),
    waterLiters: Math.round((waterMl / 1000) * 10) / 10,
    caloriesGoal: 1800,
    today,
  };
}
