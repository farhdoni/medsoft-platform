/**
 * Domain types — shared between client (page components) and server
 * (API routes / future backend). Keep this file as the single source
 * of truth for what the API returns.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitial: string;
  locale: "ru" | "uz" | "en";
}

export interface DailyMetrics {
  heartRate: { bpm: number; deltaWeek: number };
  water: { liters: number; goalLiters: number };
  steps: { count: number; deltaPctWeek: number };
  habits: { completed: number; total: number };
  healthIndex: { score: number; label: string };
}

export interface ActivityPoint {
  day: "Пн" | "Вт" | "Ср" | "Чт" | "Пт" | "Сб" | "Вс";
  steps: number;
  km: number;
  sleepHours: number;
}

export interface Report {
  id: string;
  title: string;
  body: string;
  pdfUrl: string;
  generatedAt: string; // ISO
}

export type ChatPrompt = "Анализы" | "Сон" | "Питание" | "Тренировки";
