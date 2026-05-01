/**
 * Lightweight API client for the aivita backend.
 * Works both server-side (Node) and client-side (browser).
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

type RequestOptions = {
  method?: string;
  body?: unknown;
  sessionCookie?: string; // for server-side calls
};

export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<{ data: T } | { error: string }> {
  const { method = 'GET', body, sessionCookie } = opts;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (sessionCookie) {
    headers['Cookie'] = `aivita_session=${sessionCookie}`;
  }

  try {
    const res = await fetch(`${API_BASE}/v1/aivita${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      next: { revalidate: 0 }, // no cache
    });

    const json = await res.json();
    return json;
  } catch {
    return { error: 'Network error' };
  }
}

// ─── Typed helpers ──────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (data: { email: string; nickname: string; password: string; name?: string; locale?: string }) =>
      apiRequest('/auth/register', { method: 'POST', body: data }),
    verifyEmail: (data: { userId: string; code: string }) =>
      apiRequest('/auth/verify-email', { method: 'POST', body: data }),
    resendCode: (userId: string) =>
      apiRequest('/auth/resend-code', { method: 'POST', body: { userId } }),
    login: (data: { identifier: string; password: string }) =>
      apiRequest('/auth/login', { method: 'POST', body: data }),
    forgotPassword: (email: string) =>
      apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (data: { token: string; password: string }) =>
      apiRequest('/auth/reset-password', { method: 'POST', body: data }),
    completeOnboarding: (cookie: string) =>
      apiRequest('/auth/complete-onboarding', { method: 'POST', sessionCookie: cookie }),
  },
  users: {
    me: (cookie: string) =>
      apiRequest('/users', { sessionCookie: cookie }),
    update: (data: unknown, cookie: string) =>
      apiRequest('/users', { method: 'PATCH', body: data, sessionCookie: cookie }),
  },
  healthScore: {
    latest: (cookie: string) =>
      apiRequest('/health-score', { sessionCookie: cookie }),
    history: (cookie: string) =>
      apiRequest('/health-score/history', { sessionCookie: cookie }),
    calculate: (cookie: string) =>
      apiRequest('/health-score/calculate', { method: 'POST', sessionCookie: cookie }),
    vitals: (cookie: string, params?: string) =>
      apiRequest(`/health-score/vitals${params ? '?' + params : ''}`, { sessionCookie: cookie }),
    addVital: (data: unknown, cookie: string) =>
      apiRequest('/health-score/vitals', { method: 'POST', body: data, sessionCookie: cookie }),
  },
  habits: {
    list: (cookie?: string) =>
      apiRequest('/habits', { sessionCookie: cookie }),
    create: (data: unknown, cookie?: string) =>
      apiRequest('/habits', { method: 'POST', body: data, sessionCookie: cookie }),
    log: (habitId: string, data: unknown, cookie?: string) =>
      apiRequest(`/habits/${habitId}/logs`, { method: 'POST', body: data, sessionCookie: cookie }),
    todayLogs: (date: string, cookie?: string) =>
      apiRequest(`/habits/logs/range?from=${date}&to=${date}`, { sessionCookie: cookie }),
  },
  nutrition: {
    summary: (cookie: string, date?: string) =>
      apiRequest(`/nutrition/summary${date ? '?date=' + date : ''}`, { sessionCookie: cookie }),
    list: (cookie: string, params?: string) =>
      apiRequest(`/nutrition${params ? '?' + params : ''}`, { sessionCookie: cookie }),
    addMeal: (data: unknown, cookie: string) =>
      apiRequest('/nutrition', { method: 'POST', body: data, sessionCookie: cookie }),
  },
  chat: {
    sessions: (cookie: string) =>
      apiRequest('/chat/sessions', { sessionCookie: cookie }),
    createSession: (cookie: string) =>
      apiRequest('/chat/sessions', { method: 'POST', body: {}, sessionCookie: cookie }),
    sendMessage: (sessionId: string, data: unknown, cookie: string) =>
      apiRequest(`/chat/sessions/${sessionId}/messages`, { method: 'POST', body: data, sessionCookie: cookie }),
  },
  notifications: {
    list: (cookie: string) =>
      apiRequest('/notifications', { sessionCookie: cookie }),
    readAll: (cookie: string) =>
      apiRequest('/notifications/read-all', { method: 'POST', sessionCookie: cookie }),
  },
  reports: {
    list: (cookie: string) =>
      apiRequest('/reports', { sessionCookie: cookie }),
    generate: (cookie: string) =>
      apiRequest('/reports/generate', { method: 'POST', sessionCookie: cookie }),
  },
  family: {
    list: (cookie: string) =>
      apiRequest('/family', { sessionCookie: cookie }),
    create: (data: unknown, cookie: string) =>
      apiRequest('/family', { method: 'POST', body: data, sessionCookie: cookie }),
  },
  healthProfile: {
    get: (cookie: string) =>
      apiRequest('/health-profile', { sessionCookie: cookie }),
    allergies: (cookie: string) =>
      apiRequest('/health-profile/allergies', { sessionCookie: cookie }),
    chronic: (cookie: string) =>
      apiRequest('/health-profile/chronic-conditions', { sessionCookie: cookie }),
    history: (cookie: string) =>
      apiRequest('/health-profile/medical-history', { sessionCookie: cookie }),
  },
};
