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

type FamilyMember = {
  id: string;
  name: string;
  relation?: string;
  avatarUrl?: string;
  healthScore?: number;
  lastActiveAt?: string;
};

function MemberCard({ member }: { member: FamilyMember }) {
  const initials = member.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const scoreColor =
    (member.healthScore ?? 0) >= 70
      ? COLORS.accentMintDeep
      : (member.healthScore ?? 0) >= 40
      ? COLORS.accentRose
      : COLORS.textMuted;

  return (
    <View
      style={{
        backgroundColor: COLORS.white,
        borderRadius: 18,
        padding: 18,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderSoft,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: COLORS.bgSoftPink,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 14,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.accentRose }}>
          {initials}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>
          {member.name}
        </Text>
        {member.relation && (
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
            {member.relation}
          </Text>
        )}
      </View>

      {member.healthScore !== undefined && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: scoreColor }}>
            {member.healthScore}
          </Text>
          <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 1 }}>score</Text>
        </View>
      )}
    </View>
  );
}

export default function FamilyScreen() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchMembers = useCallback(async () => {
    setError('');
    try {
      const data = await authFetch<FamilyMember[]>('/family/members');
      setMembers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) return;
      // Family may not exist yet
      if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
        setMembers([]);
      } else {
        setError('Failed to load family members');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers();
  }, [fetchMembers]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgApp }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgApp} />

      <View
        style={{
          paddingTop: 60,
          paddingHorizontal: 24,
          paddingBottom: 16,
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 }}>
          Family
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4 }}>
          Monitor your family's health together
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
            <View style={{ backgroundColor: '#fde8ec', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <Text style={{ color: '#9c3050' }}>{error}</Text>
            </View>
          ) : null}

          {members.length === 0 && !error ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>👨‍👩‍👧</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>
                No family members yet
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.textSecondary,
                  textAlign: 'center',
                  marginTop: 8,
                  lineHeight: 20,
                }}
              >
                Invite family members through the web app to see their health progress here
              </Text>
            </View>
          ) : (
            members.map((member) => <MemberCard key={member.id} member={member} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}
