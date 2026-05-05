import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../lib/auth';
import { COLORS } from '../../lib/constants';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignIn() {
    if (!identifier.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(identifier.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgApp }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgApp} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ paddingTop: 80, paddingHorizontal: 32, paddingBottom: 48 }}>
            {/* Logo circle */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: COLORS.bgSoftPink,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <Text style={{ fontSize: 28 }}>🌸</Text>
            </View>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '700',
                color: COLORS.textPrimary,
                marginBottom: 8,
                letterSpacing: -0.5,
              }}
            >
              Welcome back
            </Text>
            <Text style={{ fontSize: 16, color: COLORS.textSecondary, lineHeight: 22 }}>
              Sign in to continue your health journey
            </Text>
          </View>

          {/* Form */}
          <View style={{ paddingHorizontal: 24, gap: 16 }}>
            {/* Error message */}
            {!!error && (
              <View
                style={{
                  backgroundColor: '#fde8ec',
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#f5b8c4',
                }}
              >
                <Text style={{ color: '#9c3050', fontSize: 14, lineHeight: 20 }}>{error}</Text>
              </View>
            )}

            {/* Identifier input */}
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: COLORS.textSecondary,
                  marginBottom: 8,
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}
              >
                Email or nickname
              </Text>
              <TextInput
                style={{
                  backgroundColor: COLORS.white,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: COLORS.textPrimary,
                  borderWidth: 1.5,
                  borderColor: identifier ? COLORS.accentRose : COLORS.borderSoft,
                }}
                placeholder="your@email.com or nickname"
                placeholderTextColor={COLORS.textMuted}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            {/* Password input */}
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: COLORS.textSecondary,
                  marginBottom: 8,
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}
              >
                Password
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    backgroundColor: COLORS.white,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    paddingRight: 52,
                    fontSize: 16,
                    color: COLORS.textPrimary,
                    borderWidth: 1.5,
                    borderColor: password ? COLORS.accentRose : COLORS.borderSoft,
                  }}
                  placeholder="Your password"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: 40,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign in button */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading}
              style={{
                marginTop: 8,
                borderRadius: 16,
                overflow: 'hidden',
                shadowColor: COLORS.accentRose,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
              activeOpacity={0.85}
            >
              <View
                style={{
                  backgroundColor: loading ? COLORS.textMuted : COLORS.accentRose,
                  paddingVertical: 16,
                  alignItems: 'center',
                  borderRadius: 16,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text
                    style={{
                      color: COLORS.white,
                      fontSize: 16,
                      fontWeight: '700',
                      letterSpacing: 0.3,
                    }}
                  >
                    Sign In
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Footer hint */}
            <View style={{ alignItems: 'center', paddingTop: 16 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18 }}>
                Use the same credentials as the Aivita web app
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
