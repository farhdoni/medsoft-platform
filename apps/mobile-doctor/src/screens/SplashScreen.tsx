import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppScreen, TOKEN_KEY, ONBOARDING_KEY, API_URL } from '../constants/config';

interface Props {
  onDone: (screen: AppScreen) => void;
}

export default function SplashScreen({ onDone }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => checkAuth(), 2000);
    return () => clearTimeout(timer);
  }, []);

  async function checkAuth() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        const res = await fetch(`${API_URL}/v1/aivita/auth/me`, {
          headers: { 'X-Aivita-Session': token },
        });
        if (res.ok) {
          onDone('main');
          return;
        }
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {}

    const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
    onDone(onboardingDone ? 'login' : 'onboarding');
  }

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient
      colors={['#5580b0', '#6BA3D6']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>aivita</Text>
        <Text style={styles.tagline}>Doctor</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logoText: {
    fontSize: 52,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 8,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 80,
    width: '60%',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
});
