export interface VitalRow {
  id: string;
  userId: string;
  type: string;
  value: Record<string, unknown>;
  source: string;
  recordedAt: string;
  createdAt: string;
}

export type LatestVitals = Record<string, VitalRow | null>;
