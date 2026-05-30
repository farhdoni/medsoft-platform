import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/auth';

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)/sign-in" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="report" options={{ headerShown: false }} />
    </Stack>
  );
}
