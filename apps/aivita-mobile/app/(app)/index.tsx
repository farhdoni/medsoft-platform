import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Heart, Footprints, Droplets, Moon, Bell, ChevronRight,
  AlertTriangle, Pill, Bot, type LucideIcon,
} from 'lucide-react-native';
import { api, isOk } from '../../src/lib/api';
import { useUser } from '../../src/lib/AuthContext';
import { Screen } from '../../src/components/Screen';

type HealthScore = {
  totalScore?: number;
  heartRate?: number;
  stepsCount?: number;
  waterMl?: number;
  sleepHours?: number;
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#2d7a5f' : score >= 50 ? '#9c5e6c' : '#c8576b';
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 100, height: 100 }}>
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: '#f5eaed',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 6,
          borderColor: color,
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '800', color }}>{score}</Text>
        <Text style={{ fontSize: 10, color: '#9090a8', fontWeight: '600' }}>Health</Text>
      </View>
    </View>
  );
}

function MetricCard({
  Icon, label, value, unit, bg, color,
}: {
  Icon: LucideIcon;
  label: string;
  value: string | number;
  unit: string;
  bg: string;
  color: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 16, padding: 12 }}>
      <Icon size={16} color={color} />
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a2e', marginTop: 6 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 10, color: '#9090a8' }}>{unit}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useUser();

  const { data: scoreData, isLoading } = useQuery({
    queryKey: ['health-score'],
    queryFn: async () => {
      const res = await api.healthScore.latest();
      return isOk(res) ? (res.data as HealthScore) : null;
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.notifications.list();
      return isOk(res) ? (res.data as Array<{ readAt: string | null }>) : [];
    },
  });

  const unread = (notifications ?? []).filter((n) => !n.readAt).length;
  const score = scoreData?.totalScore ?? 0;
  const firstName = user.name.split(' ')[0];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f7f4' }}>
      {/* TopBar */}
      <View style={{ paddingTop: 60, paddingBottom: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 13, color: '#9090a8', fontWeight: '600' }}>Добрый день,</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1a1a2e' }}>{firstName} 👋</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/notifications')}
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e8e4dc' }}
        >
          <Bell size={18} color="#9090a8" />
          {unread > 0 && (
            <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#c8576b' }} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View
          style={{
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20,
            backgroundColor: '#9c5e6c',
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: 24,
              padding: 20,
              position: 'absolute',
              inset: 0,
              backgroundColor: '#9c5e6c',
            }}
          />
          {/* Gradient bg */}
          <View style={{ position: 'absolute', inset: 0, borderRadius: 24, backgroundColor: '#9c5e6c', opacity: 1 }} />
          <View style={{ flex: 1, zIndex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              HEALTH SCORE
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 20 }}>
              {score >= 75 ? 'Отличный результат!' : score >= 50 ? 'Есть куда расти' : 'Обрати внимание на здоровье'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(app)/test')}
              style={{ marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>Пройти тест →</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <ActivityIndicator color="#ffffff" style={{ zIndex: 1 }} />
          ) : (
            <View style={{ zIndex: 1 }}>
              <ScoreRing score={score} />
            </View>
          )}
        </View>

        {/* Metrics grid */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <MetricCard Icon={Heart} label="Пульс" value={scoreData?.heartRate ?? '—'} unit="уд/мин" bg="#f5eaed" color="#c8576b" />
          <MetricCard Icon={Footprints} label="Шаги" value={scoreData?.stepsCount ?? '—'} unit="шагов" bg="#e5f2ee" color="#2d7a5f" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <MetricCard Icon={Droplets} label="Вода" value={scoreData?.waterMl ? Math.round(scoreData.waterMl / 1000 * 10) / 10 : '—'} unit="литра" bg="#e8eef8" color="#3d5a99" />
          <MetricCard Icon={Moon} label="Сон" value={scoreData?.sleepHours ?? '—'} unit="часов" bg="#ede8f5" color="#5e4a8c" />
        </View>

        {/* Quick actions */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#9090a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Быстрые действия
        </Text>

        {[
          { label: 'Привычки на сегодня', sub: 'Отметь выполненные', color: '#2d7a5f', bg: '#e5f2ee', href: '/(app)/habits', Icon: AlertTriangle },
          { label: 'Дневник питания', sub: 'Запиши приём пищи', color: '#3d5a99', bg: '#e8eef8', href: '/(app)/nutrition', Icon: Pill },
          { label: 'Отчёт для врача', sub: 'Скачать PDF', color: '#5e4a8c', bg: '#ede8f5', href: '/(app)/report', Icon: Bot },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.href as never)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: '#e8e4dc',
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
              <item.Icon size={18} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a2e' }}>{item.label}</Text>
              <Text style={{ fontSize: 11, color: '#9090a8', marginTop: 1 }}>{item.sub}</Text>
            </View>
            <ChevronRight size={16} color="#9090a8" />
          </TouchableOpacity>
        ))}

        {/* Chat CTA */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/chat')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: '#9c5e6c',
            borderRadius: 16,
            padding: 16,
            marginTop: 4,
          }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={20} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>AI-ассистент</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>Задай вопрос о здоровье</Text>
          </View>
          <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
