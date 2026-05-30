import * as SecureStore from 'expo-secure-store';
import { API_URL, TOKEN_KEY } from './constants';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function authFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['X-Aivita-Session'] = token;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    throw new ApiError(401, 'UNAUTHORIZED');
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (json as any).error ?? (json as any).message ?? `HTTP ${res.status}`);
  }

  const json = await res.json();
  return ((json as any).data ?? json) as T;
}
