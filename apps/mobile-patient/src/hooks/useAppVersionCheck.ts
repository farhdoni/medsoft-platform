import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  fetchLatestAppVersion,
  getCurrentVersionCode,
  type AppVersionInfo,
} from '../services/versionCheck';

// Soft update banner (variant A): checks on launch and again on every
// foreground return, but never re-nags for a version the user already
// dismissed in this session — dismissedCode is in-memory state, so a full
// app restart (new session) is the only thing that resets it. minVersionCode
// is read but intentionally unused here; it's the hook point for a future
// forced-update screen, not wired to anything blocking yet.
export function useAppVersionCheck() {
  const [info, setInfo] = useState<AppVersionInfo | null>(null);
  const [dismissedCode, setDismissedCode] = useState<number | null>(null);

  const check = useCallback(async () => {
    const latest = await fetchLatestAppVersion();
    if (!latest) return;
    if (latest.latestVersionCode > getCurrentVersionCode()) {
      setInfo(latest);
    }
  }, []);

  useEffect(() => {
    check();
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') check();
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [check]);

  const dismiss = useCallback(() => {
    if (info) setDismissedCode(info.latestVersionCode);
  }, [info]);

  return {
    updateInfo: info,
    visible: !!info && info.latestVersionCode !== dismissedCode,
    dismiss,
  };
}
