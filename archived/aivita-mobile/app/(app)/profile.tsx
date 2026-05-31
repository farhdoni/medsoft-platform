import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { COLORS } from '../../lib/constants';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderSoft,
      }}
    >
      <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function confirmSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgApp }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgApp} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View
          style={{
            paddingTop: 60,
            paddingHorizontal: 24,
            paddingBottom: 24,
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
          <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary }}>
            My Profile
          </Text>
        </View>

        {/* Avatar section */}
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: COLORS.bgSoftPink,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
              shadowColor: COLORS.accentRose,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 36, fontWeight: '700', color: COLORS.accentRose }}>
              {initials}
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.textPrimary }}>
            {user?.name ?? 'User'}
          </Text>
          {user?.nickname && (
            <Text style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>
              @{user.nickname}
            </Text>
          )}
        </View>

        {/* Info card */}
        <View
          style={{
            marginHorizontal: 24,
            backgroundColor: COLORS.white,
            borderRadius: 20,
            paddingHorizontal: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.borderSoft,
          }}
        >
          <InfoRow label="Email" value={user?.email ?? '-'} />
          {user?.nickname && <InfoRow label="Nickname" value={`@${user.nickname}`} />}
          <InfoRow
            label="Onboarding"
            value={user?.onboardingCompleted ? 'Completed' : 'Pending'}
          />
          {user?.locale && <InfoRow label="Language" value={user.locale} />}
        </View>

        {/* Actions */}
        <View style={{ paddingHorizontal: 24, gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/(app)/settings')}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.borderSoft,
            }}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 20, marginRight: 14 }}>⚙️</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, flex: 1 }}>
              Settings
            </Text>
            <Text style={{ fontSize: 16, color: COLORS.textMuted }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={confirmSignOut}
            disabled={signingOut}
            style={{
              backgroundColor: '#fde8ec',
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#f5b8c4',
            }}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 20, marginRight: 14 }}>🚪</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#9c3050', flex: 1 }}>
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
