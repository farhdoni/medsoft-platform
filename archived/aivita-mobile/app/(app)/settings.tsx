import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../lib/constants';

type SettingRowProps = {
  label: string;
  description?: string;
  emoji: string;
  type: 'toggle' | 'link';
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
};

function SettingRow({ label, description, emoji, type, value, onToggle, onPress }: SettingRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={type === 'toggle'}
      activeOpacity={type === 'link' ? 0.7 : 1}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderSoft,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: COLORS.bgApp,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 14,
        }}
      >
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.textPrimary }}>{label}</Text>
        {description && (
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{description}</Text>
        )}
      </View>
      {type === 'toggle' && onToggle ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: COLORS.borderSoft, true: COLORS.accentRose }}
          thumbColor={COLORS.white}
        />
      ) : (
        <Text style={{ fontSize: 16, color: COLORS.textMuted }}>›</Text>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [healthAlerts, setHealthAlerts] = useState(false);

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
          <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary }}>Settings</Text>
        </View>

        {/* Notifications section */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: COLORS.textMuted,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Notifications
          </Text>
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: COLORS.borderSoft,
            }}
          >
            <SettingRow
              emoji="🔔"
              label="Push Notifications"
              description="Enable all app notifications"
              type="toggle"
              value={notifications}
              onToggle={setNotifications}
            />
            <SettingRow
              emoji="☀️"
              label="Daily Reminder"
              description="Morning check-in reminder"
              type="toggle"
              value={dailyReminder}
              onToggle={setDailyReminder}
            />
            <SettingRow
              emoji="⚠️"
              label="Health Alerts"
              description="Alerts when score drops significantly"
              type="toggle"
              value={healthAlerts}
              onToggle={setHealthAlerts}
            />
          </View>
        </View>

        {/* Privacy section */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: COLORS.textMuted,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Privacy & Account
          </Text>
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: COLORS.borderSoft,
            }}
          >
            <SettingRow
              emoji="🔒"
              label="Privacy Policy"
              type="link"
              onPress={() =>
                Alert.alert('Privacy Policy', 'Visit aivita.uz/privacy for full details.')
              }
            />
            <SettingRow
              emoji="📄"
              label="Terms of Service"
              type="link"
              onPress={() =>
                Alert.alert('Terms', 'Visit aivita.uz/terms for full details.')
              }
            />
            <SettingRow
              emoji="📊"
              label="Data & Storage"
              type="link"
              onPress={() =>
                Alert.alert('Data', 'Your health data is securely stored and encrypted.')
              }
            />
          </View>
        </View>

        {/* App info */}
        <View style={{ paddingHorizontal: 24, marginBottom: 40 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: COLORS.textMuted,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            About
          </Text>
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: COLORS.borderSoft,
            }}
          >
            <SettingRow
              emoji="ℹ️"
              label="App Version"
              description="1.0.0"
              type="link"
              onPress={() => {}}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
