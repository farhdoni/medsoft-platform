import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/auth';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Redirect href="/(app)/(tabs)/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
