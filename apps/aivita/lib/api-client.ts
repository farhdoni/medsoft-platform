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
    // Forward as aivita_api — the API-signed JWT that api.aivita.uz can verify
    // with its own SESSION_SECRET (avoids SESSION_SECRET mismatch between containers)
    headers['Cookie'] = `aivita_api=${sessionCookie}`;
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
    medications: (cookie: string) =>
      apiRequest('/health-profile/medications', { sessionCookie: cookie }),
  },
  medications: {
    list: (cookie: string) =>
      apiRequest('/medications', { sessionCookie: cookie }),
    today: (cookie: string) =>
      apiRequest('/medications/today', { sessionCookie: cookie }),
    stats: (cookie: string, period = 'week') =>
      apiRequest(`/medications/stats?period=${period}`, { sessionCookie: cookie }),
  },
  vitals: {
    latest: (cookie: string) =>
      apiRequest('/vitals/latest', { sessionCookie: cookie }),
    list: (cookie: string, params?: string) =>
      apiRequest(`/vitals${params ? '?' + params : ''}`, { sessionCookie: cookie }),
    stats: (cookie: string, type: string, period = 'week') =>
      apiRequest(`/vitals/stats?type=${type}&period=${period}`, { sessionCookie: cookie }),
    add: (data: unknown, cookie: string) =>
      apiRequest('/vitals', { method: 'POST', body: data, sessionCookie: cookie }),
    batch: (entries: unknown[], cookie: string) =>
      apiRequest('/vitals/batch', { method: 'POST', body: { entries }, sessionCookie: cookie }),
    remove: (id: string, cookie: string) =>
      apiRequest(`/vitals/${id}`, { method: 'DELETE', sessionCookie: cookie }),
  },
  devices: {
    list: (cookie: string) =>
      apiRequest('/devices', { sessionCookie: cookie }),
    catalog: (cookie: string) =>
      apiRequest('/devices/catalog', { sessionCookie: cookie }),
    connect: (data: unknown, cookie: string) =>
      apiRequest('/devices', { method: 'POST', body: data, sessionCookie: cookie }),
    sync: (id: string, cookie: string) =>
      apiRequest(`/devices/${id}/sync`, { method: 'POST', sessionCookie: cookie }),
    disconnect: (id: string, cookie: string) =>
      apiRequest(`/devices/${id}`, { method: 'DELETE', sessionCookie: cookie }),
  },
  onboarding: {
    status: (cookie: string) =>
      apiRequest('/onboarding/status', { sessionCookie: cookie }),
    step: (step: number, data: Record<string, unknown>, cookie: string) =>
      apiRequest('/onboarding/step', { method: 'POST', body: { step, data }, sessionCookie: cookie }),
    medicalCard: (cookie: string) =>
      apiRequest('/onboarding/medical-card', { sessionCookie: cookie }),
  },
  doctor: {
    profile: (cookie?: string) =>
      apiRequest('/doctor/profile', { sessionCookie: cookie }),
    updateProfile: (data: unknown, cookie?: string) =>
      apiRequest('/doctor/profile', { method: 'PUT', body: data, sessionCookie: cookie }),
    completion: (cookie?: string) =>
      apiRequest('/doctor/profile/completion', { sessionCookie: cookie }),
    addCertificate: (data: unknown, cookie?: string) =>
      apiRequest('/doctor/profile/certificates', { method: 'POST', body: data, sessionCookie: cookie }),
    deleteCertificate: (index: number, cookie?: string) =>
      apiRequest(`/doctor/profile/certificates/${index}`, { method: 'DELETE', sessionCookie: cookie }),

    patients: (cookie?: string, params?: string) =>
      apiRequest(`/doctor/patients${params ? '?' + params : ''}`, { sessionCookie: cookie }),
    patient: (id: string, cookie?: string) =>
      apiRequest(`/doctor/patients/${id}`, { sessionCookie: cookie }),
    patientTimeline: (id: string, cookie?: string, limit = 20) =>
      apiRequest(`/doctor/patients/${id}/timeline?limit=${limit}`, { sessionCookie: cookie }),
    acceptPatient: (patientId: string, cookie?: string) =>
      apiRequest('/doctor/patients/accept', { method: 'POST', body: { patientId }, sessionCookie: cookie }),
    archivePatient: (patientId: string, cookie?: string) =>
      apiRequest('/doctor/patients/archive', { method: 'POST', body: { patientId }, sessionCookie: cookie }),
    updatePatientNotes: (id: string, notes: string, cookie?: string) =>
      apiRequest(`/doctor/patients/${id}/notes`, { method: 'PUT', body: { notes }, sessionCookie: cookie }),

    schedule: (cookie?: string) =>
      apiRequest('/doctor/schedule', { sessionCookie: cookie }),
    updateSchedule: (data: unknown, cookie?: string) =>
      apiRequest('/doctor/schedule', { method: 'PUT', body: data, sessionCookie: cookie }),
    slots: (doctorId: string, date: string) =>
      apiRequest(`/doctor/schedule/slots?doctorId=${doctorId}&date=${date}`),

    appointments: (cookie?: string, params?: string) =>
      apiRequest(`/doctor/appointments${params ? '?' + params : ''}`, { sessionCookie: cookie }),
    upcoming: (cookie?: string) =>
      apiRequest('/doctor/appointments/upcoming', { sessionCookie: cookie }),
    createAppointment: (data: unknown, cookie?: string) =>
      apiRequest('/doctor/appointments', { method: 'POST', body: data, sessionCookie: cookie }),
    updateAppointment: (id: string, data: unknown, cookie?: string) =>
      apiRequest(`/doctor/appointments/${id}`, { method: 'PUT', body: data, sessionCookie: cookie }),
    completeAppointment: (id: string, data: unknown, cookie?: string) =>
      apiRequest(`/doctor/appointments/${id}/complete`, { method: 'PUT', body: data, sessionCookie: cookie }),

    prescriptions: (cookie?: string, params?: string) =>
      apiRequest(`/doctor/prescriptions${params ? '?' + params : ''}`, { sessionCookie: cookie }),
    createPrescription: (data: unknown, cookie?: string) =>
      apiRequest('/doctor/prescriptions', { method: 'POST', body: data, sessionCookie: cookie }),
    updatePrescription: (id: string, data: unknown, cookie?: string) =>
      apiRequest(`/doctor/prescriptions/${id}`, { method: 'PUT', body: data, sessionCookie: cookie }),

    templates: (cookie?: string) =>
      apiRequest('/doctor/templates', { sessionCookie: cookie }),
    createTemplate: (data: unknown, cookie?: string) =>
      apiRequest('/doctor/templates', { method: 'POST', body: data, sessionCookie: cookie }),

    notes: (cookie?: string, patientId?: string) =>
      apiRequest(`/doctor/notes${patientId ? '?patientId=' + patientId : ''}`, { sessionCookie: cookie }),
    addNote: (data: unknown, cookie?: string) =>
      apiRequest('/doctor/notes', { method: 'POST', body: data, sessionCookie: cookie }),
    deleteNote: (id: string, cookie?: string) =>
      apiRequest(`/doctor/notes/${id}`, { method: 'DELETE', sessionCookie: cookie }),

    notifications: (cookie?: string, unread?: boolean) =>
      apiRequest(`/doctor/notifications${unread ? '?unread=true' : ''}`, { sessionCookie: cookie }),
    markNotifRead: (id: string, cookie?: string) =>
      apiRequest(`/doctor/notifications/${id}/read`, { method: 'PUT', sessionCookie: cookie }),
    markAllRead: (cookie?: string) =>
      apiRequest('/doctor/notifications/read-all', { method: 'PUT', sessionCookie: cookie }),

    stats: (cookie?: string) =>
      apiRequest('/doctor/stats', { sessionCookie: cookie }),
    monthlyStats: (cookie?: string) =>
      apiRequest('/doctor/stats/monthly', { sessionCookie: cookie }),

    reviews: (doctorId: string) =>
      apiRequest(`/doctor/reviews/doctor/${doctorId}`),
  },
};
