import React from 'react';
import { ScrollView, View, Text, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';

type ScreenProps = {
  children: React.ReactNode;
  title?: string;
  showNotification?: boolean;
  scrollable?: boolean;
  noPad?: boolean;
};

export function Screen({
  children,
  title,
  showNotification = true,
  scrollable = true,
  noPad = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const Wrapper = scrollable ? ScrollView : View;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f7f4' }}>
      {/* Top bar */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f9f7f4',
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#1a1a2e' }}>
          {title ?? 'Aivita'}
        </Text>
        {showNotification && (
          <TouchableOpacity
            onPress={() => router.push('/(app)/notifications')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#e8e4dc',
              ...Platform.select({ android: { elevation: 2 } }),
            }}
          >
            <Bell size={18} color="#9090a8" strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <Wrapper
        style={{ flex: 1 }}
        contentContainerStyle={scrollable && !noPad ? { paddingHorizontal: 16, paddingBottom: 24 } : undefined}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Wrapper>
    </View>
  );
}
