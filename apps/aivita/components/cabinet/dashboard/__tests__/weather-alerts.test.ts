import { describe, expect, it } from 'vitest';
import { buildAlerts } from '../WeatherCard';

describe('buildAlerts — pressure-swing warning is flag-gated', () => {
  it('never appears when pressureSwing is false, regardless of other conditions', () => {
    const alerts = buildAlerts(9, 30, 5, false); // worst-case UV/air/Kp, still no pressure entry
    expect(alerts.some((a) => a.text === 'Резкая смена давления')).toBe(false);
  });

  it('appears when pressureSwing is true', () => {
    const alerts = buildAlerts(0, 0, 0, true);
    expect(alerts.some((a) => a.text === 'Резкая смена давления')).toBe(true);
  });

  it('is unaffected by UV/air/Kp — a calm day with a pressure swing still gets exactly one alert', () => {
    const alerts = buildAlerts(0, 0, 0, true);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('warn');
  });
});
