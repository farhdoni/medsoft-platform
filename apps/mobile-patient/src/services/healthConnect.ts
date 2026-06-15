import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { API_URL } from '../constants/config';
import { getSessionToken } from './auth';

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

// ─── Internal helpers ─────────────────────────────────────────────────────────

function todayBounds(): { startTime: string; endTime: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return {
    startTime: start.toISOString(),
    endTime: now.toISOString(),
  };
}

// Сессионный токен (cookie → X-Aivita-Session) переиспользуется из ./auth.

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
 * Инициализирует SDK и запрашивает разрешения READ_STEPS + READ_HEART_RATE
 * + READ_OXYGEN_SATURATION. Показывает системный диалог — вызывать только если
 * checkAvailability()==='ready' и только по явному действию пользователя.
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
    ]);
    return granted.some((p: { recordType: string }) => p.recordType === 'Steps');
  } catch {
    return false;
  }
}

/**
 * Читает шаги и пульс за текущие сутки из Health Connect,
 * отправляет в /v1/aivita/vitals/batch, возвращает результат.
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

  // Формируем батч-записи для API
  const vitals: Array<{
    type: string;
    value: unknown;
    recorded_at: string;
    source: 'health_connect';
  }> = [];

  try {
    const stepsResult = await readRecords('Steps', { timeRangeFilter });
    if (stepsResult.records.length > 0) {
      totalSteps = stepsResult.records.reduce((sum: number, r: { count: number }) => sum + r.count, 0);
      vitals.push({
        type: 'steps',
        value: { count: totalSteps },
        recorded_at: endTime,
        source: 'health_connect',
      });
    }
  } catch {
    // шаги недоступны — продолжаем
  }

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

  // SpO2 (пер-замер). API нормализует { percentage } → { value, unit:'%' }.
  try {
    const spo2Result = await readRecords('OxygenSaturation', { timeRangeFilter });
    for (const record of spo2Result.records) {
      vitals.push({
        type: 'spo2',
        value: { percentage: record.percentage },
        recorded_at: new Date(record.time).toISOString(),
        source: 'health_connect',
      });
    }
  } catch {
    // SpO2 недоступен — продолжаем
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
