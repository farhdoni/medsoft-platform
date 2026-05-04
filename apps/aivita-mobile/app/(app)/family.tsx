import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Shield, ChevronRight } from 'lucide-react-native';
import { api, isOk } from '../../src/lib/api';
import { Screen } from '../../src/components/Screen';

type FamilyMember = {
  id: string;
  memberName: string;
  memberRelation: string;
  memberBirthDate?: string;
};

const RELATION_LABELS: Record<string, string> = {
  spouse: 'Супруг/а', child: 'Ребёнок', parent: 'Родитель',
  sibling: 'Брат/Сестра', other: 'Другое',
};

const SOFT_BGS = ['#f5eaed', '#ede8f5', '#e5f2ee', '#e8eef8', '#edf2e8'];

function calcAge(dateStr: string): number {
  const birth = new Date(dateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function FamilyScreen() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['family'],
    queryFn: async () => {
      const res = await api.family.list();
      return isOk(res) ? (res.data as FamilyMember[]) : [];
    },
  });

  return (
    <Screen title="Семья">
      {/* Hero */}
      <View style={{ borderRadius: 24, backgroundColor: '#9c5e6c', padding: 20, marginBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          СЕМЬЯ
        </Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#ffffff' }}>
          {members.length === 0 ? 'Пригласи близких' : `${members.length} ${members.length === 1 ? 'участник' : members.length < 5 ? 'участника' : 'участников'}`}
        </Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
          Здоровье близких в одном месте
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#9c5e6c" style={{ marginTop: 40 }} />
      ) : members.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#ede8f5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 36 }}>👨‍👩‍👧‍👦</Text>
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1a1a2e' }}>Семья пока пуста</Text>
          <Text style={{ fontSize: 13, color: '#9090a8', textAlign: 'center', marginTop: 6, maxWidth: 220 }}>
            Добавь близких через веб-версию Aivita
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10, marginBottom: 16 }}>
          {members.map((m, idx) => {
            const age = m.memberBirthDate ? calcAge(m.memberBirthDate) : null;
            const relation = RELATION_LABELS[m.memberRelation] ?? m.memberRelation;
            const initial = m.memberName.charAt(0).toUpperCase();
            const bg = SOFT_BGS[idx % SOFT_BGS.length];
            return (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#e8e4dc',
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1a1a2e' }}>{initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a2e' }}>{m.memberName}</Text>
                  <Text style={{ fontSize: 11, color: '#9090a8', marginTop: 2 }}>
                    {relation}{age !== null ? ` · ${age} лет` : ''}
                  </Text>
                </View>
                <ChevronRight size={16} color="#9090a8" />
              </View>
            );
          })}
        </View>
      )}

      {/* Privacy reminder */}
      <View style={{ borderRadius: 16, backgroundColor: '#f5eaed', padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={16} color="#c8576b" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a2e', marginBottom: 2 }}>Что видит семья</Text>
          <Text style={{ fontSize: 11, color: '#4a4a6a', lineHeight: 16 }}>
            Общие метрики. Не видят: AI-чат, мед. документы, заметки.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
