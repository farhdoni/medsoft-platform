import React from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Heart, Bell, Globe, Users, ChevronRight, LogOut, type LucideIcon } from 'lucide-react-native';
import { useAuth, useUser } from '../../src/lib/AuthContext';

type SettingItem = {
  Icon: LucideIcon;
  label: string;
  sub?: string;
  value?: string;
  href?: string;
  bg: string;
  color: string;
  onPress?: () => void;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const user = useUser();

  const SECTIONS: Array<{ title: string; items: SettingItem[] }> = [
    {
      title: 'Аккаунт',
      items: [
        { Icon: User,  label: 'Профиль',     sub: 'Имя, дата рождения, пол',  href: '/(app)/profile', bg: '#f5eaed', color: '#9c5e6c' },
        { Icon: Heart, label: 'Мед. профиль', sub: 'Аллергии, заболевания',   href: '/(app)/profile', bg: '#e5f2ee', color: '#2d7a5f' },
      ],
    },
    {
      title: 'Приложение',
      items: [
        { Icon: Bell,  label: 'Уведомления', sub: 'Привычки, напоминания', href: '/(app)/notifications', bg: '#ede8f5', color: '#5e4a8c' },
        { Icon: Globe, label: 'Язык',        sub: 'Русский',               bg: '#e8eef8', color: '#3d5a99' },
      ],
    },
    {
      title: 'Здоровье',
      items: [
        { Icon: Users, label: 'Семья', sub: 'Члены и приглашения', href: '/(app)/family', bg: '#ede8f5', color: '#5e4a8c' },
      ],
    },
  ];

  function handleSignOut() {
    Alert.alert('Выйти из аккаунта?', 'Ты сможешь войти снова', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f7f4' }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e8e4dc' }}>
          <ArrowLeft size={18} color="#1a1a2e" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#9090a8', textTransform: 'uppercase', letterSpacing: 1 }}>НАСТРОЙКИ</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a2e' }}>Управление аккаунтом</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 20 }}>
        {/* User card */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/profile')}
          style={{ backgroundColor: '#9c5e6c', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
        >
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#ffffff' }}>
              {user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>{user.name}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{user.email}</Text>
          </View>
          <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#9090a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {section.title}
            </Text>
            <View style={{ backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e8e4dc', overflow: 'hidden' }}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={item.onPress ?? (item.href ? () => router.push(item.href as never) : undefined)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    borderBottomWidth: idx < section.items.length - 1 ? 1 : 0,
                    borderBottomColor: '#f0f0f0',
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <item.Icon size={16} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a2e' }}>{item.label}</Text>
                    {item.sub && <Text style={{ fontSize: 11, color: '#9090a8', marginTop: 1 }}>{item.sub}</Text>}
                  </View>
                  {item.value && <Text style={{ fontSize: 12, color: '#9090a8' }}>{item.value}</Text>}
                  <ChevronRight size={16} color="#9090a8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Danger zone */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#9090a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Опасная зона
          </Text>
          <TouchableOpacity
            onPress={handleSignOut}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fce4e4' }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: '#fce4e4', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={16} color="#e53e3e" />
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#e53e3e' }}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
