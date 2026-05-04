import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3001';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email.trim() || !nickname.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Заполни все обязательные поля');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/v1/aivita/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), nickname: nickname.trim(), password, name: name.trim() || undefined }),
      });

      const body = await res.json() as { data?: { userId: string }; error?: string };

      if (!res.ok) {
        const msg = {
          email_taken: 'Этот email уже занят',
          nickname_taken: 'Этот никнейм уже занят',
        }[body.error ?? ''] ?? 'Ошибка регистрации';
        Alert.alert('Ошибка', msg);
        return;
      }

      Alert.alert(
        'Проверь email',
        `Мы отправили код подтверждения на ${email}. Введи его для активации аккаунта.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Ошибка', 'Нет подключения к сети');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f9f7f4' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24, alignSelf: 'flex-start' }}>
          <ArrowLeft size={24} color="#1a1a2e" />
        </TouchableOpacity>

        <Text style={{ fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 }}>
          Создать аккаунт
        </Text>
        <Text style={{ fontSize: 14, color: '#9090a8', marginBottom: 32 }}>
          Регистрация займёт меньше минуты
        </Text>

        <View style={{ gap: 12 }}>
          {[
            { label: 'Имя', value: name, set: setName, placeholder: 'Иван Иванов', type: 'default' as const },
            { label: 'Email *', value: email, set: setEmail, placeholder: 'your@email.com', type: 'email-address' as const },
            { label: 'Никнейм *', value: nickname, set: setNickname, placeholder: 'ivan_123', type: 'default' as const },
          ].map((field) => (
            <View key={field.label}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#9090a8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {field.label}
              </Text>
              <TextInput
                value={field.value}
                onChangeText={field.set}
                placeholder={field.placeholder}
                placeholderTextColor="#c0c0d0"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={field.type}
                style={{
                  height: 52,
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#e8e4dc',
                  paddingHorizontal: 16,
                  fontSize: 15,
                  color: '#1a1a2e',
                }}
              />
            </View>
          ))}

          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#9090a8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Пароль * (мин. 8 символов)
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#c0c0d0"
              secureTextEntry
              style={{
                height: 52,
                backgroundColor: '#ffffff',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#e8e4dc',
                paddingHorizontal: 16,
                fontSize: 15,
                color: '#1a1a2e',
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={{
              height: 54,
              borderRadius: 100,
              backgroundColor: '#9c5e6c',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                Зарегистрироваться
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
