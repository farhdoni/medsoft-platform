import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Circle } from 'lucide-react-native';
import { api, isOk } from '../../src/lib/api';
import { Screen } from '../../src/components/Screen';

type Habit = {
  id: string;
  name: string;
  emoji?: string;
  frequency: string;
  targetCount: number;
  category?: string;
};

type HabitLog = { habitId: string; date: string };

const today = new Date().toISOString().slice(0, 10);

const FREQ_LABELS: Record<string, string> = {
  daily: 'Ежедневно', weekly: 'Еженедельно', weekdays: 'По будням',
};

export default function HabitsScreen() {
  const queryClient = useQueryClient();

  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const res = await api.habits.list();
      return isOk(res) ? (res.data as Habit[]) : [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['habits-today'],
    queryFn: async () => {
      const res = await api.habits.todayLogs();
      return isOk(res) ? (res.data as HabitLog[]) : [];
    },
  });

  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(new Set());

  const logMutation = useMutation({
    mutationFn: (habitId: string) => api.habits.log(habitId, today),
    onSuccess: (_, habitId) => {
      setOptimisticDone((prev) => new Set([...prev, habitId]));
      queryClient.invalidateQueries({ queryKey: ['habits-today'] });
    },
  });

  const doneSet = new Set([...logs.map((l) => l.habitId), ...optimisticDone]);
  const activeHabits = habits.filter((h) => h.frequency !== 'inactive');
  const doneCount = activeHabits.filter((h) => doneSet.has(h.id)).length;
  const pct = activeHabits.length ? Math.round((doneCount / activeHabits.length) * 100) : 0;

  return (
    <Screen title="Привычки">
      {/* Hero ring */}
      <View
        style={{
          borderRadius: 24,
          backgroundColor: '#9c5e6c',
          padding: 20,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Ring */}
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: pct === 100 ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#ffffff' }}>{pct}%</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            ПРОГРЕСС
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff' }}>
            {doneCount} / {activeHabits.length} привычек
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            {pct === 100 ? '🎉 Все выполнено!' : 'на сегодня'}
          </Text>
        </View>
      </View>

      {habitsLoading ? (
        <ActivityIndicator color="#9c5e6c" style={{ marginTop: 40 }} />
      ) : activeHabits.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ fontSize: 40 }}>✨</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginTop: 12 }}>Нет активных привычек</Text>
          <Text style={{ fontSize: 13, color: '#9090a8', marginTop: 4 }}>Добавь привычки через веб-версию</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {activeHabits.map((habit) => {
            const done = doneSet.has(habit.id);
            return (
              <TouchableOpacity
                key={habit.id}
                onPress={() => !done && logMutation.mutate(habit.id)}
                disabled={done}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: done ? '#e5f2ee' : '#e8e4dc',
                  opacity: done ? 0.85 : 1,
                }}
              >
                <Text style={{ fontSize: 28 }}>{habit.emoji ?? '✅'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: done ? '#9090a8' : '#1a1a2e', textDecorationLine: done ? 'line-through' : 'none' }}>
                    {habit.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9090a8', marginTop: 2 }}>
                    {FREQ_LABELS[habit.frequency] ?? habit.frequency}
                  </Text>
                </View>
                {done ? (
                  <CheckCircle size={24} color="#2d7a5f" />
                ) : (
                  <Circle size={24} color="#e8e4dc" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
