import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, isOk } from '../../src/lib/api';
import { Screen } from '../../src/components/Screen';

type NotifRecord = {
  id: string;
  type: string;
  title: string;
  body?: string;
  readAt?: string | null;
  createdAt: string;
};

const TYPE_EMOJI: Record<string, string> = {
  habit_reminder: '✅',
  health_alert: '⚠️',
  weekly_report: '📊',
  family_update: '👨‍👩‍👧',
  system: '🔔',
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.notifications.list();
      return isOk(res) ? (res.data as NotifRecord[]) : [];
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.readAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f7f4' }}>
      {/* Custom header */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e8e4dc' }}>
          <ArrowLeft size={18} color="#1a1a2e" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a2e' }}>Уведомления</Text>
          {unread > 0 && <Text style={{ fontSize: 11, color: '#9090a8' }}>{unread} непрочитано</Text>}
        </View>
        {unread > 0 && (
          <TouchableOpacity
            onPress={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, backgroundColor: '#f5eaed' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#9c5e6c' }}>Прочитать все</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#9c5e6c" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#f5eaed', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={36} color="#c8576b" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1a1a2e' }}>Нет уведомлений</Text>
          <Text style={{ fontSize: 13, color: '#9090a8' }}>Мы сообщим когда что-то случится</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {notifications.map((n) => (
            <View
              key={n.id}
              style={{
                flexDirection: 'row',
                gap: 12,
                backgroundColor: '#ffffff',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: n.readAt ? '#e8e4dc' : '#f5eaed',
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: n.readAt ? '#f4f3ef' : '#f5eaed', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{TYPE_EMOJI[n.type] ?? '🔔'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a1a2e', flex: 1 }}>{n.title}</Text>
                  {!n.readAt && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#c8576b' }} />}
                </View>
                {n.body ? <Text style={{ fontSize: 12, color: '#4a4a6a', lineHeight: 18 }}>{n.body}</Text> : null}
                <Text style={{ fontSize: 10, color: '#9090a8', marginTop: 4 }}>
                  {new Date(n.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
