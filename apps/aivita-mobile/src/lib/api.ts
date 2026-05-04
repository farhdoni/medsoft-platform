import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3001';
const TOKEN_KEY = 'aivita_mobile_token';

// ─── Token storage ────────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function deleteToken(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

type ApiResponse<T> = { data: T } | { error: string };

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['X-Aivita-Session'] = token;

  const res = await fetch(`${BASE_URL}/v1/aivita${path}`, {
    ...options,
    headers,
  });

  const json = await res.json();
  return json as ApiResponse<T>;
}

export function isOk<T>(res: ApiResponse<T>): res is { data: T } {
  return 'data' in res;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type MobileUser = {
  id: string;
  email: string;
  name: string;
  onboardingCompleted: boolean;
};

export async function mobileSignIn(
  identifier: string,
  password: string,
): Promise<{ token: string; user: MobileUser }> {
  const res = await fetch(`${BASE_URL}/v1/aivita/auth/mobile-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? 'login_failed');
  }

  const body = await res.json() as { data: { token: string; user: MobileUser } };
  return body.data;
}

// ─── Typed API helpers ────────────────────────────────────────────────────────

export const api = {
  users: {
    me: () => apiRequest<Record<string, unknown>>('/users/me'),
  },
  healthProfile: {
    get: () => apiRequest<Record<string, unknown>>('/health-profile'),
    allergies: () => apiRequest<unknown[]>('/health-profile/allergies'),
    chronic: () => apiRequest<unknown[]>('/health-profile/chronic'),
    history: () => apiRequest<unknown[]>('/health-profile/history'),
    update: (data: Record<string, unknown>) =>
      apiRequest('/health-profile', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  habits: {
    list: () => apiRequest<unknown[]>('/habits'),
    todayLogs: () => apiRequest<unknown[]>('/habits/logs/today'),
    log: (habitId: string, date: string) =>
      apiRequest('/habits/log', { method: 'POST', body: JSON.stringify({ habitId, date }) }),
  },
  nutrition: {
    summary: (date: string) => apiRequest<unknown>(`/nutrition/summary?date=${date}`),
    meals: (date: string) => apiRequest<unknown[]>(`/nutrition/meals?date=${date}`),
  },
  healthScore: {
    latest: () => apiRequest<unknown>('/health-score/latest'),
    vitals: (query: string) => apiRequest<unknown[]>(`/health-score/vitals?${query}`),
  },
  chat: {
    list: () => apiRequest<unknown[]>('/chat/sessions'),
    create: () => apiRequest<unknown>('/chat/sessions', { method: 'POST', body: JSON.stringify({}) }),
    messages: (sessionId: string) => apiRequest<unknown[]>(`/chat/sessions/${sessionId}/messages`),
  },
  family: {
    list: () => apiRequest<unknown[]>('/family'),
  },
  notifications: {
    list: () => apiRequest<unknown[]>('/notifications'),
    readAll: () => apiRequest('/notifications/read-all', { method: 'POST' }),
  },
  reports: {
    list: () => apiRequest<unknown[]>('/reports'),
    generate: () => apiRequest('/reports/generate', { method: 'POST' }),
  },
  deviceTokens: {
    register: (pushToken: string) =>
      apiRequest('/device-tokens', { method: 'POST', body: JSON.stringify({ pushToken, platform: 'android' }) }),
    unregister: (pushToken: string) =>
      apiRequest('/device-tokens', { method: 'DELETE', body: JSON.stringify({ pushToken }) }),
  },
};
