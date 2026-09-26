// Pure logic behind the Soft 3D home's state selection (Part C) — extracted
// so the priority order and its two data-sufficiency edge cases are directly
// unit-testable, matching the same extraction pattern as survey-banner-logic.ts
// in this same folder.

// ─── State selection ─────────────────────────────────────────────────────────
//
// Priority order as decided: врач ответил > на паузе > пустой > с диагнозом >
// здоровый > тихий день. "Пустой" = no medical card at all; "на паузе" = a
// card exists but the 4-stage roadmap (see onboarding-progress.ts on the API
// side) isn't all done yet. Written in that literal order (rather than
// collapsing empty/paused into one branch) so the priority stays legible even
// though the two conditions happen to be mutually exclusive by construction.

export type HomeState = 'reply' | 'paused' | 'empty' | 'diagnosis' | 'healthy' | 'quiet';

export interface HomeStateInput {
  doctorReplyUnread: boolean;
  hasCard: boolean;
  /** 0-4, from getOnboardingProgress() on the API side. */
  stagesDone: number;
  hasChronicConditions: boolean;
  /** YYYY-MM-DD, or null if no lab result exists at all. */
  lastLabResultDate: string | null;
  now?: Date;
}

// "После сорока это делают раз в год" (HomeHealthy copy) — once-a-year
// screening cadence. 11 months (not 12) so the nudge appears a little before
// the year is actually up, rather than only once it's overdue.
export const LAB_DUE_MONTHS = 11;
const AVG_DAYS_PER_MONTH = 30.44;

export function monthsSince(dateStr: string, now: Date): number {
  const then = new Date(`${dateStr}T00:00:00Z`).getTime();
  const diffDays = (now.getTime() - then) / (1000 * 60 * 60 * 24);
  return diffDays / AVG_DAYS_PER_MONTH;
}

/**
 * Distinguishes "healthy" (a preventive-care nudge is due) from "quiet"
 * (nothing to say). Per decision #2: with no lab date recorded at all, don't
 * state a timeframe — surface the soft prompt instead, which is still the
 * "healthy" state's own layout, just with a different body than the
 * months-since-N figure.
 */
export function isScreeningDue(lastLabResultDate: string | null, now: Date): boolean {
  if (!lastLabResultDate) return true;
  return monthsSince(lastLabResultDate, now) >= LAB_DUE_MONTHS;
}

export interface OnboardingStages {
  questionnaire: boolean;
  checkup: boolean;
  gadgets: boolean;
  documents: boolean;
}

/**
 * The "paused" state's next-step CTA: first incomplete stage in roadmap
 * order. Questionnaire is never returned here — the "paused" state itself
 * requires hasCard (questionnaire done), so it's not a real "next step" to
 * point at even if the caller passes stale/inconsistent stage data.
 */
export function nextIncompleteStage(stages: OnboardingStages): 'checkup' | 'gadgets' | 'documents' | null {
  if (!stages.checkup) return 'checkup';
  if (!stages.gadgets) return 'gadgets';
  if (!stages.documents) return 'documents';
  return null;
}

export function selectHomeState(input: HomeStateInput): HomeState {
  if (input.doctorReplyUnread) return 'reply';
  if (input.hasCard && input.stagesDone < 4) return 'paused';
  if (!input.hasCard) return 'empty';
  if (input.hasChronicConditions) return 'diagnosis';
  const now = input.now ?? new Date();
  if (isScreeningDue(input.lastLabResultDate, now)) return 'healthy';
  return 'quiet';
}

// ─── Health score: null (never calculated) vs a genuine 0 ──────────────────
//
// data.ts's existing `apiHealthScore?.totalScore ?? 0` collapses "no score
// row exists yet" into a real score of 0, then reads that 0 as "нет данных"
// — coincidentally right for a freshly-onboarded account (no row → label
// reads "no data"), but wrong the moment a real computed score legitimately
// lands at 0. Kept as a separate, explicitly-null-checked path for the Soft
// 3D home rather than patched in data.ts, since the old page's output must
// stay byte-for-byte unchanged (see home/soft3d-data.ts's own comment).

export interface HealthScoreInfo {
  total: number;
  calculatedAt: string;
}

export interface HealthScoreDisplay {
  hasScore: boolean;
  total?: number;
  label?: string;
}

export function healthScoreDisplay(score: HealthScoreInfo | null): HealthScoreDisplay {
  if (score === null) return { hasScore: false };
  const { total } = score;
  const label = total >= 80 ? 'отлично' : total >= 60 ? 'хорошо' : 'требует внимания';
  return { hasScore: true, total, label };
}

// ─── "Quiet day" trend: enough points, spread across the window ────────────
//
// Decision #5: only assert "ровно" (steady) over the 90-day window when
// there's enough data AND it's actually distributed across the period — 4
// same-week readings shouldn't be read as "three months steady". Proposed
// minimums: at least 4 points, spanning at least 45 days (half the 90-day
// window) between the earliest and latest — both must hold.

export const TREND_MIN_POINTS = 4;
export const TREND_MIN_SPAN_DAYS = 45;

export interface TrendPoint {
  /** YYYY-MM-DD or a full ISO timestamp — only the calendar date is used. */
  date: string;
}

export function hasEnoughDataForTrend(points: TrendPoint[]): boolean {
  if (points.length < TREND_MIN_POINTS) return false;
  const times = points.map((p) => new Date(p.date).getTime()).sort((a, b) => a - b);
  const spanDays = (times[times.length - 1] - times[0]) / (1000 * 60 * 60 * 24);
  return spanDays >= TREND_MIN_SPAN_DAYS;
}

export interface WeightPoint extends TrendPoint {
  kg: number;
}

/** Below this, a change reads as measurement noise rather than a real trend. */
const WEIGHT_TREND_NOISE_FLOOR_KG = 2;

export type WeightTrend = { kind: 'unknown' } | { kind: 'steady' } | { kind: 'change'; deltaKg: number };

/**
 * Earliest-vs-latest weight change over the window, gated by the same
 * hasEnoughDataForTrend() sufficiency check — never claims "steady" or a
 * delta from too few/too clustered readings.
 */
export function weightTrend(points: WeightPoint[]): WeightTrend {
  if (!hasEnoughDataForTrend(points)) return { kind: 'unknown' };
  const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const deltaKg = sorted[sorted.length - 1].kg - sorted[0].kg;
  if (Math.abs(deltaKg) < WEIGHT_TREND_NOISE_FLOOR_KG) return { kind: 'steady' };
  return { kind: 'change', deltaKg };
}

// ─── Simple normal-range labels (Diagnosis/Reply stat rows) ─────────────────
//
// Standard, widely-taught clinical cutoffs (not a specific dose-response
// claim like the pressure-delta threshold, so not separately cited): a
// systolic/diastolic reading at or above 140/90 is the conventional
// hypertension threshold; under 7h is short sleep for an adult; a resting
// pulse of 60–100 bpm is the typical adult reference range.

export type RangeLabel = 'low' | 'normal' | 'high';

const HYPERTENSION_SYSTOLIC = 140;
const HYPERTENSION_DIASTOLIC = 90;

export function bloodPressureLabel(systolic: number, diastolic: number): RangeLabel {
  return systolic >= HYPERTENSION_SYSTOLIC || diastolic >= HYPERTENSION_DIASTOLIC ? 'high' : 'normal';
}

export function pulseLabel(bpm: number): RangeLabel {
  if (bpm < 60) return 'low';
  if (bpm > 100) return 'high';
  return 'normal';
}

const SHORT_SLEEP_HOURS = 7;

export function sleepLabel(hours: number): RangeLabel {
  return hours < SHORT_SLEEP_HOURS ? 'low' : 'normal';
}

// ─── Time-of-day greeting ────────────────────────────────────────────────────

export type GreetingKey = 'morning' | 'day' | 'evening' | 'night';

/** hour: 0–23, in the viewer's own local time (not the server's). */
export function greetingKeyForHour(hour: number): GreetingKey {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'day';
  if (hour >= 18 && hour <= 22) return 'evening';
  return 'night';
}

// ─── "N minutes/hours/days ago" (Reply's sender line) ───────────────────────

export type RelativeTimeUnit = 'minutes' | 'hours' | 'days';
export interface RelativeTime {
  unit: RelativeTimeUnit;
  value: number;
}

export function relativeTimeSince(sentAtIso: string, now: Date): RelativeTime {
  const diffMs = Math.max(0, now.getTime() - new Date(sentAtIso).getTime());
  const minutes = Math.round(diffMs / (60 * 1000));
  if (minutes < 60) return { unit: 'minutes', value: Math.max(1, minutes) };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { unit: 'hours', value: hours };
  const days = Math.round(hours / 24);
  return { unit: 'days', value: days };
}
