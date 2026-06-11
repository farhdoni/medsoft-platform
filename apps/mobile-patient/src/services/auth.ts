import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const BIOMETRIC_KEY = 'biometric_enabled';

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveAuthToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(BIOMETRIC_KEY);
  return val === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_KEY, '1');
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  }
}
