import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBiometric } from '../hooks/useBiometric';
import type { Screen } from '../../App';

const MAX_ATTEMPTS = 3;

type Props = { onNavigate: (screen: Screen) => void };

export function BiometricLockScreen({ onNavigate }: Props) {
  const { isSupported, isEnrolled, authenticate } = useBiometric();
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus]     = useState<'idle' | 'asking' | 'failed'>('idle');
  const shake = useRef(new Animated.Value(0)).current;

  async function tryAuth() {
    if (status === 'asking') return;
    setStatus('asking');
    const result = await authenticate();

    if (result === 'ok') {
      onNavigate('main');
      return;
    }

    const next = attempts + 1;
    setAttempts(next);

    if (result === 'not_supported' || result === 'not_enrolled' || next >= MAX_ATTEMPTS) {
      // Hardware gone or too many failures → fall through to password
      onNavigate('login');
      return;
    }

    setStatus('failed');
    // Shake animation on failure
    Animated.sequence([
      Animated.timing(shake, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start(() => setStatus('idle'));
  }

  // Auto-prompt on mount (once hardware/enrollment confirmed by hook)
  useEffect(() => {
    if (isSupported && isEnrolled) {
      tryAuth();
    } else if (isSupported === false || isEnrolled === false) {
      // Device state changed — skip biometrics
      onNavigate('login');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, isEnrolled]);

  const attemptsLeft = MAX_ATTEMPTS - attempts;

  return (
    <LinearGradient colors={['#9c5e6c', '#6a5a8e']} style={styles.container}>
      <Text style={styles.logo}>aivita</Text>

      <Animated.View style={[styles.iconWrap, { transform: [{ translateX: shake }] }]}>
        <Text style={styles.icon}>🔐</Text>
      </Animated.View>

      <Text style={styles.title}>Вход по отпечатку</Text>

      {status === 'failed' && attemptsLeft > 0 && (
        <Text style={styles.hint}>
          Не распознан. Осталось попыток: {attemptsLeft}
        </Text>
      )}

      {status === 'idle' && attempts > 0 && (
        <TouchableOpacity style={styles.retryBtn} activeOpacity={0.8} onPress={tryAuth}>
          <Text style={styles.retryText}>Повторить</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.fallbackBtn}
        activeOpacity={0.75}
        onPress={() => onNavigate('login')}
      >
        <Text style={styles.fallbackText}>Войти с паролем</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 40,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 8,
    marginBottom: 48,
  },
  iconWrap: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 72,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 24,
    marginBottom: 16,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  fallbackBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  fallbackText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
