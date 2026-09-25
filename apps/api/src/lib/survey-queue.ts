import { db } from '@medsoft/db';
import { surveyPrompts, healthProfiles, allergies, chronicConditions, medications } from '@medsoft/db';
import { eq, and, isNull } from 'drizzle-orm';
import { localDateInTz } from './reminder-schedule.js';
import { parseDateBoundary, DEFAULT_TIMEZONE } from './timezone.js';

// ─── Config (Слой 1, Шаг 1 — MVP) ────────────────────────────────────────────
//
// Shared across both channels because both read/write the same survey_prompts
// table — there is no separate per-channel state to reconcile.
export const SURVEY_DAILY_LIMIT = 3;
export const SURVEY_SKIP_COOLDOWN_DAYS = 7;

export type SurveyChannel = 'banner' | 'chat';
export type SurveyStatus = 'shown' | 'skipped' | 'answered';

// Deliberately NOT dietType/nutritionType or sleepSchedule/sleepHoursPerNight
// (each pair has two live, divergent writers — picking one is Step 3 of the
// Layer 1 plan, not this MVP) and no "goal"/cycle fields (no column exists
// for either yet). 'medications' and 'chronicDiseases' are the survey's own
// names for the medications/chronic_conditions tables — kept distinct from
// the DB's own column/table names since this key is also the public API
// contract for the (future) chat channel.
//
// Part B (2026-09-25): the onboarding ladder was trimmed to sex/age/height/
// weight only — everything else it used to collect (emergency contact,
// chronic/allergies/medications, phone/city, lifestyle, doctor info) now
// lands here instead, in this priority order (SOS-critical first, then
// anamnesis, then the rest): emergency contact phone and blood type first
// (both feed the SOS flow), then gender (right after blood type — the
// women's-cycle feature and reference norms both depend on it), then
// chronic/allergies/medications, then the original heightCm/weightKg/
// lifestyle set (still asked here too, as a fallback for accounts that
// skipped or never reached that step in onboarding), then the lowest-
// priority profile fields at the end.
export const SURVEY_FIELD_PRIORITY = [
  'emergencyContactPhone',
  'bloodType',
  'gender',
  'chronicDiseases',
  'allergies',
  'medications',
  'heightCm',
  'weightKg',
  'phone',
  'city',
  'smokingStatus',
  'alcohol',
  'activity',
  'doctorName',
  'clinic',
] as const;

export type SurveyField = (typeof SURVEY_FIELD_PRIORITY)[number];

export function isSurveyField(value: string): value is SurveyField {
  return (SURVEY_FIELD_PRIORITY as readonly string[]).includes(value);
}

// ─── i18n copy ────────────────────────────────────────────────────────────────

type Locale = 'ru' | 'uz' | 'en';
type LocalizedText = Record<Locale, string>;

export type SurveyFieldType = 'enum' | 'number' | 'list' | 'blood_type' | 'medications_special' | 'text';

export interface SurveyFieldDef {
  field: SurveyField;
  type: SurveyFieldType;
  question: LocalizedText;
  why: LocalizedText;
  options?: Array<{ value: string; label: LocalizedText }>;
}

// Enum option sets reuse the exact RU/UZ/EN labels already shipped in
// messages/{ru,uz,en}.json's lifestyle.{smoking,alcohol,activity} dictionaries
// (fixed for gender agreement earlier) — not a new, fourth vocabulary for the
// same values. `smokingStatus`/`alcoholFrequency`/`exerciseFrequency` use
// ProfileClient's own 4-value option sets specifically (never/quit/sometimes/
// regular; never/rarely/moderate/regular; sedentary/light/moderate/active),
// so a survey answer always matches what the profile edit screen itself would
// have written for the same field.
export const SURVEY_FIELD_DEFS: Record<SurveyField, SurveyFieldDef> = {
  emergencyContactPhone: {
    field: 'emergencyContactPhone',
    type: 'text',
    question: {
      ru: 'Кому позвонить, если случится экстренная ситуация?',
      uz: "Favqulodda vaziyat yuz bersa, kimga qo'ng'iroq qilish kerak?",
      en: 'Who should we call in an emergency?',
    },
    why: {
      ru: 'Это нужно для SOS — без номера мы не сможем оповестить ваших близких.',
      uz: "Bu SOS uchun kerak — raqamsiz yaqinlaringizga xabar bera olmaymiz.",
      en: 'This powers SOS — without a number we can’t alert anyone for you.',
    },
  },
  gender: {
    field: 'gender',
    type: 'enum',
    question: {
      ru: 'Укажите ваш пол',
      uz: 'Jinsingizni ko‘rsating',
      en: 'What is your sex?',
    },
    why: {
      ru: 'Это влияет на нормы показателей и открывает женский календарь.',
      uz: "Bu ko'rsatkichlar me'yoriga ta'sir qiladi va ayollar kalendarini ochadi.",
      en: 'This affects reference norms and unlocks the women’s cycle calendar.',
    },
    options: [
      { value: 'male', label: { ru: 'Мужской', uz: 'Erkak', en: 'Male' } },
      { value: 'female', label: { ru: 'Женский', uz: 'Ayol', en: 'Female' } },
    ],
  },
  allergies: {
    field: 'allergies',
    type: 'list',
    question: {
      ru: 'Есть ли у вас аллергии на лекарства или продукты?',
      uz: 'Sizda dorilarga yoki taomlarga allergiya bormi?',
      en: 'Do you have any allergies to medications or food?',
    },
    why: {
      ru: 'Это критично: без этого AI может посоветовать то, что вам противопоказано.',
      uz: "Bu juda muhim: buni bilmasak, AI sizga zararli narsani tavsiya qilib qo'yishi mumkin.",
      en: 'This is critical — without it, the AI might recommend something unsafe for you.',
    },
  },
  medications: {
    field: 'medications',
    type: 'medications_special',
    question: {
      ru: 'Принимаете ли вы сейчас какие-нибудь лекарства?',
      uz: 'Hozir doimiy dori-darmon qabul qilasizmi?',
      en: 'Are you currently taking any medications?',
    },
    why: {
      ru: 'Так AI сможет проверять совместимость лекарств и давать точные советы.',
      uz: 'Shunda AI dorilarning bir-biriga mosligini tekshira oladi va aniqroq maslahat beradi.',
      en: 'This lets the AI check drug interactions and give more accurate advice.',
    },
  },
  chronicDiseases: {
    field: 'chronicDiseases',
    type: 'list',
    question: {
      ru: 'Есть ли у вас хронические заболевания?',
      uz: 'Sizda surunkali kasalliklar bormi?',
      en: 'Do you have any chronic health conditions?',
    },
    why: {
      ru: 'Это влияет на то, какие советы будут для вас безопасными.',
      uz: "Bu sizga qaysi maslahatlar xavfsiz ekanligiga ta'sir qiladi.",
      en: 'This affects which advice is safe for you.',
    },
  },
  heightCm: {
    field: 'heightCm',
    type: 'number',
    question: {
      ru: 'Подскажите свой рост в сантиметрах?',
      uz: "Bo'yingiz necha santimetr?",
      en: 'What is your height in centimeters?',
    },
    why: {
      ru: 'Рост нужен, чтобы точно рассчитать ИМТ.',
      uz: "Bo'y ИМТни aniq hisoblash uchun kerak.",
      en: 'Height is needed to calculate your BMI accurately.',
    },
  },
  weightKg: {
    field: 'weightKg',
    type: 'number',
    question: {
      ru: 'А какой у вас вес в килограммах?',
      uz: 'Vazningiz necha kilogramm?',
      en: 'And what is your weight in kilograms?',
    },
    why: {
      ru: 'Вес поможет отслеживать динамику и точнее считать ИМТ.',
      uz: 'Vazn dinamikani kuzatish va ИМТни aniq hisoblash uchun kerak.',
      en: 'Weight helps track your trends and calculate BMI accurately.',
    },
  },
  bloodType: {
    field: 'bloodType',
    type: 'blood_type',
    question: {
      ru: 'Знаете свою группу крови?',
      uz: 'Qon guruhingizni bilasizmi?',
      en: 'Do you know your blood type?',
    },
    why: {
      ru: 'Это может понадобиться в экстренной ситуации.',
      uz: "Bu favqulodda vaziyatda kerak bo'lishi mumkin.",
      en: 'This could matter in an emergency.',
    },
    options: (['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const).map((v) => ({
      value: v,
      label: { ru: v, uz: v, en: v }, // displayed via formatBloodType client-side, not this raw label
    })),
  },
  smokingStatus: {
    field: 'smokingStatus',
    type: 'enum',
    question: {
      ru: 'Курите ли вы?',
      uz: 'Chekasizmi?',
      en: 'Do you smoke?',
    },
    why: {
      ru: 'Это важно для оценки рисков для здоровья.',
      uz: "Bu sog'liq xavfini baholash uchun muhim.",
      en: 'This matters for assessing health risks.',
    },
    options: [
      { value: 'never', label: { ru: 'Не курю', uz: 'Hech qachon', en: 'Never' } },
      { value: 'quit', label: { ru: 'Бросил(а)', uz: 'Tashladim', en: 'Quit' } },
      { value: 'sometimes', label: { ru: 'Иногда', uz: "Ba'zan", en: 'Sometimes' } },
      { value: 'regular', label: { ru: 'Регулярно', uz: 'Doimiy', en: 'Regularly' } },
    ],
  },
  alcohol: {
    field: 'alcohol',
    type: 'enum',
    question: {
      ru: 'Как часто вы употребляете алкоголь?',
      uz: 'Spirtli ichimliklarni qanchalik tez-tez ichasiz?',
      en: 'How often do you drink alcohol?',
    },
    why: {
      ru: 'Это поможет точнее понять ваш образ жизни.',
      uz: 'Bu turmush tarzingizni aniqroq tushunishga yordam beradi.',
      en: 'This helps understand your lifestyle more accurately.',
    },
    options: [
      { value: 'never', label: { ru: 'Не употребляю', uz: 'Hech qachon', en: 'Never' } },
      { value: 'rarely', label: { ru: 'Редко', uz: 'Kamdan-kam', en: 'Rarely' } },
      { value: 'moderate', label: { ru: 'Умеренно', uz: "O'rtacha", en: 'Moderately' } },
      { value: 'regular', label: { ru: 'Регулярно', uz: 'Doimiy', en: 'Regularly' } },
    ],
  },
  activity: {
    field: 'activity',
    type: 'enum',
    question: {
      ru: 'Насколько вы физически активны?',
      uz: 'Jismoniy faolligingiz qanday?',
      en: 'How physically active are you?',
    },
    why: {
      ru: 'Активность влияет на многие рекомендации по здоровью.',
      uz: "Faollik darajasi ko'p sog'liq tavsiyalariga ta'sir qiladi.",
      en: 'Activity level affects many health recommendations.',
    },
    options: [
      { value: 'sedentary', label: { ru: 'Малоактивный', uz: 'Kam harakat', en: 'Sedentary' } },
      { value: 'light', label: { ru: 'Лёгкая активность', uz: 'Yengil faollik', en: 'Light activity' } },
      { value: 'moderate', label: { ru: 'Умеренная активность', uz: "O'rtacha faollik", en: 'Moderate activity' } },
      { value: 'active', label: { ru: 'Высокая активность', uz: 'Yuqori faollik', en: 'High activity' } },
    ],
  },
  phone: {
    field: 'phone',
    type: 'text',
    question: {
      ru: 'Ваш номер телефона?',
      uz: 'Telefon raqamingiz?',
      en: 'What is your phone number?',
    },
    why: {
      ru: 'Понадобится, если врач или клиника захотят связаться с вами напрямую.',
      uz: "Shifokor yoki klinika siz bilan to'g'ridan-to'g'ri bog'lanmoqchi bo'lsa kerak bo'ladi.",
      en: 'Needed if a doctor or clinic wants to reach you directly.',
    },
  },
  city: {
    field: 'city',
    type: 'text',
    question: {
      ru: 'В каком городе вы находитесь?',
      uz: 'Qaysi shaharda yashaysiz?',
      en: 'Which city are you in?',
    },
    why: {
      ru: 'Поможет подобрать клиники и врачей рядом с вами.',
      uz: "Yaqiningizdagi klinika va shifokorlarni tanlashga yordam beradi.",
      en: 'Helps us suggest clinics and doctors near you.',
    },
  },
  doctorName: {
    field: 'doctorName',
    type: 'text',
    question: {
      ru: 'Как зовут вашего лечащего врача?',
      uz: 'Shifokoringizning ismi kim?',
      en: 'What is your doctor’s name?',
    },
    why: {
      ru: 'Так карту можно будет быстро показать именно вашему врачу.',
      uz: "Shunda kartani aynan shifokoringizga tezda ko'rsatish mumkin bo'ladi.",
      en: 'Makes it easy to share your card with the right doctor.',
    },
  },
  clinic: {
    field: 'clinic',
    type: 'text',
    question: {
      ru: 'В какой клинике вы обычно наблюдаетесь?',
      uz: "Odatda qaysi klinikada kuzatuvdasiz?",
      en: 'Which clinic do you usually go to?',
    },
    why: {
      ru: 'Пригодится, если понадобится быстро найти вашу историю болезни.',
      uz: "Kasallik tarixingizni tezda topish kerak bo'lganda foydali bo'ladi.",
      en: 'Useful if we ever need to quickly find your medical history.',
    },
  },
};

// ─── Blood type: parse flexible input into the canonical 'A+'/'O-'/... form ──
//
// Mirrors packages/shared/src/health/blood-type.ts's own letter/Rh extraction
// (extractLetter/extractRhSign aren't exported — only the display formatter
// is), but this needs the canonical STORAGE shape, not the display string.
const BLOOD_LETTER_RE = /^(AB|A|B|O)/i;
export function canonicalizeBloodType(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  const letter = BLOOD_LETTER_RE.exec(trimmed)?.[1];
  if (!letter) return null;
  const sign = trimmed.includes('+') ? '+' : /[-−–]/.test(trimmed) ? '-' : null;
  if (!sign) return null;
  return `${letter}${sign}`;
}

// ─── Answer bounds — pure, matches the Step 1 spec's strict-validation ask ──

export const HEIGHT_CM_MIN = 50;
export const HEIGHT_CM_MAX = 250;
export const WEIGHT_KG_MIN = 20;
export const WEIGHT_KG_MAX = 300;

export function isValidHeightCm(n: number): boolean {
  return Number.isFinite(n) && n >= HEIGHT_CM_MIN && n <= HEIGHT_CM_MAX;
}

export function isValidWeightKg(n: number): boolean {
  return Number.isFinite(n) && n >= WEIGHT_KG_MIN && n <= WEIGHT_KG_MAX;
}

export function isValidEnumAnswer(field: SurveyField, value: string): boolean {
  const options = SURVEY_FIELD_DEFS[field].options;
  if (!options) return false;
  return options.some((o) => o.value === value);
}

// ─── Day boundary (Asia/Tashkent, not UTC) ──────────────────────────────────

export function startOfTodayTashkent(now: Date = new Date()): Date {
  const todayStr = localDateInTz(now, DEFAULT_TIMEZONE);
  return parseDateBoundary(todayStr, DEFAULT_TIMEZONE);
}

// ─── Pure decision logic (no DB I/O, no wall-clock reads) — unit-testable ───

export interface SurveyEvent {
  field: SurveyField;
  status: SurveyStatus;
  createdAt: Date;
}

export type FilledState = Record<SurveyField, boolean>;

export interface PickResult {
  field: SurveyField;
  /** true: caller should insert a new 'shown' row. false: idempotent re-ask of an already-shown-today field — no insert. */
  isNew: boolean;
}

/**
 * Picks the next field to ask about, or null if there's nothing left to ask
 * today. Pure: takes the full event history, current filled/empty state per
 * field, and both time references as plain inputs — no DB access, no
 * `new Date()` inside. Rules (Layer 1 Step 1 spec):
 *  - a field already 'shown' today with no later answer/skip today is
 *    returned as-is (idempotent re-fetch, e.g. banner re-render on reload);
 *  - otherwise, once SURVEY_DAILY_LIMIT distinct fields have been shown
 *    today (any channel), nothing more is offered;
 *  - a field is skipped entirely if: it has ever been 'answered' (covers
 *    "no allergies"/"not taking anything"/"don't know my blood type", which
 *    write only the event, not table data), OR real data already exists for
 *    it (`filled[field]`), OR it was skipped within the cooldown window.
 */
export function pickNextField(
  events: SurveyEvent[],
  filled: FilledState,
  now: Date,
  startOfToday: Date,
  opts: { dailyLimit?: number; cooldownDays?: number } = {},
): PickResult | null {
  const dailyLimit = opts.dailyLimit ?? SURVEY_DAILY_LIMIT;
  const cooldownDays = opts.cooldownDays ?? SURVEY_SKIP_COOLDOWN_DAYS;
  const cooldownCutoff = new Date(now.getTime() - cooldownDays * 24 * 60 * 60 * 1000);

  const sorted = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const everAnswered = new Set<SurveyField>();
  const lastSkipAt = new Map<SurveyField, Date>();
  const todayLatestStatus = new Map<SurveyField, SurveyStatus>();
  const todayShownFields = new Set<SurveyField>();

  for (const ev of sorted) {
    if (ev.status === 'answered') everAnswered.add(ev.field);
    if (ev.status === 'skipped') lastSkipAt.set(ev.field, ev.createdAt); // ascending order -> last write wins
    if (ev.createdAt >= startOfToday) {
      if (ev.status === 'shown') todayShownFields.add(ev.field);
      todayLatestStatus.set(ev.field, ev.status); // ascending order -> last write wins
    }
  }

  for (const field of SURVEY_FIELD_PRIORITY) {
    if (todayLatestStatus.get(field) === 'shown') return { field, isNew: false };
  }

  if (todayShownFields.size >= dailyLimit) return null;

  for (const field of SURVEY_FIELD_PRIORITY) {
    if (everAnswered.has(field)) continue;
    if (filled[field]) continue;
    const skippedAt = lastSkipAt.get(field);
    if (skippedAt && skippedAt > cooldownCutoff) continue;
    if (todayLatestStatus.has(field)) continue; // touched today some other way (defensive)
    return { field, isNew: true };
  }

  return null;
}

export interface NextQuestionResult {
  field: SurveyField;
  type: SurveyFieldType;
  question: LocalizedText;
  why: LocalizedText;
  options?: Array<{ value: string; label: LocalizedText }>;
}

export function toSurveyPayload(field: SurveyField): NextQuestionResult {
  const def = SURVEY_FIELD_DEFS[field];
  return { field: def.field, type: def.type, question: def.question, why: def.why, options: def.options };
}

// ─── DB-touching orchestration ──────────────────────────────────────────────

async function fetchFilledState(userId: string): Promise<FilledState> {
  const [profile, allergyRow, chronicRow, activeMedRow] = await Promise.all([
    db.query.healthProfiles.findFirst({ where: eq(healthProfiles.userId, userId) }),
    db.select({ id: allergies.id }).from(allergies)
      .where(and(eq(allergies.userId, userId), isNull(allergies.deletedAt))).limit(1),
    db.select({ id: chronicConditions.id }).from(chronicConditions)
      .where(and(eq(chronicConditions.userId, userId), isNull(chronicConditions.deletedAt))).limit(1),
    db.select({ id: medications.id }).from(medications)
      .where(and(eq(medications.userId, userId), isNull(medications.deletedAt), eq(medications.isActive, true))).limit(1),
  ]);

  const has = (v: unknown) => v !== null && v !== undefined && v !== '';

  return {
    emergencyContactPhone: has(profile?.emergencyContactPhone),
    gender: has(profile?.gender),
    allergies: allergyRow.length > 0 || profile?.allergiesNone === true,
    medications: activeMedRow.length > 0,
    chronicDiseases: chronicRow.length > 0 || profile?.chronicConditionsNone === true,
    heightCm: has(profile?.heightCm),
    weightKg: has(profile?.weightKg),
    bloodType: has(profile?.bloodType),
    phone: has(profile?.phone),
    city: has(profile?.city),
    smokingStatus: has(profile?.smokingStatus),
    alcohol: has(profile?.alcoholFrequency),
    activity: has(profile?.exerciseFrequency),
    doctorName: has(profile?.doctorName),
    clinic: has(profile?.clinic),
  };
}

/**
 * Returns the next question to ask, or null if there is nothing left to ask.
 * Idempotent: re-calling this before the returned field is answered/skipped
 * returns THE SAME field without writing a new 'shown' row — both channels
 * can safely call this on every page load.
 */
export async function getNextSurveyQuestion(
  userId: string,
  channel: SurveyChannel,
): Promise<NextQuestionResult | null> {
  const now = new Date();
  const startOfToday = startOfTodayTashkent(now);

  // One query for this user's whole survey_prompts history — the table is
  // bounded per user (at most SURVEY_DAILY_LIMIT new 'shown' rows/day), so
  // this stays small indefinitely; no pagination needed.
  const rows = await db.select({
    field: surveyPrompts.field,
    status: surveyPrompts.status,
    createdAt: surveyPrompts.createdAt,
  }).from(surveyPrompts).where(eq(surveyPrompts.userId, userId));

  const events: SurveyEvent[] = rows
    .filter((r): r is typeof r & { field: SurveyField; status: SurveyStatus } =>
      isSurveyField(r.field) && (r.status === 'shown' || r.status === 'skipped' || r.status === 'answered'))
    .map((r) => ({ field: r.field, status: r.status, createdAt: r.createdAt }));

  const filled = await fetchFilledState(userId);
  const picked = pickNextField(events, filled, now, startOfToday);
  if (!picked) return null;

  if (picked.isNew) {
    await db.insert(surveyPrompts).values({ userId, field: picked.field, channel, status: 'shown' });
  }
  return toSurveyPayload(picked.field);
}

export async function recordSurveySkip(userId: string, field: SurveyField, channel: SurveyChannel): Promise<void> {
  await db.insert(surveyPrompts).values({ userId, field, channel, status: 'skipped' });
}

export async function recordSurveyAnswered(userId: string, field: SurveyField, channel: SurveyChannel): Promise<void> {
  await db.insert(surveyPrompts).values({ userId, field, channel, status: 'answered' });
}
