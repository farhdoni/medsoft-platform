import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authFetch } from '../../lib/api';
import { COLORS } from '../../lib/constants';

const today = new Date().toISOString().slice(0, 10);

type NutritionSummary = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  meals?: { name: string; calories: number; time?: string }[];
};

const GOALS = { calories: 1800, protein: 120, fat: 60, carbs: 250 };

const MACROS = [
  { key: 'protein' as const, label: 'Белки',    color: '#3d5a99', bg: '#e8eef8' },
  { key: 'fat'     as const, label: 'Жиры',     color: '#c8576b', bg: '#f5eaed' },
  { key: 'carbs'   as const, label: 'Углеводы', color: '#5e4a8c', bg: '#ede8f5' },
];

function MacroBar({ label, value, goal, color, bg }: {
  label: string; value: number; goal: number; color: string; bg: string;
}) {
  const pct = Math.min(1, value / goal);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary }}>{label}</Text>
        <Text style={{ fontSize: 13, color: COLORS.textMuted }}>{value}g / {goal}g</Text>
      </View>
      <View style={{ height: 8, backgroundColor: bg, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct * 100}%`, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

export default function NutritionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<NutritionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch<NutritionSummary>(`/nutrition/summary?date=${today}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const calPct = data ? Math.min(1, data.calories / GOALS.calories) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgApp }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgApp} />
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: COLORS.white,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.borderSoft,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textPrimary }}>Питание</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.accentRose} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          {/* Calories hero */}
          <View
            style={{
              backgroundColor: COLORS.bgSoftPink,
              borderRadius: 20,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.accentRose, marginBottom: 8 }}>
              КАЛОРИИ
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 }}>
              <Text style={{ fontSize: 40, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 44 }}>
                {data?.calories ?? 0}
              </Text>
              <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginLeft: 6, marginBottom: 4 }}>
                / {GOALS.calories} ккал
              </Text>
            </View>
            <View style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 5, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${calPct * 100}%`,
                  backgroundColor: COLORS.accentRose,
                  borderRadius: 5,
                }}
              />
            </View>
          </View>

          {/* Macros */}
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 }}>
              Макронутриенты
            </Text>
            {MACROS.map((m) => (
              <MacroBar
                key={m.key}
                label={m.label}
                value={data?.[m.key] ?? 0}
                goal={GOALS[m.key]}
                color={m.color}
                bg={m.bg}
              />
            ))}
          </View>

          {/* AI camera coming soon */}
          <View
            style={{
              backgroundColor: COLORS.bgSoftPurple,
              borderRadius: 20,
              padding: 20,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 28, marginBottom: 8 }}>📸</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 }}>
              AI-сканер блюд
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' }}>
              Скоро: фотографируйте еду и получайте данные о КБЖУ автоматически
            </Text>
            <View
              style={{
                marginTop: 12,
                backgroundColor: COLORS.accentPurpleDeep,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8,
                opacity: 0.5,
              }}
            >
              <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '600' }}>
                Скоро
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
