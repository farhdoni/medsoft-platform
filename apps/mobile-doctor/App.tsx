import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';
import { DOCTOR_HOME } from './src/constants/config';

export type AppScreen = 'splash' | 'onboarding' | 'login' | 'main';

function parseDoctorDeepLink(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    if (parsed.scheme !== 'aivita-doctor') return null;
    const host = parsed.hostname ?? '';
    const path = parsed.path ?? '';
    if (host === 'patient' && path) return `/ru/doctor-patient/${path.replace(/^\//, '')}`;
    if (host === 'chats') return '/ru/doctor-chats';
    if (host === 'schedule') return '/ru/doctor-schedule';
  } catch {}
  return null;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        const path = parseDoctorDeepLink(url);
        if (path) setDeepLinkUrl(DOCTOR_HOME.replace('/ru/doctor-home', path));
      }
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      const path = parseDoctorDeepLink(url);
      if (path) {
        const base = DOCTOR_HOME.replace('/ru/doctor-home', '');
        setDeepLinkUrl(base + path);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen === 'splash' && <SplashScreen onDone={setScreen} />}
      {screen === 'onboarding' && (
        <OnboardingScreen onDone={() => setScreen('login')} />
      )}
      {screen === 'login' && <LoginScreen onLogin={() => setScreen('main')} />}
      {screen === 'main' && (
        <MainScreen
          onLogout={() => setScreen('login')}
          deepLinkUrl={deepLinkUrl}
          onDeepLinkHandled={() => setDeepLinkUrl(null)}
        />
      )}
    </SafeAreaProvider>
  );
}
