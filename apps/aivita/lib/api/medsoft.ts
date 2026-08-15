/**
 * Клиент для запросов к MedSoft API из приложения Aivita.
 */

export interface AivitaService {
    id: string;
    name: string;
    price: number;
    duration_min?: number;
}

export interface AivitaDoctorProfile {
    id: string;
    full_name: string;
    specialization?: string;
    photo_url?: string;
    description?: string;
    education?: string;
    languages?: string[];
    experience_years?: number;
    consultation_price: number;
    rating: number;
    total_reviews: number;
    services: AivitaService[];
}

export interface AivitaClinicProfile {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    description?: string;
    logo_url?: string;
    website_url?: string;
    instagram_url?: string;
    telegram_url?: string;
    latitude?: number;
    longitude?: number;
    working_hours?: any;
}

export interface AivitaTimeSlot {
    start_time: string;
    end_time: string;
    is_available: boolean;
}

export interface AivitaScheduleDay {
    date: string;
    slots: AivitaTimeSlot[];
}

export interface AivitaBookingRequest {
    doctor_id: string;
    patient_phone: string;
    patient_first_name: string;
    patient_last_name?: string;
    scheduled_at: string;
    complaint?: string;
    is_first_visit: boolean;
}

export interface AivitaBookingResponse {
    appointment_id: string;
    status: string;
    scheduled_at: string;
    message: string;
}

const MEDSOFT_API_URL = process.env.NEXT_PUBLIC_MEDSOFT_API_URL || 'http://localhost:8000/api/v1';
const AIVITA_API_KEY = process.env.NEXT_PUBLIC_AIVITA_API_KEY || 'test_api_key'; // Получается при модерации

/**
 * Базовый fetcher с заголовками авторизации
 */
async function fetchMedsoft<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${MEDSOFT_API_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Aivita-API-Key': AIVITA_API_KEY,
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`MedSoft API Error (${response.status}): ${errorBody}`);
  }
  
  return response.json();
}

/**
 * Получить список врачей конкретной клиники
 */
export async function getDoctors(clinicId: string): Promise<AivitaDoctorProfile[]> {
  return fetchMedsoft<AivitaDoctorProfile[]>(`/aivita/clinics/${clinicId}/doctors`);
}

/**
 * Получить профиль клиники
 */
export async function getClinicProfile(clinicId: string): Promise<AivitaClinicProfile> {
  return fetchMedsoft<AivitaClinicProfile>(`/aivita/clinics/${clinicId}`);
}

/**
 * Получить расписание врача
 */
export async function getDoctorSchedule(clinicId: string, doctorId: string, startDate: string, endDate: string): Promise<AivitaScheduleDay[]> {
  return fetchMedsoft<AivitaScheduleDay[]>(`/aivita/clinics/${clinicId}/doctors/${doctorId}/schedule?start_date=${startDate}&end_date=${endDate}`);
}

/**
 * Создать запись на прием
 */
export async function bookAppointment(clinicId: string, data: AivitaBookingRequest): Promise<AivitaBookingResponse> {
  return fetchMedsoft<AivitaBookingResponse>(`/aivita/clinics/${clinicId}/appointments`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
