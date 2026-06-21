/**
 * WeatherCard — drop-in карточка погоды для React Native.
 * Использование:
 *   import { WeatherCard } from './features/weather/WeatherCard';
 *   ...
 *   <WeatherCard />
 *
 * Иконки — эмодзи (без доп. зависимостей). При желании замените на свой icon-set.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useWeather } from './useWeather';

// Маппинг кодов OpenWeather → эмодзи.
function iconFor(code: string): string {
  const key = code.replace(/[nd]$/, '');
  switch (key) {
    case '01':
      return '☀️';
    case '02':
      return '🌤️';
    case '03':
    case '04':
      return '☁️';
    case '09':
      return '🌦️';
    case '10':
      return '🌧️';
    case '11':
      return '⛈️';
    case '13':
      return '❄️';
    case '50':
      return '🌫️';
    default:
      return '☁️';
  }
}

export function WeatherCard() {
  const { data, loading, error } = useWeather();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Погода</Text>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : error || !data ? (
        <Text style={styles.muted}>Нет данных о погоде</Text>
      ) : (
        <View>
          <View style={styles.row}>
            <Text style={styles.icon}>{iconFor(data.current.icon)}</Text>
            <Text style={styles.temp}>{data.current.tempC}°C</Text>
          </View>
          <Text style={styles.desc}>{data.current.description}</Text>
          <Text style={styles.location}>
            📍 {data.location.name}
            {data.location.country ? `, ${data.location.country}` : ''}
          </Text>
          <View style={styles.metrics}>
            <Text style={styles.metric}>💧 {data.current.humidity}%</Text>
            <Text style={styles.metric}>💨 {data.current.windMs} м/с</Text>
            <Text style={styles.metric}>Ощущается {data.current.feelsLikeC}°</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8 },
  loader: { alignSelf: 'flex-start', marginVertical: 8 },
  muted: { fontSize: 14, color: '#9ca3af' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 32 },
  temp: { fontSize: 32, fontWeight: '700', color: '#111827' },
  desc: { fontSize: 14, color: '#6b7280', textTransform: 'capitalize', marginTop: 2 },
  location: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  metrics: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metric: { fontSize: 12, color: '#6b7280' },
});
