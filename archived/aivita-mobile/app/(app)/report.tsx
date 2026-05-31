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
import { authFetch, ApiError } from '../../lib/api';
import { COLORS } from '../../lib/constants';

type ReportData = {
  period?: string;
  healthScore?: number;
  scoreChange?: number;
  habitsCompleted?: number;
  habitsTotal?: number;
  testsCompleted?: number;
  insights?: string[];
  recommendations?: string[];
};

function ScoreChangeChip({ change }: { change: number }) {
  const up = change >= 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: up ? '#d4e8d8' : '#fde8ec',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 2,
      }}
    >
      <Text style={{ fontSize: 12, color: up ? COLORS.accentMintDeep : '#9c3050', fontWeight: '700' }}>
        {up ? '↑' : '↓'} {Math.abs(change)} pts
      </Text>
    </View>
  );
}

function StatCard({
  emoji,
  label,
  value,
  sub,
  color,
}: {
  emoji: string;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: color,
        borderRadius: 16,
        padding: 16,
        minHeight: 100,
        justifyContent: 'space-between',
      }}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <View>
        <Text
          style={{
            fontSize: 24,
            fontWeight: '800',
            color: COLORS.textPrimary,
            letterSpacing: -0.5,
          }}
        >
          {value}
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{label}</Text>
        {sub && <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{sub}</Text>}
      </View>
    </View>
  );
}

export default function ReportScreen() {
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    setError('');
    try {
      const data = await authFetch<ReportData>('/report/weekly');
      setReport(data);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) return;
      setError('Failed to load report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReport();
  }, [fetchReport]);

  const habitsPercent =
    report?.habitsTotal && report.habitsTotal > 0
      ? Math.round(((report.habitsCompleted ?? 0) / report.habitsTotal) * 100)
      : 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgApp }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgApp} />

      {/* Header */}
      <View
        style={{
          paddingTop: 60,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: COLORS.white,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
            borderWidth: 1,
            borderColor: COLORS.borderSoft,
          }}
        >
          <Text style={{ fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary }}>
            Weekly Report
          </Text>
          {report?.period && (
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
              {report.period}
            </Text>
          )}
        </View>
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
            <View style={{ backgroundColor: '#fde8ec', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <Text style={{ color: '#9c3050' }}>{error}</Text>
            </View>
          ) : null}

          {/* Health score highlight */}
          <View
            style={{
              backgroundColor: COLORS.bgSoftPink,
              borderRadius: 24,
              padding: 24,
              marginBottom: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ fontSize: 13, color: COLORS.accentRose, fontWeight: '600' }}>
                HEALTH SCORE
              </Text>
              <Text
                style={{
                  fontSize: 48,
                  fontWeight: '800',
                  color: COLORS.textPrimary,
                  letterSpacing: -1,
                }}
              >
                {report?.healthScore ?? '--'}
              </Text>
              {report?.scoreChange !== undefined && (
                <ScoreChangeChip change={report.scoreChange} />
              )}
            </View>
            <Text style={{ fontSize: 56 }}>📊</Text>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <StatCard
              emoji="✅"
              label="Habits Done"
              value={`${habitsPercent}%`}
              sub={`${report?.habitsCompleted ?? 0}/${report?.habitsTotal ?? 0} total`}
              color={COLORS.bgSoftMint}
            />
            <StatCard
              emoji="📋"
              label="Tests"
              value={String(report?.testsCompleted ?? 0)}
              sub="completed this week"
              color={COLORS.bgSoftPurple}
            />
          </View>

          {/* Insights */}
          {(report?.insights?.length ?? 0) > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: COLORS.textPrimary,
                  marginBottom: 12,
                }}
              >
                Insights
              </Text>
              {report!.insights!.map((insight, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: COLORS.white,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    borderWidth: 1,
                    borderColor: COLORS.borderSoft,
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: 10, marginTop: 1 }}>💡</Text>
                  <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 }}>
                    {insight}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Recommendations */}
          {(report?.recommendations?.length ?? 0) > 0 && (
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: COLORS.textPrimary,
                  marginBottom: 12,
                }}
              >
                Recommendations
              </Text>
              {report!.recommendations!.map((rec, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: COLORS.bgSoftPurple,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: 10, marginTop: 1 }}>⭐</Text>
                  <Text
                    style={{ flex: 1, fontSize: 14, color: COLORS.accentPurpleDeep, lineHeight: 20 }}
                  >
                    {rec}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!report && !error && (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📊</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>
                No report yet
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 }}>
                Your weekly report will appear here after you've been active for a week
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
