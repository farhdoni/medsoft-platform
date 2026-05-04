import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/lib/AuthContext';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введи email/никнейм и пароль');
      return;
    }
    setLoading(true);
    try {
      await signIn(identifier.trim(), password);
      router.replace('/(app)/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      const friendly = {
        invalid_credentials: 'Неверный email или пароль',
        email_not_verified: 'Email не подтверждён',
        account_locked: 'Аккаунт заблокирован на 15 минут',
      }[msg] ?? 'Произошла ошибка. Попробуй снова.';
      Alert.alert('Ошибка входа', friendly);
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
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          justifyContent: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={{ marginBottom: 40 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: '#f5eaed',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 36 }}>🏥</Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#1a1a2e', marginBottom: 6 }}>
            Добро пожаловать
          </Text>
          <Text style={{ fontSize: 15, color: '#9090a8', lineHeight: 22 }}>
            Войди в свой аккаунт Aivita
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#9090a8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Email или никнейм
            </Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="your@email.com"
              placeholderTextColor="#c0c0d0"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
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

          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#9090a8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Пароль
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
            onPress={handleLogin}
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
                Войти
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 4 }}>
          <Text style={{ fontSize: 14, color: '#9090a8' }}>Нет аккаунта?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#9c5e6c' }}>Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
