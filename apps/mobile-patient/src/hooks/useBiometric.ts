import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { isBiometricEnabled, setBiometricEnabled } from '../services/auth';

export type BiometricResult = 'ok' | 'failed' | 'not_supported' | 'not_enrolled';

export function useBiometric() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled]   = useState(false);
  const [isEnabled, setIsEnabled]     = useState(false);

  useEffect(() => {
    async function load() {
      const [hardware, enrolled, enabled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        isBiometricEnabled(),
      ]);
      setIsSupported(hardware);
      setIsEnrolled(enrolled);
      setIsEnabled(enabled);
    }
    load().catch(() => {});
  }, []);

  const authenticate = useCallback(async (): Promise<BiometricResult> => {
    if (!isSupported) return 'not_supported';
    if (!isEnrolled)  return 'not_enrolled';
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Войдите в AIVITA',
      cancelLabel:   'Отмена',
      fallbackLabel: 'Пароль',
    });
    return result.success ? 'ok' : 'failed';
  }, [isSupported, isEnrolled]);

  /** Runs biometric prompt first — only enables flag on success. */
  const enable = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !isEnrolled) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Подтвердите отпечаток для включения биометрии',
      cancelLabel:   'Отмена',
      fallbackLabel: 'Пароль',
    });
    if (!result.success) return false;
    await setBiometricEnabled(true);
    setIsEnabled(true);
    return true;
  }, [isSupported, isEnrolled]);

  const disable = useCallback(async (): Promise<void> => {
    await setBiometricEnabled(false);
    setIsEnabled(false);
  }, []);

  return { isSupported, isEnrolled, isEnabled, authenticate, enable, disable };
}
