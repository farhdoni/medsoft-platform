import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { authFetch, ApiError } from '../../../lib/api';
import { COLORS } from '../../../lib/constants';

type Habit = {
  id: string;
  title: string;
  emoji?: string;
  description?: string;
  frequency?: string;
  completedToday: boolean;
  streak?: number;
  totalDays?: number;
};

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function WeekRow() {
  const today = new Date().getDay();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
      {DAYS.map((d, i) => (
        <View
          key={d}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: i === today ? COLORS.accentRose : COLORS.bgApp,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: i === today ? '700' : '400',
              color: i === today ? COLORS.white : COLORS.textSecondary,
            }}
          >
            {d}
          </Text>
        </View>
      ))}
    </View>
  );
}

function HabitRow({
  habit,
  onToggle,
}: {
  habit: Habit;
  onToggle: (id: string) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: COLORS.white,
        borderRadius: 18,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: habit.completedToday ? '#b0d8bc' : COLORS.borderSoft,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <TouchableOpacity
        onPress={() => onToggle(habit.id)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: habit.completedToday ? COLORS.accentMintDeep : COLORS.borderSoft,
          backgroundColor: habit.completedToday ? COLORS.accentMintDeep : 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}
      >
        {habit.completedToday && (
          <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '700' }}>✓</Text>
        )}
      </TouchableOpacity>

      <Text style={{ fontSize: 20, marginRight: 10 }}>{habit.emoji ?? '⭐'}</Text>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: COLORS.textPrimary,
            textDecorationLine: habit.completedToday ? 'line-through' : 'none',
            opacity: habit.completedToday ? 0.6 : 1,
          }}
        >
          {habit.title}
        </Text>
        {habit.description ? (
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }} numberOfLines={1}>
            {habit.description}
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        {(habit.streak ?? 0) > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 12 }}>🔥</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.accentRose }}>
              {habit.streak}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchHabits = useCallback(async () => {
    setError('');
    try {
      const data = await authFetch<Habit[]>('/habits');
      setHabits(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) return;
      setError('Failed to load habits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHabits();
  }, [fetchHabits]);

  const toggleHabit = useCallback(
    async (id: string) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;
      const newValue = !habit.completedToday;
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, completedToday: newValue } : h))
      );
      try {
        await authFetch(`/habits/${id}/log`, {
          method: newValue ? 'POST' : 'DELETE',
        });
      } catch {
        // revert on error
        setHabits((prev) =>
          prev.map((h) => (h.id === id ? { ...h, completedToday: !newValue } : h))
        );
      }
    },
    [habits]
  );

  const completedCount = habits.filter((h) => h.completedToday).length;
  const progress = habits.length > 0 ? completedCount / habits.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgApp }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgApp} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accentRose} />
        }
      >
        <View style={{ paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 }}>
            My Habits
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4 }}>
            Build consistency, one day at a time
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Progress card */}
          <View
            style={{
              backgroundColor: COLORS.bgSoftPurple,
              borderRadius: 20,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <WeekRow />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary }}>
                Today's progress
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.accentPurpleDeep }}>
                {completedCount}/{habits.length}
              </Text>
            </View>
            <View
              style={{
                height: 8,
                backgroundColor: '#d0c8e8',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: COLORS.accentPurpleDeep,
                  borderRadius: 4,
                }}
              />
            </View>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator color={COLORS.accentRose} size="large" />
            </View>
          ) : error ? (
            <View style={{ backgroundColor: '#fde8ec', borderRadius: 12, padding: 14 }}>
              <Text style={{ color: '#9c3050' }}>{error}</Text>
            </View>
          ) : habits.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🌱</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>
                No habits yet
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 }}>
                Add habits in the web app to track them here
              </Text>
            </View>
          ) : (
            <>
              {habits.map((habit) => (
                <HabitRow key={habit.id} habit={habit} onToggle={toggleHabit} />
              ))}
              <View style={{ height: 40 }} />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
