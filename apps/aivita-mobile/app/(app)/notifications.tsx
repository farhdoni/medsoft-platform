import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authFetch } from '../../lib/api';
import { COLORS } from '../../lib/constants';

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string;
  readAt?: string | null;
  createdAt: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch<Notification[]>('/notifications')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgApp }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgApp} />
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: COLORS.white,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.borderSoft,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textPrimary }}>
          Уведомления
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.accentRose} />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>🔔</Text>
          <Text style={{ fontSize: 16, color: COLORS.textSecondary, textAlign: 'center' }}>
            Уведомлений пока нет
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <View
              key={item.id}
              style={{
                marginHorizontal: 16,
                marginTop: 12,
                backgroundColor: item.readAt ? COLORS.white : COLORS.bgSoftPink,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.borderSoft,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.textPrimary }}>
                {item.title}
              </Text>
              {item.body ? (
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 }}>
                  {item.body}
                </Text>
              ) : null}
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 8 }}>
                {new Date(item.createdAt).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}
