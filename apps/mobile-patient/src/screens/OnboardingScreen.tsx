import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Screen } from '../../App';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '📋',
    title: 'Медкарта для всей семьи',
    subtitle: 'Все анализы, записи и история болезней в одном месте',
  },
  {
    emoji: '🧬',
    title: 'AI-чекап за 1 минуту',
    subtitle: 'Умный анализ симптомов и персональные рекомендации',
  },
  {
    emoji: '👨‍⚕️',
    title: '250+ врачей онлайн',
    subtitle: 'Консультации с лучшими специалистами в любое время',
  },
];

type Props = { onNavigate: (screen: Screen) => void };

export function OnboardingScreen({ onNavigate }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  };

  const handleStart = async () => {
    await AsyncStorage.setItem('onboarding_done', '1');
    onNavigate('login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.slider}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.btnText}>Начать</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf9f7' },
  slider: { flex: 1 },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emoji: { fontSize: 80, marginBottom: 32 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottom: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: '#c87d8a', width: 24 },
  btn: {
    backgroundColor: '#c87d8a',
    paddingVertical: 16,
    borderRadius: 32,
    width: '100%',
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
