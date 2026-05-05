import { Tabs } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../../lib/constants';

function TabBarIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 4 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 10,
          marginTop: 2,
          color: focused ? COLORS.accentRose : COLORS.textMuted,
          fontWeight: focused ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ChatFab() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push('/(app)/chat')}
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.accentRose,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: COLORS.accentRose,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      }}
      activeOpacity={0.85}
    >
      <Text style={{ fontSize: 22 }}>💬</Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.borderSoft,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.accentRose,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="test"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon emoji="📋" label="Tests" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat-tab"
        options={{
          tabBarButton: () => <ChatFab />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon emoji="✨" label="Habits" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon emoji="👨‍👩‍👧" label="Family" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
