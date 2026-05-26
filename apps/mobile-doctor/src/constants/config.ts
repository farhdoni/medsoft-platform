declare const __DEV__: boolean;

export type AppScreen = 'splash' | 'onboarding' | 'login' | 'main';

const WEB_URL = __DEV__ ? 'http://localhost:3001' : 'https://app.aivita.uz';

export const API_URL = __DEV__ ? 'http://localhost:4000' : 'https://api.aivita.uz';
export const DOCTOR_HOME = `${WEB_URL}/ru/doctor-home`;
export const DOCTOR_LOGIN = `${WEB_URL}/ru/doctor-login`;

export const TOKEN_KEY = 'doctor_token';
export const ONBOARDING_KEY = 'doctor_onboarding_done';

export const COLORS = {
  primaryBlue: '#5580b0',
  accentBlue: '#6BA3D6',
  white: '#ffffff',
  background: '#f5f8fc',
  textPrimary: '#1a2540',
  textSecondary: '#5a6a80',
  textMuted: '#9aaabb',
  borderSoft: '#dde8f0',
};
