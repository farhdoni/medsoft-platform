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
import { sendDiagLog } from './notifications';

// ─── Read types we sync ─────────────────────────────────────────────────────────

type HcReadType =
  | 'Steps'
  | 'HeartRate'
  | 'OxygenSaturation'
  | 'SleepSession'
  | 'TotalCaloriesBurned'
  | 'ActiveCaloriesBurned'
  | 'Distance'
  | 'RestingHeartRate';

const READ_TYPES: HcReadType[] = [
  'Steps', 'HeartRate', 'OxygenSaturation',
  'SleepSession', 'TotalCaloriesBurned', 'ActiveCaloriesBurned', 'Distance', 'RestingHeartRate',
];
const READ_PERMISSIONS = READ_TYPES.map((recordType) => ({ accessType: 'read' as const, recordType }));

async function grantedReadTypes(): Promise<Set<string>> {
  const granted = await getGrantedPermissions();
  return new Set(
    granted
      .filter((p: { accessType: string }) => p.accessType === 'read')
      .map((p: { recordType: string }) => p.recordType),
  );
}

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
  const granted = await grantedReadTypes();
  return granted.has('Steps');
}

/**
 * Безопасная проверка наличия грантов (минимум — шаги). В отличие от
 * hasPermissionsUnsafe сама делает initialize и не бросает наружу. Вызывать
 * только после checkAvailability()==='ready'. Используется для пере-эмита
 * состояния «Подключён» при возврате приложения в foreground.
 */
export async function hasHcPermissions(): Promise<boolean> {
  try {
    await initialize();
    const granted = await grantedReadTypes();
    return granted.has('Steps');
  } catch {
    return false;
  }
}

/**
 * Инициализирует SDK и запрашивает разрешения на чтение Steps + HeartRate +
 * OxygenSaturation. Показывает системный диалог — вызывать только если
 * checkAvailability()==='ready' и только по явному действию пользователя.
 * Если часть типов не выдана — пере-запрашиваем недостающие один раз, чтобы
 * отказ по пульсу/SpO2 не выглядел как «всё ок».
 */
export async function requestPermissions(): Promise<boolean> {
  const availability = await checkAvailability();
  if (availability !== 'ready') return false;
  try {
    await initialize();
    await requestPermission(READ_PERMISSIONS);
    let granted = await grantedReadTypes();
    const missing = READ_TYPES.filter((t) => !granted.has(t));
    if (missing.length > 0) {
      await requestPermission(missing.map((recordType) => ({ accessType: 'read' as const, recordType })));
      granted = await grantedReadTypes();
    }
    void sendDiagLog('hc-permissions', { granted: [...granted], missing: READ_TYPES.filter((t) => !granted.has(t)) });
    // Базовый минимум — шаги; без них подключение бессмысленно.
    return granted.has('Steps');
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

  // SleepSession — сумма минут всех сессий за день.
  try {
    const sleepResult = await readRecords('SleepSession', { timeRangeFilter });
    let totalMinutes = 0;
    for (const r of sleepResult.records) {
      totalMinutes += Math.round(
        (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000,
      );
    }
    if (totalMinutes > 0) {
      vitals.push({ type: 'sleep', value: { minutes: totalMinutes }, recorded_at: endTime, source: 'health_connect' });
    }
  } catch {
    // SleepSession недоступен — продолжаем
  }

  // TotalCaloriesBurned — сумма всех сегментов.
  // readRecords возвращает EnergyResult с готовым inKilocalories.
  try {
    const calResult = await readRecords('TotalCaloriesBurned', { timeRangeFilter });
    let totalKcal = 0;
    for (const r of calResult.records) totalKcal += r.energy.inKilocalories;
    if (totalKcal > 0) {
      vitals.push({ type: 'calories', value: { kcal: Math.round(totalKcal) }, recorded_at: endTime, source: 'health_connect' });
    }
  } catch {
    // TotalCaloriesBurned недоступен — продолжаем
  }

  // ActiveCaloriesBurned — активные калории (без базального метаболизма).
  try {
    const activeCalResult = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
    let totalKcal = 0;
    for (const r of activeCalResult.records) totalKcal += r.energy.inKilocalories;
    if (totalKcal > 0) {
      vitals.push({ type: 'active_calories', value: { kcal: Math.round(totalKcal) }, recorded_at: endTime, source: 'health_connect' });
    }
  } catch {
    // ActiveCaloriesBurned недоступен — продолжаем
  }

  // Distance — сумма за день. readRecords возвращает LengthResult с inKilometers.
  try {
    const distResult = await readRecords('Distance', { timeRangeFilter });
    let totalKm = 0;
    for (const r of distResult.records) totalKm += r.distance.inKilometers;
    if (totalKm > 0) {
      vitals.push({ type: 'distance', value: { km: parseFloat(totalKm.toFixed(2)) }, recorded_at: endTime, source: 'health_connect' });
    }
  } catch {
    // Distance недоступен — продолжаем
  }

  // RestingHeartRate — пульс покоя (мгновенный замер, не агрегат).
  try {
    const rhrResult = await readRecords('RestingHeartRate', { timeRangeFilter });
    for (const r of rhrResult.records) {
      vitals.push({
        type: 'resting_heart_rate',
        value: { bpm: r.beatsPerMinute },
        recorded_at: new Date(r.time).toISOString(),
        source: 'health_connect',
      });
    }
  } catch {
    // RestingHeartRate недоступен — продолжаем
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
      void sendDiagLog('hc-batch', { ok: false, status: response.status });
      return { status: 'error', error: `API ${response.status}: ${text}` };
    }
    void sendDiagLog('hc-batch', { ok: true, steps: totalSteps, hr: heartRateReadings, items: vitals.length });

    // Персистим статус подключения на сервере тем же X-Aivita-Session, чтобы
    // карточка «Подключён» восстанавливалась и при старт-синке — не полагаясь
    // на веб-инжект после системного диалога. (#23/#24 апсертят user_devices.)
    await fetch(`${API_URL}/v1/aivita/vitals/hc-sync-state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Aivita-Session': token },
      body: JSON.stringify({ hcChangesToken: null, hcLastSyncAt: new Date().toISOString() }),
    })
      .then((r) => sendDiagLog('hc-persist-put', { ok: r.ok, status: r.status }))
      .catch((e) => sendDiagLog('hc-persist-put', { ok: false, error: String(e) }));
  } catch (e) {
    return { status: 'error', error: String(e) };
  }

  return { status: 'ready', synced: { steps: totalSteps, heartRateReadings } };
}
