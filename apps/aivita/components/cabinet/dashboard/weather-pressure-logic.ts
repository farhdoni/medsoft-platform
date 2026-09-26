// Pure 24h barometric-pressure-delta calculation, pulled out of
// WeatherCard.tsx so it's directly unit-testable without a DOM/fetch mock.
//
// Threshold: ≥6 hPa change in 24 hours. A Japanese cohort study of migraine
// sufferers found attacks clustered when pressure fell 6–10 hPa within a day
// (Sato et al., https://pmc.ncbi.nlm.nih.gov/articles/PMC4684554/); German
// biometeorology health sources put the point where migraine frequency
// starts rising significantly at around 5 hPa. 6 hPa sits at the low end of
// the cited peak-frequency range, just above that "starts to matter" point —
// approved by the user 2026-09-26.
//
// The cited studies are specifically about pressure DROPS. This generalizes
// to an absolute delta (either direction) to match the requested wording
// ("резкая смена давления" — a sharp *swing*, not "a sharp drop"), which is
// also how the design mockups themselves phrase it. Disclosed here rather
// than silently narrowed or broadened.
export const PRESSURE_DELTA_THRESHOLD_HPA = 6;

// Open-Meteo returns hourly data covering the requested `past_days` window;
// entries are in the location's local time (timezone=auto), not UTC.
export interface HourlyPressure {
  time: string[];
  surface_pressure: number[];
}

// If the hourly series doesn't actually reach back this far (e.g. the API
// returned less history than requested), treat "24h ago" as unknown rather
// than silently comparing against the wrong hour.
const MAX_MATCH_SLOP_MS = 90 * 60 * 1000;

/**
 * currentPressure vs. the hourly reading closest to 24h before `nowIso`.
 * Returns null when there isn't enough historical data to answer honestly.
 */
export function pressureDelta24h(
  hourly: HourlyPressure | null | undefined,
  nowIso: string,
  currentPressure: number,
): number | null {
  if (!hourly || hourly.time.length === 0) return null;
  const targetMs = new Date(nowIso).getTime() - 24 * 60 * 60 * 1000;

  let closestIdx = -1;
  let closestDiff = Infinity;
  for (let i = 0; i < hourly.time.length; i++) {
    const diff = Math.abs(new Date(hourly.time[i]).getTime() - targetMs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIdx = i;
    }
  }
  if (closestIdx === -1 || closestDiff > MAX_MATCH_SLOP_MS) return null;

  const past = hourly.surface_pressure[closestIdx];
  if (typeof past !== 'number' || Number.isNaN(past)) return null;

  return currentPressure - past;
}

export function isSharpPressureSwing(delta: number | null): boolean {
  return delta !== null && Math.abs(delta) >= PRESSURE_DELTA_THRESHOLD_HPA;
}
