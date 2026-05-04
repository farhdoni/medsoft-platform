import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../src/lib/AuthContext';
import { TabBar } from '../../src/components/TabBar';
import { registerDeviceToken } from '../../src/lib/push';

// Screens that show TabBar
const TAB_SCREENS = ['index', 'test', 'habits', 'nutrition', 'family'];

export default function AppLayout() {
  const router = useRouter();
  const { state } = useAuth();

  useEffect(() => {
    if (state.status === 'unauthenticated') {
      router.replace('/(auth)/login');
    }
  }, [state.status]);

  useEffect(() => {
    if (state.status === 'authenticated') {
      registerDeviceToken().catch(console.warn);
    }
  }, [state.status]);

  if (state.status !== 'authenticated') return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f7f4' }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="test" />
        <Stack.Screen name="habits" />
        <Stack.Screen name="nutrition" />
        <Stack.Screen name="family" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="report" />
      </Stack>
      <TabBarConditional />
    </View>
  );
}

function TabBarConditional() {
  const pathname = usePathname();
  const hide = ['/chat'].some((p) => pathname.endsWith(p));
  if (hide) return null;
  return <TabBar />;
}
