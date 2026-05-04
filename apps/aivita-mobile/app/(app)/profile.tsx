import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, AlertTriangle, Pill, Clock } from 'lucide-react-native';
import { api, isOk } from '../../src/lib/api';
import { useUser } from '../../src/lib/AuthContext';

type Allergy = { id: string; allergen: string; type: string };
type Chronic = { id: string; name: string; diagnosedYear?: number };
type History = { id: string; name: string; type: string; startDate?: string };

function calcAge(dateStr: string): number {
  const birth = new Date(dateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUser();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['health-profile'],
    queryFn: async () => {
      const res = await api.healthProfile.get();
      return isOk(res) ? (res.data as Record<string, unknown>) : null;
    },
  });

  const { data: allergies = [] } = useQuery({
    queryKey: ['allergies'],
    queryFn: async () => {
      const res = await api.healthProfile.allergies();
      return isOk(res) ? (res.data as Allergy[]) : [];
    },
  });

  const { data: chronic = [] } = useQuery({
    queryKey: ['chronic'],
    queryFn: async () => {
      const res = await api.healthProfile.chronic();
      return isOk(res) ? (res.data as Chronic[]) : [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await api.healthProfile.history();
      return isOk(res) ? (res.data as History[]) : [];
    },
  });

  const name = user.name ?? 'Пользователь';
  const initials = getInitials(name);
  const age = profile?.birthDate ? calcAge(profile.birthDate as string) : null;

  const metaParts: string[] = [];
  if (age) metaParts.push(`${age} лет`);
  if (profile?.gender) metaParts.push(profile.gender === 'male' ? 'Мужской' : 'Женский');
  if (profile?.bloodType) metaParts.push(`Гр. ${profile.bloodType}`);
  if (profile?.heightCm) metaParts.push(`${profile.heightCm} см`);
  if (profile?.weightKg) metaParts.push(`${profile.weightKg} кг`);
  const metaLine = metaParts.join(' · ') || 'Заполни профиль';

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f7f4' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} color="#1a1a2e" />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={{ backgroundColor: '#9c5e6c', marginHorizontal: 16, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#ffffff' }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>МОЙ ПРОФИЛЬ</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#ffffff' }}>{name}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{metaLine}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {/* Allergies */}
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e8e4dc' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f5eaed', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={16} color="#c8576b" />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a2e' }}>Аллергии</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, backgroundColor: '#f5eaed' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#c8576b' }}>{allergies.length}</Text>
              </View>
            </View>
            {allergies.length === 0 ? (
              <Text style={{ fontSize: 12, color: '#9090a8' }}>Не указано</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {allergies.map((a) => (
                  <View key={a.id} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, backgroundColor: '#f5eaed' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#c8576b' }}>{a.allergen}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Chronic */}
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e8e4dc' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#e8eef8', alignItems: 'center', justifyContent: 'center' }}>
                <Pill size={16} color="#3d5a99" />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a2e' }}>Хронические</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, backgroundColor: '#e8eef8' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#3d5a99' }}>{chronic.length}</Text>
              </View>
            </View>
            {chronic.length === 0 ? (
              <Text style={{ fontSize: 12, color: '#9090a8' }}>Не указано</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {chronic.map((c) => (
                  <View key={c.id} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, backgroundColor: '#e8eef8' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#3d5a99' }}>
                      {c.name}{c.diagnosedYear ? ` (${c.diagnosedYear})` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* History */}
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e8e4dc' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#e5f2ee', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={16} color="#2d7a5f" />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a2e' }}>История болезней</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, backgroundColor: '#e5f2ee' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#2d7a5f' }}>{history.length}</Text>
              </View>
            </View>
            {history.length === 0 ? (
              <Text style={{ fontSize: 12, color: '#9090a8' }}>Не указано</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {history.map((h, idx) => (
                  <View key={h.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: idx < history.length - 1 ? 8 : 0, borderBottomWidth: idx < history.length - 1 ? 1 : 0, borderBottomColor: '#f0f0f0' }}>
                    <Text style={{ fontSize: 13, color: '#1a1a2e' }}>{h.name}</Text>
                    {h.startDate && <Text style={{ fontSize: 11, color: '#9090a8' }}>{new Date(h.startDate).getFullYear()}</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
