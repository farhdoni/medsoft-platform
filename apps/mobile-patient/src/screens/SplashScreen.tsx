import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreenExpo from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
        const [token, onboardingDone] = await Promise.all([
          SecureStore.getItemAsync('auth_token'),
          AsyncStorage.getItem('onboarding_done'),
        ]);

        if (!onboardingDone) {
          onNavigate('onboarding');
          return;
        }

        if (!token) {
          onNavigate('login');
          return;
        }

        // Biometrics check (optional — if supported and previously enrolled)
        const biometricsEnabled = await AsyncStorage.getItem('biometrics_enabled');
        if (biometricsEnabled === '1') {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          if (hasHardware && isEnrolled) {
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Войдите в AIVITA',
              cancelLabel: 'Отмена',
              fallbackLabel: 'Пароль',
            });
            if (!result.success) {
              onNavigate('login');
              return;
            }
          }
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
