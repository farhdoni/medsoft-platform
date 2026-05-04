import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Home, FlaskConical, CheckSquare, Utensils, Users, Bot, type LucideIcon } from 'lucide-react-native';

type Tab = {
  name: string;
  label: string;
  Icon: LucideIcon;
  href: string;
};

const TABS: Tab[] = [
  { name: 'home',      label: 'Главная',   Icon: Home,         href: '/(app)/' },
  { name: 'test',      label: 'Тест',      Icon: FlaskConical, href: '/(app)/test' },
  { name: 'habits',    label: 'Привычки',  Icon: CheckSquare,  href: '/(app)/habits' },
  { name: 'nutrition', label: 'Питание',   Icon: Utensils,     href: '/(app)/nutrition' },
  { name: 'family',    label: 'Семья',     Icon: Users,        href: '/(app)/family' },
];

export function TabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const paddingBottom = Math.max(insets.bottom, 8);

  return (
    <View
      style={{
        paddingBottom,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e8e4dc',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 8,
        ...Platform.select({
          android: { elevation: 8 },
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          },
        }),
      }}
    >
      {TABS.map((tab, idx) => {
        const isActive = pathname === tab.href.replace('/(app)', '') ||
          (tab.name === 'home' && pathname === '/');
        const color = isActive ? '#9c5e6c' : '#9090a8';

        // Center button is FAB (chat)
        if (idx === 2) {
          return (
            <React.Fragment key="chat-group">
              {/* habits tab */}
              <TabItem tab={tab} isActive={isActive} color={color} router={router} />
              {/* FAB */}
              <TouchableOpacity
                onPress={() => router.push('/(app)/chat')}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#9c5e6c',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -20,
                  marginHorizontal: 8,
                  shadowColor: '#9c5e6c',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Bot size={22} color="#ffffff" strokeWidth={2} />
              </TouchableOpacity>
            </React.Fragment>
          );
        }

        return <TabItem key={tab.name} tab={tab} isActive={isActive} color={color} router={router} />;
      })}
    </View>
  );
}

function TabItem({
  tab, isActive, color, router,
}: {
  tab: Tab;
  isActive: boolean;
  color: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <TouchableOpacity
      onPress={() => router.push(tab.href as never)}
      style={{ flex: 1, alignItems: 'center', paddingVertical: 4, gap: 2 }}
      activeOpacity={0.7}
    >
      <tab.Icon size={20} color={color} strokeWidth={isActive ? 2.5 : 1.8} />
      <Text
        style={{
          fontSize: 10,
          color,
          fontWeight: isActive ? '700' : '500',
        }}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}
