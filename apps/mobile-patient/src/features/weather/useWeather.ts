/**
 * useWeather — drop-in хук погоды для React Native (мобильное приложение пациента).
 *
 * Зависимости (если ещё не установлены):
 *   yarn add @react-native-community/geolocation
 *   # iOS: cd ios && pod install
 *
 * Android-разрешения — добавьте в android/app/src/main/AndroidManifest.xml:
 *   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
 *   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
 *
 * iOS — добавьте в ios/<App>/Info.plist:
 *   <key>NSLocationWhenInUseUsageDescription</key>
 *   <string>Нужно для показа погоды в вашем регионе</string>
 *
 * Данные берутся из публичного роута API (ключ OpenWeather остаётся на сервере):
 *   GET https://api.aivita.uz/v1/weather/public
 * Локация: пробуем GPS устройства, при отказе сервер сам определит по IP / отдаст дефолт.
 */
import { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export const WEATHER_API_URL = 'https://api.aivita.uz/v1/weather/public';

export interface WeatherData {
  location: { name: string; country: string | null; lat: number; lon: number };
  current: {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    windMs: number;
    condition: string;
    description: string;
    icon: string;
  };
  source: 'gps' | 'ip' | 'default';
  fetchedAt: string;
}

type Coords = { lat: number; lon: number } | null;

async function requestAndroidLocation(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Доступ к геолокации',
        message: 'Нужно для показа погоды в вашем регионе',
        buttonPositive: 'Разрешить',
        buttonNegative: 'Не сейчас',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

function getCoords(): Promise<Coords> {
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false }
    );
  });
}

export interface UseWeatherResult {
  data: WeatherData | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

export function useWeather(): UseWeatherResult {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const allowed = await requestAndroidLocation();
      const coords: Coords = allowed ? await getCoords() : null;
      const qs = coords ? `?lat=${coords.lat}&lon=${coords.lon}` : '';
      const res = await fetch(`${WEATHER_API_URL}${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as WeatherData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
