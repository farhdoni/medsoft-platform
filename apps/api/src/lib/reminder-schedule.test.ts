/**
 * Unit-тесты расчёта слотов напоминаний: DST-границы, невалидная tz,
 * полуночный край, bounded catch-up. Чистая функция — без БД и сети.
 */

import { describe, it, expect } from 'vitest';
import { computeFireCandidates, localDateInTz } from './reminder-schedule.js';

const base = { minutesBefore: 5, catchupMin: 30 };

describe('computeFireCandidates — базовое окно', () => {
  it('слот впереди в окне 0…minutesBefore+1 → кандидат, late=false', () => {
    // 07:55 Ташкент (02:55Z), слот 08:00 → 5 мин впереди
    const out = computeFireCandidates({
      ...base, times: ['08:00'], tz: 'Asia/Tashkent',
      nowUtc: new Date('2026-06-12T02:55:00Z'),
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ fireDate: '2026-06-12', time: '08:00', late: false });
    expect(out[0].scheduledUtc.toISOString()).toBe('2026-06-12T03:00:00.000Z');
  });

  it('слот дальше окна впереди → пусто', () => {
    const out = computeFireCandidates({
      ...base, times: ['08:00'], tz: 'Asia/Tashkent',
      nowUtc: new Date('2026-06-12T02:30:00Z'), // за 30 мин
    });
    expect(out).toHaveLength(0);
  });

  it('границы курса: дата вне startDate/endDate отсекается', () => {
    const out = computeFireCandidates({
      ...base, times: ['08:00'], tz: 'Asia/Tashkent',
      nowUtc: new Date('2026-06-12T02:55:00Z'),
      endDate: '2026-06-11',
    });
    expect(out).toHaveLength(0);
  });

  it('мусор в times[] пропускается, валидные обрабатываются', () => {
    const out = computeFireCandidates({
      ...base, times: ['8am', '', '08:00'], tz: 'Asia/Tashkent',
      nowUtc: new Date('2026-06-12T02:55:00Z'),
    });
    expect(out.map((c) => c.time)).toEqual(['08:00']);
  });
});

describe('bounded catch-up (A)', () => {
  it('слот 20 мин назад → кандидат с late=true', () => {
    const out = computeFireCandidates({
      ...base, times: ['08:00'], tz: 'Asia/Tashkent',
      nowUtc: new Date('2026-06-12T03:20:00Z'), // 08:20 Ташкент
    });
    expect(out).toHaveLength(1);
    expect(out[0].late).toBe(true);
  });

  it('слот 40 мин назад (за пределом catchupMin=30) → НЕ реанимируется', () => {
    const out = computeFireCandidates({
      ...base, times: ['08:00'], tz: 'Asia/Tashkent',
      nowUtc: new Date('2026-06-12T03:40:00Z'),
    });
    expect(out).toHaveLength(0);
  });
});

describe('полуночный край (B): кандидаты [сегодня, завтра]', () => {
  it('23:59:30 Ташкент видит завтрашний слот 00:05 (за 5.5 мин)', () => {
    // 2026-06-12T18:59:30Z = 23:59:30 Ташкент 12.06; слот 00:05 13.06 = 19:05Z
    const out = computeFireCandidates({
      ...base, times: ['00:05'], tz: 'Asia/Tashkent',
      nowUtc: new Date('2026-06-12T18:59:30Z'),
    });
    // сегодняшний 00:05 (12.06) просрочен на ~24ч → отсечён catch-up'ом,
    // завтрашний (13.06) — впереди на 5.5 мин → кандидат
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ fireDate: '2026-06-13', time: '00:05', late: false });
    expect(out[0].scheduledUtc.toISOString()).toBe('2026-06-12T19:05:00.000Z');
  });

  it('один и тот же слот не дублируется между сегодня/завтра', () => {
    const out = computeFireCandidates({
      ...base, times: ['12:00'], tz: 'Asia/Tashkent',
      nowUtc: new Date('2026-06-12T06:56:00Z'), // 11:56 — слот 12:00 сегодня
    });
    expect(out).toHaveLength(1);
    expect(out[0].fireDate).toBe('2026-06-12');
  });
});

describe('DST (D): Europe/Berlin', () => {
  // Контракт зафиксирован по фактическому поведению date-fns-tz@3:
  // несуществующее время резолвится «как будто старый оффсет ещё действует»,
  // двойное — вторым вхождением (пост-переходный оффсет). Если апгрейд
  // библиотеки изменит политику — эти тесты сломаются ОСОЗНАННО.

  // Весна 2026: ночь на 29 марта, 02:00 → 03:00 (02:30 не существует)
  it('spring-forward: несуществующее 02:30 → детерминированный валидный момент (00:30Z)', () => {
    const out = computeFireCandidates({
      ...base, times: ['02:30'], tz: 'Europe/Berlin',
      nowUtc: new Date('2026-03-29T00:27:00Z'), // за 3 мин до резолвнутого момента
    });
    expect(out).toHaveLength(1);
    expect(out[0].late).toBe(false);
    expect(out[0].scheduledUtc.toISOString()).toBe('2026-03-29T00:30:00.000Z');
  });

  // Осень 2026: 25 октября, 03:00 → 02:00 (02:30 существует дважды)
  it('fall-back: двойное 02:30 → стабильно второе вхождение (CET, 01:30Z)', () => {
    const run = () => computeFireCandidates({
      ...base, times: ['02:30'], tz: 'Europe/Berlin',
      nowUtc: new Date('2026-10-25T01:27:00Z'),
    });
    const a = run();
    const b = run();
    expect(a).toHaveLength(1);
    expect(a[0].scheduledUtc.toISOString()).toBe('2026-10-25T01:30:00.000Z');
    expect(a[0].scheduledUtc.getTime()).toBe(b[0].scheduledUtc.getTime()); // детерминизм
  });

  it('обычный день Berlin: 08:00 CEST = 06:00Z', () => {
    const out = computeFireCandidates({
      ...base, times: ['08:00'], tz: 'Europe/Berlin',
      nowUtc: new Date('2026-06-12T05:55:00Z'),
    });
    expect(out[0].scheduledUtc.toISOString()).toBe('2026-06-12T06:00:00.000Z');
  });
});

describe('невалидная tz → дефолт Asia/Tashkent', () => {
  it('мусорная зона ведёт себя как Ташкент (UTC+5)', () => {
    const good = computeFireCandidates({
      ...base, times: ['08:00'], tz: 'Asia/Tashkent',
      nowUtc: new Date('2026-06-12T02:55:00Z'),
    });
    const bad = computeFireCandidates({
      ...base, times: ['08:00'], tz: 'Krasnodar/Invalid',
      nowUtc: new Date('2026-06-12T02:55:00Z'),
    });
    expect(bad).toHaveLength(1);
    expect(bad[0].scheduledUtc.getTime()).toBe(good[0].scheduledUtc.getTime());
  });

  it('null/undefined tz → дефолт, без исключений', () => {
    for (const tz of [null, undefined]) {
      const out = computeFireCandidates({
        ...base, times: ['08:00'], tz,
        nowUtc: new Date('2026-06-12T02:55:00Z'),
      });
      expect(out).toHaveLength(1);
    }
  });
});

describe('localDateInTz', () => {
  it('дата меняется на границе суток зоны, а не UTC', () => {
    const now = new Date('2026-06-12T20:30:00Z'); // 01:30 13.06 Ташкент
    expect(localDateInTz(now, 'Asia/Tashkent')).toBe('2026-06-13');
    expect(localDateInTz(now, 'Europe/Berlin')).toBe('2026-06-12');
    expect(localDateInTz(now, 'Asia/Tashkent', 1)).toBe('2026-06-14');
  });
});
