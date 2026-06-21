# Карточка погоды для мобильного приложения (React Native)

Drop-in модуль: компонент `WeatherCard` + хук `useWeather`. Данные берёт из публичного
роута API `GET https://api.aivita.uz/v1/weather/public` — ключ OpenWeather остаётся на сервере.

> Примечание: проекта `apps/mobile-patient` пока нет в репозитории — это готовые файлы
> для вставки в ваше RN-приложение. Скопируйте папку `features/weather/` в `src/` приложения.

## Установка зависимостей

```bash
yarn add @react-native-community/geolocation
# iOS:
cd ios && pod install && cd ..
```

## Нативные разрешения

**Android** — `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

**iOS** — `ios/<App>/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Нужно для показа погоды в вашем регионе</string>
```

## Использование

```tsx
import { WeatherCard } from './features/weather/WeatherCard';

function HomeScreen() {
  return (
    <ScrollView>
      {/* ...другие секции... */}
      <WeatherCard />
    </ScrollView>
  );
}
```

## Поведение

- На Android запрашивает разрешение `ACCESS_FINE_LOCATION` через `PermissionsAndroid`.
- Пробует получить GPS-координаты устройства; при отказе/таймауте шлёт запрос без
  координат — сервер определит локацию по IP, иначе отдаст дефолт (Ташкент).
- Нативный `fetch` не подчиняется браузерному CORS, дополнительная настройка API не нужна
  (кроме заданного `OPENWEATHER_API_KEY`).
- Иконки — эмодзи, без доп. зависимостей; при желании замените на свой icon-set.

## Настройка адреса API

Адрес задан в `useWeather.ts` (`WEATHER_API_URL`). Поменяйте при необходимости
(например, на staging-окружение).
