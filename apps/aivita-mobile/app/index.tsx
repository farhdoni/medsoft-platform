import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f3ef' }}>
        <ActivityIndicator size="large" color="#9c5e6c" />
      </View>
    );
  }

  return <Redirect href={user ? '/(app)/(tabs)/home' : '/(auth)/sign-in'} />;
}
