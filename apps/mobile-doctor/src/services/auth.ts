import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY, API_URL } from '../constants/config';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/v1/aivita/auth/me`, {
      headers: { 'X-Aivita-Session': token },
    });
    return res.ok;
  } catch {
    return false;
  }
}
