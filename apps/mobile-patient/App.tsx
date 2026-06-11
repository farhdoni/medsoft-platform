import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenExpo from 'expo-splash-screen';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './src/screens/SplashScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MainScreen } from './src/screens/MainScreen';
import { BiometricLockScreen } from './src/screens/BiometricLockScreen';

SplashScreenExpo.preventAutoHideAsync();

export type Screen = 'splash' | 'onboarding' | 'login' | 'biometric' | 'main';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      setDeepLinkUrl(url);
      if (screen === 'main') {
        // Will be handled by MainScreen
      }
    });

    Linking.getInitialURL().then((url) => {
      if (url) setDeepLinkUrl(url);
    });

    return () => sub.remove();
  }, [screen]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen === 'splash' && <SplashScreen onNavigate={setScreen} />}
      {screen === 'onboarding' && <OnboardingScreen onNavigate={setScreen} />}
      {screen === 'login' && <LoginScreen onNavigate={setScreen} />}
      {screen === 'biometric' && <BiometricLockScreen onNavigate={setScreen} />}
      {screen === 'main' && (
        <MainScreen onNavigate={setScreen} initialDeepLink={deepLinkUrl} />
      )}
    </SafeAreaProvider>
  );
}
