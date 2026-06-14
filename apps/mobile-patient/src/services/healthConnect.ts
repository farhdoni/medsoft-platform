import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import CookieManager, { type Cookies } from '@react-native-cookies/cookies';
import { API_URL, WEB_URL } from '../constants/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HcStatus =
  | 'unavailable_platform'   // не Android
  | 'unavailable_not_installed' // HC не установлен (Android < 14 без приложения)
  | 'unavailable_update_required'
  | 'permission_denied'
  | 'ready'
  | 'error';

export interface HcSyncResult {
  status: HcStatus;
  synced?: { steps: number | null; heartRateReadings: number };
  error?: string;
}

// Нормализованная запись батча. value — произвольный JSON, нормализуется на бэке.
interface BatchVital {
  type: string;
  value: Record<string, number>;
  recorded_at: string;
  source: 'health_connect';
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function todayBounds(): { startTime: string; endTime: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return {
    startTime: start.toISOString(),
    endTime: now.toISOString(),
  };
}

/**
 * Читает сессионный JWT из НАТИВНОГО cookie-jar WebView (CookieManager).
 * Cookie httpOnly — поэтому читаем через нативный менеджер, НЕ JS-инжектом.
 * Предпочитаем aivita_api (API-signed — всегда проверяется бэком), затем
 * legacy aivita_session. Отправляется на API заголовком X-Aivita-Session.
 * Cookie живёт на веб-origin (app.aivita.uz); как фолбэк проверяем API-host.
 */
async function getSessionToken(): Promise<string | null> {
  const pick = (c: Cookies): string | null =>
    c.aivita_api?.value ?? c.aivita_session?.value ?? null;
  try {
    const web = await CookieManager.get(WEB_URL);
    const token = pick(web);
    if (token) return token;
  } catch {
    // веб-origin недоступен — пробуем API-host ниже
  }
  try {
    const api = await CookieManager.get(API_URL);
    return pick(api);
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Проверяет доступность Health Connect на устройстве. */
export async function checkAvailability(): Promise<HcStatus> {
  if (Platform.OS !== 'android') return 'unavailable_platform';

  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'ready';
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED)
      return 'unavailable_update_required';
    return 'unavailable_not_installed';
  } catch {
    return 'error';
  }
}

/**
 * Проверяет, уже выданы ли разрешения (БЕЗ показа диалога).
 * ВАЖНО: вызывать только после checkAvailability() === 'ready',
 * иначе initialize()/getGrantedPermissions() могут бросить нативный краш.
 */
async function hasPermissionsUnsafe(): Promise<boolean> {
  await initialize();
  const granted = await getGrantedPermissions();
  return granted.some((p: { recordType: string }) => p.recordType === 'Steps');
}

/**
 * Инициализирует SDK и запрашивает разрешения на чтение полного набора метрик
 * (шаги, пульс, SpO2, сон, калории, дистанция, пульс покоя). Показывает
 * системный диалог — вызывать только если checkAvailability()==='ready'
 * и только по явному действию пользователя.
 * ВАЖНО: никогда не вызывать без предварительной проверки checkAvailability().
 */
export async function requestPermissions(): Promise<boolean> {
  // Двойная защита: проверяем доступность прямо здесь
  const availability = await checkAvailability();
  if (availability !== 'ready') return false;
  try {
    await initialize();
    const granted = await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'OxygenSaturation' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'TotalCaloriesBurned' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      { accessType: 'read', recordType: 'Distance' },
      { accessType: 'read', recordType: 'RestingHeartRate' },
    ]);
    // Базовый успех — выдан хотя бы Steps (остальные опциональны на устройствах).
    return granted.some((p: { recordType: string }) => p.recordType === 'Steps');
  } catch {
    return false;
  }
}

/**
 * Читает метрики за текущие сутки из Health Connect и отправляет в
 * /v1/aivita/vitals/batch. Шаги/калории/дистанция/сон агрегируются за день,
 * пульс/SpO2/пульс покоя — пер-замер. Авторизация — сессионная cookie WebView.
 *
 * Не бросает исключений — любая ошибка возвращается через HcSyncResult.
 * Безопасно вызывать при старте на любом устройстве.
 */
export async function syncToday(): Promise<HcSyncResult> {
  // 1. Платформа + доступность HC — единственная точка входа в нативный слой.
  //    Если HC не установлен, getSdkStatus() — единственный безопасный вызов.
  //    requestPermission() и getGrantedPermissions() без этой проверки → нативный краш.
  const availability = await checkAvailability();
  if (availability !== 'ready') return { status: availability };

  // 2. Инициализация SDK (HC точно доступен — безопасно)
  try {
    await initialize();
  } catch (e) {
    return { status: 'error', error: String(e) };
  }

  // 3. Проверяем наличие разрешений без диалога (HC доступен — безопасно)
  let hasPermission: boolean;
  try {
    hasPermission = await hasPermissionsUnsafe();
  } catch {
    return { status: 'permission_denied' };
  }
  if (!hasPermission) return { status: 'permission_denied' };

  // 4. Читаем данные за сегодня
  const { startTime, endTime } = todayBounds();
  const timeRangeFilter = {
    operator: 'between' as const,
    startTime,
    endTime,
  };

  let totalSteps: number | null = null;
  let heartRateReadings = 0;

  const vitals: BatchVital[] = [];

  // ── Шаги (агрегат за день) ──────────────────────────────────────────────────
  try {
    const stepsResult = await readRecords('Steps', { timeRangeFilter });
    if (stepsResult.records.length > 0) {
      totalSteps = stepsResult.records.reduce((sum, r) => sum + r.count, 0);
      vitals.push({ type: 'steps', value: { count: totalSteps }, recorded_at: endTime, source: 'health_connect' });
    }
  } catch {
    // шаги недоступны — продолжаем
  }

  // ── Пульс (пер-замер) ───────────────────────────────────────────────────────
  try {
    const hrResult = await readRecords('HeartRate', { timeRangeFilter });
    heartRateReadings = hrResult.records.length;
    for (const record of hrResult.records) {
      for (const sample of record.samples) {
        vitals.push({
          type: 'heart_rate',
          value: { bpm: sample.beatsPerMinute },
          recorded_at: new Date(sample.time).toISOString(),
          source: 'health_connect',
        });
      }
    }
  } catch {
    // пульс недоступен — продолжаем
  }

  // ── SpO2 (пер-замер) ────────────────────────────────────────────────────────
  try {
    const r = await readRecords('OxygenSaturation', { timeRangeFilter });
    for (const rec of r.records) {
      vitals.push({
        type: 'spo2',
        value: { percentage: rec.percentage },
        recorded_at: new Date(rec.time).toISOString(),
        source: 'health_connect',
      });
    }
  } catch {
    // SpO2 недоступен — продолжаем
  }

  // ── Пульс покоя (пер-замер) ─────────────────────────────────────────────────
  try {
    const r = await readRecords('RestingHeartRate', { timeRangeFilter });
    for (const rec of r.records) {
      vitals.push({
        type: 'resting_heart_rate',
        value: { bpm: rec.beatsPerMinute },
        recorded_at: new Date(rec.time).toISOString(),
        source: 'health_connect',
      });
    }
  } catch {
    // пульс покоя недоступен — продолжаем
  }

  // ── Сон (сумма минут всех сессий за день) ───────────────────────────────────
  try {
    const r = await readRecords('SleepSession', { timeRangeFilter });
    if (r.records.length > 0) {
      const minutes = r.records.reduce((sum, rec) => {
        const ms = new Date(rec.endTime).getTime() - new Date(rec.startTime).getTime();
        return sum + Math.max(0, ms / 60000);
      }, 0);
      if (minutes > 0) {
        vitals.push({ type: 'sleep', value: { minutes: Math.round(minutes) }, recorded_at: endTime, source: 'health_connect' });
      }
    }
  } catch {
    // сон недоступен — продолжаем
  }

  // ── Калории всего (агрегат за день, kcal) ───────────────────────────────────
  try {
    const r = await readRecords('TotalCaloriesBurned', { timeRangeFilter });
    if (r.records.length > 0) {
      const kcal = r.records.reduce((sum, rec) => sum + rec.energy.inKilocalories, 0);
      if (kcal > 0) {
        vitals.push({ type: 'calories', value: { kcal: Math.round(kcal) }, recorded_at: endTime, source: 'health_connect' });
      }
    }
  } catch {
    // калории недоступны — продолжаем
  }

  // ── Активные калории (агрегат за день, kcal) ────────────────────────────────
  try {
    const r = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
    if (r.records.length > 0) {
      const kcal = r.records.reduce((sum, rec) => sum + rec.energy.inKilocalories, 0);
      if (kcal > 0) {
        vitals.push({ type: 'active_calories', value: { kcal: Math.round(kcal) }, recorded_at: endTime, source: 'health_connect' });
      }
    }
  } catch {
    // активные калории недоступны — продолжаем
  }

  // ── Дистанция (агрегат за день, метры) ──────────────────────────────────────
  try {
    const r = await readRecords('Distance', { timeRangeFilter });
    if (r.records.length > 0) {
      const meters = r.records.reduce((sum, rec) => sum + rec.distance.inMeters, 0);
      if (meters > 0) {
        vitals.push({ type: 'distance', value: { meters: Math.round(meters) }, recorded_at: endTime, source: 'health_connect' });
      }
    }
  } catch {
    // дистанция недоступна — продолжаем
  }

  if (vitals.length === 0) {
    return { status: 'ready', synced: { steps: null, heartRateReadings: 0 } };
  }

  // 5. Отправляем на API. Авторизация — сессионная cookie WebView (X-Aivita-Session).
  const token = await getSessionToken();
  if (!token) {
    // нет сессии — пользователь не авторизован, молча пропускаем
    return { status: 'ready', synced: { steps: totalSteps, heartRateReadings } };
  }

  try {
    const response = await fetch(`${API_URL}/v1/aivita/vitals/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Aivita-Session': token,
      },
      body: JSON.stringify({ vitals }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { status: 'error', error: `API ${response.status}: ${text}` };
    }
  } catch (e) {
    return { status: 'error', error: String(e) };
  }

  return { status: 'ready', synced: { steps: totalSteps, heartRateReadings } };
}
