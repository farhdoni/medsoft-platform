import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreenExpo from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthToken, isBiometricEnabled } from '../services/auth';
import type { Screen } from '../../App';

type Props = { onNavigate: (screen: Screen) => void };

export function SplashScreen({ onNavigate }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SplashScreenExpo.hideAsync();

    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(async () => {
      try {
        const [token, onboardingDone, biometricEnabled] = await Promise.all([
          getAuthToken(),
          AsyncStorage.getItem('onboarding_done'),
          isBiometricEnabled(),
        ]);

        if (!onboardingDone) {
          onNavigate('onboarding');
          return;
        }

        if (!token) {
          onNavigate('login');
          return;
        }

        // If biometrics is enabled → show lock screen (handles prompt + fallback)
        if (biometricEnabled) {
          onNavigate('biometric');
          return;
        }

        onNavigate('main');
      } catch {
        onNavigate('login');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient colors={['#9c5e6c', '#6a5a8e']} style={styles.container}>
      <Text style={styles.logo}>aivita</Text>
      <View style={styles.progressBg}>
        <Animated.View style={[styles.progressFill, { width }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: {
    fontSize: 48,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 8,
    marginBottom: 48,
  },
  progressBg: {
    width: 200,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});
