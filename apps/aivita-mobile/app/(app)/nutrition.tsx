import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, isOk } from '../../src/lib/api';
import { Screen } from '../../src/components/Screen';

const today = new Date().toISOString().slice(0, 10);

const CALORIES_GOAL = 1800;
const MACROS = [
  { key: 'protein' as const, label: 'Белки',    goal: 120, bg: '#e8eef8', color: '#3d5a99' },
  { key: 'fat'     as const, label: 'Жиры',     goal: 60,  bg: '#f5eaed', color: '#c8576b' },
  { key: 'carbs'   as const, label: 'Углеводы', goal: 250, bg: '#ede8f5', color: '#5e4a8c' },
];

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус',
};

type NutritionSummary = {
  totals: { calories: number; protein: number; fat: number; carbs: number };
  meals: Array<{
    id: string;
    name: string;
    emoji?: string;
    mealType: string;
    calories: string | number;
    proteinG?: string | number;
    fatG?: string | number;
    carbsG?: string | number;
    consumedAt?: string;
  }>;
};

export default function NutritionScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['nutrition', today],
    queryFn: async () => {
      const res = await api.nutrition.summary(today);
      return isOk(res) ? (res.data as NutritionSummary) : null;
    },
  });

  const totals = data?.totals ?? { calories: 0, protein: 0, fat: 0, carbs: 0 };
  const meals = data?.meals ?? [];
  const calPct = Math.min(Math.round((totals.calories / CALORIES_GOAL) * 100), 100);
  const remaining = Math.max(CALORIES_GOAL - totals.calories, 0);

  return (
    <Screen title="Питание">
      {/* Hero */}
      <View
        style={{
          borderRadius: 24,
          backgroundColor: '#e5f2ee',
          padding: 20,
          marginBottom: 14,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#9090a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          КАЛОРИИ СЕГОДНЯ
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={{ fontSize: 44, fontWeight: '800', color: '#1a1a2e', lineHeight: 48 }}>
            {totals.calories}
          </Text>
          <Text style={{ fontSize: 15, color: '#4a4a6a' }}>/ {CALORIES_GOAL} ккал</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#4a4a6a', marginTop: 4, marginBottom: 12 }}>
          Б {Math.round(totals.protein)}г · Ж {Math.round(totals.fat)}г · У {Math.round(totals.carbs)}г
        </Text>
        {/* Progress bar */}
        <View style={{ height: 10, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.5)', overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${calPct}%`, borderRadius: 100, backgroundColor: '#9c5e6c' }} />
        </View>
        <Text style={{ fontSize: 11, color: '#9090a8', marginTop: 6 }}>
          {remaining > 0 ? `↓ ${remaining} ккал осталось` : '✓ Цель достигнута'}
        </Text>
      </View>

      {/* Macros */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {MACROS.map(({ key, label, goal, bg, color }) => {
          const value = Math.round(totals[key]);
          const pct = Math.min(Math.round((value / goal) * 100), 100);
          return (
            <View key={key} style={{ flex: 1, backgroundColor: bg, borderRadius: 16, padding: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color, marginBottom: 4 }}>{label}</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a2e' }}>{value}г</Text>
              <Text style={{ fontSize: 10, color: '#9090a8' }}>/ {goal}г</Text>
              <View style={{ height: 6, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.5)', marginTop: 8, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${pct}%`, borderRadius: 100, backgroundColor: color }} />
              </View>
            </View>
          );
        })}
      </View>

      {/* Meals */}
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9090a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Приёмы пищи
      </Text>

      {isLoading ? (
        <ActivityIndicator color="#9c5e6c" />
      ) : meals.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e8e4dc' }}>
          <Text style={{ fontSize: 36 }}>🍽️</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginTop: 10 }}>Ещё ничего не записано</Text>
          <Text style={{ fontSize: 12, color: '#9090a8', marginTop: 4 }}>Добавь первый приём пищи сегодня</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {meals.map((meal) => {
            const time = meal.consumedAt
              ? new Date(meal.consumedAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
              : '';
            return (
              <View
                key={meal.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#e8e4dc',
                }}
              >
                <Text style={{ fontSize: 28 }}>{meal.emoji ?? '🍽️'}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a2e', flex: 1 }}>{meal.name}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#c8576b' }}>
                      {Math.round(Number(meal.calories))} ккал
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#9090a8', marginTop: 2 }}>
                    {MEAL_LABELS[meal.mealType] ?? meal.mealType}
                    {time ? ` · ${time}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
