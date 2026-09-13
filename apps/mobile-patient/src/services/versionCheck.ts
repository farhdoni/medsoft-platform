import Constants from 'expo-constants';
import { API_URL } from '../constants/config';

export interface AppVersionInfo {
  latestVersionCode: number;
  latestVersionName: string;
  downloadUrl: string;
  minVersionCode: number;
}

const FETCH_TIMEOUT_MS = 5000;

// Read from the build's own Expo config rather than adding expo-application:
// this app ships no OTA updates (no expo-updates dependency), so
// Constants.expoConfig is the same app.json baked into the APK at build
// time — it can't drift from what's actually installed the way it could
// on a project using EAS Update. expo-constants is already a dependency
// used elsewhere (src/services/analytics.ts, notifications.ts), so this
// needs no new native module / no expo prebuild.
export function getCurrentVersionCode(): number {
  return Constants.expoConfig?.android?.versionCode ?? 0;
}

export function getCurrentVersionName(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

// Silent by design: an offline device or an unreachable API must never
// surface an error to the user here — just skip the banner for this check.
export async function fetchLatestAppVersion(): Promise<AppVersionInfo | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/v1/app-version`, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as AppVersionInfo;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
