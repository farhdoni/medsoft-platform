/**
 * Чистый расчёт слотов напоминаний о лекарствах (без БД и побочных эффектов) —
 * выделен из push-reminders.ts ради unit-тестов на DST/края.
 *
 * Семантика окна для каждого времени приёма "HH:mm" (в tz пользователя):
 *   - впереди:  0 … minutesBefore+1 мин до приёма  → обычное напоминание;
 *   - позади:   до catchupMin мин ПОСЛЕ приёма     → «напоминание с задержкой»
 *               (bounded catch-up: рестарт/простой сервиса ≤ catchupMin не теряет
 *               слот; более старые слоты НЕ реанимируются — медбезопасность);
 *   - кандидаты строятся на [сегодня, завтра] в tz пользователя — иначе слот
 *     в первые минуты суток (напр. 00:05) не виден тику, бегущему в 23:5x.
 *
 * DST: конвертация локального времени в UTC — через date-fns-tz fromZonedTime
 * по IANA-зоне (не фикс-оффсет): несуществующие времена spring-forward и
 * двойные времена fall-back разрешаются детерминированно по правилам зоны.
 */

import { fromZonedTime } from 'date-fns-tz';
import { safeTimezone } from './timezone.js';

export interface FireCandidate {
  /** Календарная дата слота в tz пользователя (YYYY-MM-DD) — ключ дедупа. */
  fireDate: string;
  /** "HH:mm" из medication_schedule.times — вторая часть ключа дедупа. */
  time: string;
  /** Момент приёма в UTC. */
  scheduledUtc: Date;
  /** true = слот уже прошёл (попал в catch-up): текст «с задержкой». */
  late: boolean;
}

/** Календарная дата (YYYY-MM-DD) момента `nowUtc + dayOffset суток` в зоне tz. */
export function localDateInTz(nowUtc: Date, tz: string, dayOffset = 0): string {
  // sv-SE всегда форматирует как YYYY-MM-DD
  return new Intl.DateTimeFormat('sv-SE', { timeZone: tz })
    .format(new Date(nowUtc.getTime() + dayOffset * 86_400_000));
}

export interface ComputeOptions {
  times: string[];
  /** IANA-зона пользователя; null/мусор → safeTimezone() подставит дефолт. */
  tz: string | null | undefined;
  nowUtc: Date;
  minutesBefore: number;
  /** Сколько минут назад слот ещё догоняем (bounded catch-up). */
  catchupMin: number;
  /** Календарные границы курса (даты в tz пользователя), как в схеме. */
  startDate?: string | null;
  endDate?: string | null;
}

export function computeFireCandidates(opts: ComputeOptions): FireCandidate[] {
  const tz = safeTimezone(opts.tz);
  const out: FireCandidate[] = [];

  // [сегодня, завтра] в tz пользователя — закрывает полуночный край
  for (const dayOffset of [0, 1] as const) {
    const fireDate = localDateInTz(opts.nowUtc, tz, dayOffset);
    if (opts.startDate && fireDate < opts.startDate) continue;
    if (opts.endDate && fireDate > opts.endDate) continue;

    for (const time of opts.times) {
      if (!/^\d{2}:\d{2}$/.test(time)) continue; // мусор в times[] пропускаем

      const scheduledUtc = fromZonedTime(`${fireDate}T${time}:00`, tz);
      const diffMin = (scheduledUtc.getTime() - opts.nowUtc.getTime()) / 60_000;

      if (diffMin > opts.minutesBefore + 1) continue; // ещё рано
      if (diffMin < -opts.catchupMin) continue;       // слишком поздно — не реанимируем

      out.push({ fireDate, time, scheduledUtc, late: diffMin < 0 });
    }
  }
  return out;
}
