import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/lib/AuthContext';

export default function Index() {
  const router = useRouter();
  const { state } = useAuth();

  useEffect(() => {
    if (state.status === 'loading') return;
    if (state.status === 'authenticated') {
      router.replace('/(app)/');
    } else {
      router.replace('/(auth)/login');
    }
  }, [state.status]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f7f4', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#9c5e6c" />
    </View>
  );
}
