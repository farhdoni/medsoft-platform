import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_KEY, COLORS } from '../constants/config';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '👥',
    title: 'Пациенты найдут вас',
    items: ['Профиль в каталоге', 'Рейтинг', 'Отзывы'],
  },
  {
    emoji: '🤖',
    title: 'AI-ассистент диагностики',
    items: ['Подсказки по диагнозу', 'Совместимость лекарств'],
  },
  {
    emoji: '💰',
    title: 'Зарабатывайте больше',
    items: ['Онлайн-консультации', 'Выплаты каждую пятницу'],
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  }

  function next() {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      finish();
    }
  }

  function handleScroll(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scroll}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            {slide.items.map((item, j) => (
              <Text key={j} style={styles.item}>
                • {item}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
                { marginHorizontal: 4 },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={next} activeOpacity={0.85}>
          <Text style={styles.buttonText}>
            {currentIndex < SLIDES.length - 1 ? 'Далее' : 'Начать'}
          </Text>
        </TouchableOpacity>
        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finish} style={styles.skipBtn}>
            <Text style={styles.skipText}>Пропустить</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  item: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  bottom: {
    paddingBottom: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.borderSoft,
  },
  dotActive: {
    backgroundColor: COLORS.accentBlue,
    width: 24,
  },
  button: {
    backgroundColor: COLORS.accentBlue,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },
  skipBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
});
