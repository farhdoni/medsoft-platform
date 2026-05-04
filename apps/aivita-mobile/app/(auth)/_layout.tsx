import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/AuthContext';

export default function AuthLayout() {
  const router = useRouter();
  const { state } = useAuth();

  useEffect(() => {
    if (state.status === 'authenticated') {
      router.replace('/(app)/');
    }
  }, [state.status]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
