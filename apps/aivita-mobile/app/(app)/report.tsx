import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react-native';
import { api, isOk } from '../../src/lib/api';
import { Screen } from '../../src/components/Screen';

type Report = {
  id: string;
  reportNumber: number;
  fileUrl: string;
  shareToken?: string;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
}

const CONTENTS = [
  'Личные данные и антропометрия',
  'Аллергии и хронические заболевания',
  'История болезней и операций',
  'Биометрия за 30 дней (пульс, давление, сон)',
  'Health Score по 5 системам',
];

export default function ReportScreen() {
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await api.reports.list();
      return isOk(res) ? (res.data as Report[]) : [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => api.reports.generate(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const latest = reports[0] ?? null;

  return (
    <Screen title="Отчёт врачу">
      {/* Hero */}
      <View style={{ borderRadius: 24, backgroundColor: '#9c5e6c', padding: 20, marginBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          ОТЧЁТ ВРАЧУ
        </Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 4 }}>
          {latest ? `Отчёт № ${latest.reportNumber}` : 'Нет готового отчёта'}
        </Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
          {latest ? `Создан ${formatDate(latest.createdAt)}` : 'Сгенерируй сводку для врача за 30 дней'}
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : latest ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(latest.fileUrl)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' }}
          >
            <Download size={16} color="#ffffff" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>Скачать PDF</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start', opacity: generateMutation.isPending ? 0.7 : 1 }}
          >
            {generateMutation.isPending
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <FileText size={16} color="#ffffff" />}
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
              {generateMutation.isPending ? 'Генерация...' : 'Создать отчёт'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contents */}
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9090a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Что включено в отчёт
      </Text>
      <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e8e4dc', marginBottom: 16, gap: 10 }}>
        {CONTENTS.map((item) => (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5f2ee', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#2d7a5f' }}>✓</Text>
            </View>
            <Text style={{ fontSize: 13, color: '#1a1a2e', flex: 1 }}>{item}</Text>
          </View>
        ))}
      </View>

      {/* History */}
      {reports.length > 1 && (
        <>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#9090a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Предыдущие отчёты
          </Text>
          <View style={{ gap: 8, marginBottom: 16 }}>
            {reports.slice(1, 5).map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e8e4dc' }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a2e' }}>№ {r.reportNumber}</Text>
                  <Text style={{ fontSize: 11, color: '#9090a8', marginTop: 2 }}>{formatDate(r.createdAt)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => Linking.openURL(r.fileUrl)}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, backgroundColor: '#ede8f5' }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#5e4a8c' }}>PDF</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Generate new if has latest */}
      {latest && (
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            style={{ opacity: generateMutation.isPending ? 0.7 : 1 }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#9c5e6c' }}>
              {generateMutation.isPending ? 'Генерация...' : 'Создать новый отчёт'}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 11, color: '#9090a8', marginTop: 4 }}>за текущий период</Text>
        </View>
      )}
    </Screen>
  );
}
