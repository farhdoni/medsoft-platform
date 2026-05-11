// Shared types for legacy cabinet mobile components

export interface User {
  name: string;
  avatarInitial: string;
  avatarUrl?: string;
}

export interface DailyMetrics {
  healthIndex: {
    score: number;
    label: string;
  };
  heartRate: {
    bpm: number;
    deltaWeek: number;
  };
  water: {
    liters: number;
    goalLiters: number;
  };
  steps: {
    count: number;
    deltaPctWeek: number;
  };
  habits: {
    completed: number;
    total: number;
  };
}
