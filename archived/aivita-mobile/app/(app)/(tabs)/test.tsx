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
import { authFetch, ApiError } from '../../../lib/api';
import { COLORS } from '../../../lib/constants';

type Test = {
  id: string;
  title: string;
  description?: string;
  emoji?: string;
  category?: string;
  durationMinutes?: number;
  completedAt?: string;
};

function TestCard({ test, onPress }: { test: Test; onPress: () => void }) {
  const isCompleted = !!test.completedAt;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: isCompleted ? COLORS.bgSoftMint : COLORS.white,
        borderRadius: 18,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: isCompleted ? '#b0d8bc' : COLORS.borderSoft,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isCompleted ? '#d4e8d8' : COLORS.bgSoftPurple,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 14,
          }}
        >
          <Text style={{ fontSize: 20 }}>{test.emoji ?? '📋'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: COLORS.textPrimary,
                flex: 1,
                marginRight: 8,
              }}
            >
              {test.title}
            </Text>
            {isCompleted && (
              <View
                style={{
                  backgroundColor: '#548068',
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>Done</Text>
              </View>
            )}
          </View>
          {test.description ? (
            <Text
              style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 }}
              numberOfLines={2}
            >
              {test.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            {test.category && (
              <View
                style={{
                  backgroundColor: COLORS.bgSoftPurple,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 11, color: COLORS.accentPurpleDeep, fontWeight: '500' }}>
                  {test.category}
                </Text>
              </View>
            )}
            {test.durationMinutes && (
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                ⏱ {test.durationMinutes} min
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TestScreen() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchTests = useCallback(async () => {
    setError('');
    try {
      const data = await authFetch<Test[]>('/tests');
      setTests(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) return;
      setError('Failed to load tests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTests();
  }, [fetchTests]);

  const pending = tests.filter((t) => !t.completedAt);
  const completed = tests.filter((t) => !!t.completedAt);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgApp }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgApp} />
      <View
        style={{
          paddingTop: 60,
          paddingHorizontal: 24,
          paddingBottom: 16,
          backgroundColor: COLORS.bgApp,
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 }}>
          Health Tests
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4 }}>
          Track your wellbeing with guided tests
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.accentRose} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accentRose} />
          }
        >
          {error ? (
            <View
              style={{
                backgroundColor: '#fde8ec',
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#9c3050' }}>{error}</Text>
            </View>
          ) : null}

          {pending.length > 0 && (
            <>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: COLORS.textMuted,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                  marginTop: 8,
                }}
              >
                Available ({pending.length})
              </Text>
              {pending.map((t) => (
                <TestCard key={t.id} test={t} onPress={() => {}} />
              ))}
            </>
          )}

          {completed.length > 0 && (
            <>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: COLORS.textMuted,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                  marginTop: 16,
                }}
              >
                Completed ({completed.length})
              </Text>
              {completed.map((t) => (
                <TestCard key={t.id} test={t} onPress={() => {}} />
              ))}
            </>
          )}

          {tests.length === 0 && !error && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>
                No tests available
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 }}>
                Check back soon for new health assessments
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
