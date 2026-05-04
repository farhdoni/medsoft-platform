import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, TrendingUp } from 'lucide-react-native';
import { api, isOk } from '../../src/lib/api';
import { Screen } from '../../src/components/Screen';

type HealthScore = {
  totalScore?: number;
  cardioScore?: number;
  metabolicScore?: number;
  immuneScore?: number;
  mentalScore?: number;
  musculoskeletalScore?: number;
  createdAt?: string;
};

const SYSTEMS = [
  { key: 'cardioScore',          label: 'Сердечно-сосудистая', emoji: '❤️',  color: '#c8576b', bg: '#f5eaed' },
  { key: 'metabolicScore',       label: 'Метаболизм',          emoji: '⚡',  color: '#3d5a99', bg: '#e8eef8' },
  { key: 'immuneScore',          label: 'Иммунитет',           emoji: '🛡️',  color: '#2d7a5f', bg: '#e5f2ee' },
  { key: 'mentalScore',          label: 'Ментальное',          emoji: '🧠',  color: '#5e4a8c', bg: '#ede8f5' },
  { key: 'musculoskeletalScore', label: 'Опорно-двигательная', emoji: '💪',  color: '#5a7a3d', bg: '#edf2e8' },
] as const;

export default function TestScreen() {
  const router = useRouter();

  const { data: score, isLoading } = useQuery({
    queryKey: ['health-score'],
    queryFn: async () => {
      const res = await api.healthScore.latest();
      return isOk(res) ? (res.data as HealthScore) : null;
    },
  });

  const total = score?.totalScore ?? 0;
  const color = total >= 75 ? '#2d7a5f' : total >= 50 ? '#9c5e6c' : '#c8576b';

  return (
    <Screen title="Health Score">
      {/* Hero score */}
      <View style={{ borderRadius: 24, backgroundColor: '#9c5e6c', padding: 20, marginBottom: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          ОБЩИЙ SCORE
        </Text>
        {isLoading ? (
          <ActivityIndicator color="#ffffff" size="large" />
        ) : (
          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#ffffff', marginBottom: 12 }}>
            <Text style={{ fontSize: 42, fontWeight: '800', color: '#ffffff' }}>{total}</Text>
          </View>
        )}
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', maxWidth: 240 }}>
          {total >= 75 ? 'Отличное здоровье! Так держать 💪'
            : total >= 50 ? 'Хороший результат, есть куда расти'
            : 'Обрати внимание на своё здоровье'}
        </Text>
      </View>

      {/* Systems */}
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9090a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        По системам
      </Text>

      <View style={{ gap: 10, marginBottom: 20 }}>
        {SYSTEMS.map(({ key, label, emoji, color, bg }) => {
          const val = score?.[key] ?? 0;
          const pct = Math.min(val, 100);
          return (
            <View key={key} style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e8e4dc' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{emoji}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#1a1a2e' }}>{label}</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color }}>{val}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 100, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${pct}%`, borderRadius: 100, backgroundColor: color }} />
              </View>
            </View>
          );
        })}
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={() => router.push('/(app)/chat')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: '#e8eef8',
          borderRadius: 16,
          padding: 16,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={18} color="#3d5a99" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a1a2e' }}>Как улучшить результат?</Text>
          <Text style={{ fontSize: 11, color: '#9090a8', marginTop: 1 }}>Спроси AI-ассистента</Text>
        </View>
        <ChevronRight size={16} color="#9090a8" />
      </TouchableOpacity>
    </Screen>
  );
}
