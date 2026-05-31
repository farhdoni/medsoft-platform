import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth';
import { authFetch, ApiError } from '../../../lib/api';
import { COLORS } from '../../../lib/constants';
import HealthRing from '../../../components/ui/HealthRing';

type HealthScore = {
  score: number;
  label?: string;
  components?: Record<string, number>;
};

type Habit = {
  id: string;
  title: string;
  emoji?: string;
  completedToday: boolean;
  streak?: number;
};

function GreetingHeader({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 }}>
      <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>
        {greeting},
      </Text>
      <Text
        style={{
          fontSize: 26,
          fontWeight: '700',
          color: COLORS.textPrimary,
          letterSpacing: -0.3,
        }}
      >
        {name} 👋
      </Text>
    </View>
  );
}

function HabitCard({ habit, onToggle }: { habit: Habit; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      style={{
        backgroundColor: habit.completedToday ? COLORS.bgSoftMint : COLORS.white,
        borderRadius: 16,
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
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: habit.completedToday ? '#548068' : COLORS.bgApp,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 16 }}>{habit.completedToday ? '✓' : (habit.emoji ?? '⭐')}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: COLORS.textPrimary,
            textDecorationLine: habit.completedToday ? 'line-through' : 'none',
            opacity: habit.completedToday ? 0.7 : 1,
          }}
        >
          {habit.title}
        </Text>
        {(habit.streak ?? 0) > 0 && (
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
            🔥 {habit.streak} day streak
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loadingScore, setLoadingScore] = useState(true);
  const [loadingHabits, setLoadingHabits] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setError('');
    try {
      const [scoreData, habitsData] = await Promise.allSettled([
        authFetch<HealthScore>('/health-score'),
        authFetch<Habit[]>('/habits'),
      ]);
      if (scoreData.status === 'fulfilled') setHealthScore(scoreData.value);
      if (habitsData.status === 'fulfilled') {
        setHabits(Array.isArray(habitsData.value) ? habitsData.value : []);
      }
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) return;
      setError('Failed to load data');
    } finally {
      setLoadingScore(false);
      setLoadingHabits(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const todayHabits = habits.slice(0, 5);
  const completedCount = todayHabits.filter((h) => h.completedToday).length;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgApp }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgApp} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accentRose}
          />
        }
      >
        <GreetingHeader name={user?.name ?? 'Friend'} />

        {/* Health score card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: COLORS.bgSoftPink,
              borderRadius: 24,
              padding: 24,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {loadingScore ? (
              <ActivityIndicator color={COLORS.accentRose} style={{ marginRight: 20 }} />
            ) : (
              <HealthRing score={healthScore?.score ?? 0} size={90} strokeWidth={9} />
            )}
            <View style={{ marginLeft: 20, flex: 1 }}>
              <Text style={{ fontSize: 13, color: COLORS.accentRose, fontWeight: '600', marginBottom: 4 }}>
                HEALTH SCORE
              </Text>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '800',
                  color: COLORS.textPrimary,
                  letterSpacing: -1,
                }}
              >
                {healthScore?.score ?? '--'}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                {healthScore?.label ?? 'Tap to see details'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text
            style={{ fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 }}
          >
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { emoji: '💬', label: 'Chat with AI', color: COLORS.bgSoftPink, route: '/(app)/chat' },
              { emoji: '📋', label: 'Take a test', color: COLORS.bgSoftPurple, route: '/(app)/(tabs)/test' },
              { emoji: '📊', label: 'Report', color: COLORS.bgSoftMint, route: '/(app)/report' },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  backgroundColor: action.color,
                  borderRadius: 16,
                  padding: 14,
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 22 }}>{action.emoji}</Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: COLORS.textPrimary,
                    textAlign: 'center',
                  }}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Habits today */}
        <View style={{ paddingHorizontal: 24, marginBottom: 40 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textPrimary }}>
              Today's Habits
            </Text>
            {todayHabits.length > 0 && (
              <Text style={{ fontSize: 13, color: COLORS.accentRose, fontWeight: '600' }}>
                {completedCount}/{todayHabits.length} done
              </Text>
            )}
          </View>

          {loadingHabits ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator color={COLORS.accentRose} />
            </View>
          ) : todayHabits.length === 0 ? (
            <View
              style={{
                backgroundColor: COLORS.white,
                borderRadius: 16,
                padding: 24,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🌱</Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' }}>
                No habits yet. Start building healthy routines!
              </Text>
            </View>
          ) : (
            todayHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={() => {
                  setHabits((prev) =>
                    prev.map((h) =>
                      h.id === habit.id ? { ...h, completedToday: !h.completedToday } : h
                    )
                  );
                }}
              />
            ))
          )}

          {error ? (
            <Text style={{ color: COLORS.accentRose, textAlign: 'center', marginTop: 8 }}>
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
