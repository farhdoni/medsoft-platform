import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  numeric,
  index,
  unique,
  varchar,
  serial,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── 1. aivita_users ───────────────────────────────────────────────────────────

export const aivitaUsers = pgTable(
  'aivita_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').unique(),
    phone: text('phone').unique(),
    name: text('name'),
    nickname: text('nickname').unique(),
    avatarUrl: text('avatar_url'),

    provider: text('provider').notNull(), // 'email' | 'google' | 'apple' | 'telegram' | 'mock'
    providerUserId: text('provider_user_id'),
    googleId: text('google_id').unique(),

    passwordHash: text('password_hash'),

    // Login security
    failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
    lockedUntil: timestamp('locked_until'),

    role: text('role').notNull().default('patient'), // 'patient' | 'doctor' | 'admin'
    plan: text('plan').notNull().default('free'),   // 'free' | 'plus' | 'pro'

    locale:   text('locale').default('ru').notNull(),
    timezone: text('timezone').default('Asia/Tashkent').notNull(),

    preferences: jsonb('preferences')
      .$type<{
        notifications?: { push: boolean; email: boolean };
        theme?: 'light' | 'dark' | 'auto';
        units?: { weight: 'kg' | 'lb'; height: 'cm' | 'ft' };
      }>()
      .default({}),

    emailVerified: timestamp('email_verified'),
    phoneVerified: timestamp('phone_verified'),
    onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
    onboardingStep: integer('onboarding_step').default(0).notNull(),
    isMinor: boolean('is_minor').default(false).notNull(),
    parentPhone: text('parent_phone'),
    parentRelation: text('parent_relation'), // 'мама' | 'папа' | 'опекун'
    parentConsent: boolean('parent_consent').default(false).notNull(),

    referralCode: varchar('referral_code', { length: 20 }).unique(),
    referredBy: uuid('referred_by'),

    // Streak & gamification (medications adherence)
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    streakBadges: jsonb('streak_badges')
      .$type<Array<{ id: string; name: string; icon: string; earnedAt: string }>>()
      .notNull().default([]),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at'),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: index('aivita_users_email_idx').on(table.email),
    phoneIdx: index('aivita_users_phone_idx').on(table.phone),
    providerIdx: index('aivita_users_provider_idx').on(table.provider, table.providerUserId),
    referralCodeIdx: index('aivita_users_referral_code_idx').on(table.referralCode),
  })
);

// ─── 1b. aivita_email_verifications ───────────────────────────────────────────

export const aivitaEmailVerifications = pgTable(
  'aivita_email_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    code: text('code').notNull(), // 6-digit OTP stored as plain text (short-lived)
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('email_verifications_user_idx').on(table.userId),
  })
);

// ─── 1b2. aivita_sessions (v2 auth — revocable refresh tokens) ───────────────

export const aivitaSessions = pgTable(
  'aivita_sessions',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    userId:           uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    userAgent:        text('user_agent'),
    ipAddress:        text('ip_address'),
    deviceInfo:       text('device_info'), // 'web' | 'mobile-android' | 'mobile-ios'
    expiresAt:        timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt:        timestamp('revoked_at', { withTimezone: true }),
    createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx:      index('aivita_sessions_user_id_idx').on(table.userId),
    expiresIdx:   index('aivita_sessions_expires_at_idx').on(table.expiresAt),
  })
);

// ─── 1c. aivita_password_resets ───────────────────────────────────────────────

export const aivitaPasswordResets = pgTable(
  'aivita_password_resets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('password_resets_user_idx').on(table.userId),
  })
);

// ─── 2. health_profiles ────────────────────────────────────────────────────────

export const healthProfiles = pgTable(
  'health_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' })
      .unique(),

    birthDate: date('birth_date'),
    gender: text('gender'), // 'male' | 'female' | 'other'
    bloodType: text('blood_type'), // 'A+' | 'A-' | 'B+' ...

    heightCm: integer('height_cm'),
    weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),

    pinfl: text('pinfl'),
    city: text('city'),
    phone: text('phone'),
    telegram: text('telegram'),
    whatsapp: text('whatsapp'),

    dietType: text('diet_type'),
    sleepSchedule: text('sleep_schedule'),
    stressLevel: text('stress_level'),

    passportIssuedBy: text('passport_issued_by'),
    passportIssuedDate: text('passport_issued_date'),
    passportExpires: text('passport_expires'),

    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    emergencyContactRelation: text('emergency_contact_relation'),

    doctorName: text('doctor_name'),
    doctorPhone: text('doctor_phone'),
    clinic: text('clinic'),

    insuranceCompany: text('insurance_company'),
    insuranceNumber: text('insurance_number'),
    insuranceExpires: text('insurance_expires'),
    insuranceHotline: text('insurance_hotline'),

    smokingStatus: text('smoking_status'), // 'never' | 'former' | 'current'
    alcoholFrequency: text('alcohol_frequency'), // 'never' | 'rare' | 'moderate' | 'frequent'
    exerciseFrequency: text('exercise_frequency'), // 'never' | 'rare' | 'sometimes' | 'often' | 'daily'
    sleepHoursPerNight: text('sleep_hours_per_night'), // '<6' | '6-7' | '7-8' | '>8'
    nutritionType: text('nutrition_type'), // 'balanced' | 'vegetarian' | 'vegan' | 'fastfood'

    // Teen-specific fields
    school: text('school'),
    grade: text('grade'),
    visionStatus: text('vision_status'), // 'normal' | 'glasses' | 'unknown'
    childDiseases: jsonb('child_diseases').$type<string[]>(),
    vaccinationHistory: jsonb('vaccination_history').$type<Array<{ name: string; status: 'done' | 'not_done' | 'unknown'; date?: string }>>(),
    screenTime: text('screen_time'), // '<2h' | '2-4h' | '>4h'

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('health_profiles_user_idx').on(table.userId),
  })
);

// ─── 3. chronic_conditions ─────────────────────────────────────────────────────

export const chronicConditions = pgTable(
  'chronic_conditions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    icd10Code: text('icd10_code'),
    diagnosedYear: integer('diagnosed_year'),
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    userIdx: index('chronic_conditions_user_idx').on(table.userId),
  })
);

// ─── 4. allergies ──────────────────────────────────────────────────────────────

export const allergies = pgTable(
  'allergies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    allergen: text('allergen').notNull(),
    type: text('type').notNull(), // 'medication' | 'food' | 'material' | 'other'
    severity: text('severity'), // 'mild' | 'moderate' | 'severe' | 'anaphylaxis'
    reaction: text('reaction'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    userIdx: index('allergies_user_idx').on(table.userId),
  })
);

// ─── 5. medical_history ────────────────────────────────────────────────────────

export const medicalHistory = pgTable(
  'medical_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    type: text('type').notNull(), // 'illness' | 'surgery' | 'injury' | 'pregnancy' | 'other'
    startDate: date('start_date'),
    endDate: date('end_date'),
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    userIdx: index('medical_history_user_idx').on(table.userId),
    startDateIdx: index('medical_history_start_date_idx').on(table.startDate),
  })
);

// ─── 6. medications ────────────────────────────────────────────────────────────

export const medications = pgTable(
  'medications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    dosage: text('dosage'),
    frequency: text('frequency'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    isActive: boolean('is_active').default(true).notNull(),
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    userIdx: index('medications_user_idx').on(table.userId),
    activeIdx: index('medications_active_idx').on(table.userId, table.isActive),
  })
);

// ─── 7. vitals ─────────────────────────────────────────────────────────────────

export const vitals = pgTable(
  'vitals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    type: text('type').notNull(), // 'heart_rate' | 'blood_pressure' | 'sleep_hours' | 'steps' | 'water_ml' | 'weight'

    value: jsonb('value')
      .$type<
        | { value: number; unit: string }
        | { systolic: number; diastolic: number }
        | { hours: number; quality?: 'poor' | 'ok' | 'good' }
      >()
      .notNull(),

    source: text('source').default('manual').notNull(),
    recordedAt: timestamp('recorded_at').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userTimeIdx: index('vitals_user_time_idx').on(table.userId, table.recordedAt),
    typeIdx: index('vitals_type_idx').on(table.userId, table.type, table.recordedAt),
    // Used by onConflictDoUpdate in POST /vitals/batch.
    // Daily-aggregate types (steps, sleep_hours, water_ml) have recorded_at
    // normalized to midnight UTC by the API before insert, so this single
    // constraint deduplicates both daily aggregates and per-sample readings.
    userTypeRecordedAtUniq: unique('vitals_user_type_recorded_at_uniq').on(
      table.userId, table.type, table.recordedAt,
    ),
  })
);

// ─── 8. habits ─────────────────────────────────────────────────────────────────

export const habits = pgTable(
  'habits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    emoji: text('emoji'),
    category: text('category'), // 'nutrition' | 'fitness' | 'sleep' | 'mental' | 'other'

    goalType: text('goal_type').notNull(), // 'count' | 'duration_minutes' | 'volume_ml' | 'binary'
    goalValue: numeric('goal_value', { precision: 10, scale: 2 }),
    goalUnit: text('goal_unit'),

    frequency: text('frequency').default('daily').notNull(),
    reminderTime: text('reminder_time'),

    source: text('source').default('manual').notNull(),
    isActive: boolean('is_active').default(true).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    archivedAt: timestamp('archived_at'),
  },
  (table) => ({
    userIdx: index('habits_user_idx').on(table.userId),
    activeIdx: index('habits_active_idx').on(table.userId, table.isActive),
  })
);

// ─── 8b. habit_logs ────────────────────────────────────────────────────────────

export const habitLogs = pgTable(
  'habit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    date: date('date').notNull(),
    loggedAt: timestamp('logged_at').defaultNow().notNull(),

    value: numeric('value', { precision: 10, scale: 2 }),
    unit: text('unit'),
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    habitDateIdx: index('habit_logs_habit_date_idx').on(table.habitId, table.date),
    userDateIdx: index('habit_logs_user_date_idx').on(table.userId, table.date),
  })
);

// ─── 9. meals ──────────────────────────────────────────────────────────────────

export const meals = pgTable(
  'meals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    emoji: text('emoji'),
    mealType: text('meal_type').notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'

    date: date('date').notNull(),
    consumedAt: timestamp('consumed_at').notNull(),

    portionGrams: integer('portion_grams'),
    calories: numeric('calories', { precision: 6, scale: 1 }).notNull(),
    proteinG: numeric('protein_g', { precision: 5, scale: 1 }),
    fatG: numeric('fat_g', { precision: 5, scale: 1 }),
    carbsG: numeric('carbs_g', { precision: 5, scale: 1 }),

    source: text('source').default('manual').notNull(),
    aiConfidence: integer('ai_confidence'),
    photoUrl: text('photo_url'),

    aiMetadata: jsonb('ai_metadata').$type<{
      dish_name_ru?: string;
      dish_name_uz?: string;
      dish_name_en?: string;
      warnings?: string[];
      raw_response?: unknown;
    }>(),

    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    userDateIdx: index('meals_user_date_idx').on(table.userId, table.date),
    mealTypeIdx: index('meals_type_idx').on(table.userId, table.date, table.mealType),
  })
);

// ─── 10. health_scores ─────────────────────────────────────────────────────────

export const healthScores = pgTable(
  'health_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    totalScore: integer('total_score').notNull(),

    cardiovascularScore: integer('cardiovascular_score'),
    digestiveScore: integer('digestive_score'),
    sleepScore: integer('sleep_score'),
    mentalScore: integer('mental_score'),
    musculoskeletalScore: integer('musculoskeletal_score'),

    healthAge: integer('health_age'),
    growthZone: text('growth_zone'),

    trigger: text('trigger').notNull(), // 'onboarding' | 'monthly_test' | 'profile_change' | 'manual'

    calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
    validUntil: timestamp('valid_until'),
  },
  (table) => ({
    userTimeIdx: index('health_scores_user_time_idx').on(table.userId, table.calculatedAt),
  })
);

// ─── 11. system_test_results ───────────────────────────────────────────────────

export const systemTestResults = pgTable(
  'system_test_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    periodMonth: text('period_month').notNull(), // 'YYYY-MM'
    system: text('system').notNull(), // 'cardiovascular' | 'digestive' | 'sleep' | 'mental' | 'musculoskeletal'

    score: integer('score').notNull(),

    answers: jsonb('answers')
      .$type<
        Array<{
          questionId: string;
          questionText: string;
          answer: unknown;
          score: number;
        }>
      >()
      .notNull(),

    growthZones: jsonb('growth_zones').$type<string[]>(),
    positives: jsonb('positives').$type<string[]>(),

    completedAt: timestamp('completed_at').defaultNow().notNull(),
  },
  (table) => ({
    userPeriodIdx: index('system_test_user_period_idx').on(table.userId, table.periodMonth),
    uniquePerSystem: unique('unique_user_period_system').on(
      table.userId,
      table.periodMonth,
      table.system
    ),
  })
);

// ─── 12. family_members ────────────────────────────────────────────────────────

export const familyMembers = pgTable(
  'family_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    ownerId: uuid('owner_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    memberUserId: uuid('member_user_id').references(() => aivitaUsers.id, {
      onDelete: 'set null',
    }),

    memberName: text('member_name').notNull(),
    memberRelation: text('member_relation').notNull(), // 'spouse' | 'child' | 'parent' | ...
    memberBirthDate: date('member_birth_date'),
    memberGender: text('member_gender'),
    phone: text('phone'),
    notes: text('notes'),

    // ── Child medical card fields ───────────────────────────────────────────
    cardNumber: text('card_number').unique(),
    heightCm: integer('height_cm'),
    weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
    bloodGroup: text('blood_group'),
    rhFactor: text('rh_factor'),
    allergies: jsonb('allergies').$type<string[]>().default([]),
    chronicDiseases: jsonb('chronic_diseases').$type<string[]>().default([]),
    childDiseases: jsonb('child_diseases').$type<string[]>().default([]),
    vaccinations: jsonb('vaccinations').$type<Array<{ name: string; status: string; date?: string }>>().default([]),
    medications: jsonb('medications').$type<string[]>().default([]),
    parentNotes: text('parent_notes'),
    migratedToUserId: uuid('migrated_to_user_id').references(() => aivitaUsers.id, { onDelete: 'set null' }),
    migratedAt: timestamp('migrated_at'),

    permissionLevel: text('permission_level').default('view').notNull(),

    inviteStatus: text('invite_status').default('accepted').notNull(),
    inviteToken: text('invite_token').unique(),
    invitePhone: text('invite_phone'),
    inviteEmail: text('invite_email'),
    invitedAt: timestamp('invited_at'),
    acceptedAt: timestamp('accepted_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    ownerIdx: index('family_owner_idx').on(table.ownerId),
    memberIdx: index('family_member_idx').on(table.memberUserId),
    inviteTokenIdx: index('family_invite_token_idx').on(table.inviteToken),
  })
);

// ─── 13. chat_sessions ─────────────────────────────────────────────────────────

export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    title: text('title'),
    status: text('status').default('active').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('chat_sessions_user_idx').on(table.userId),
  })
);

// ─── 13b. chat_messages ────────────────────────────────────────────────────────

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => chatSessions.id, { onDelete: 'cascade' }),

    role: text('role').notNull(), // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),

    aiMetadata: jsonb('ai_metadata').$type<{
      type?: 'question' | 'verdict' | 'emergency' | 'info';
      quick_replies?: string[];
      verdict_card?: unknown;
      severity_card?: unknown;
      recommendations?: string[];
      model?: string;
      tokens?: { input: number; output: number };
    }>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index('chat_messages_session_idx').on(table.sessionId, table.createdAt),
  })
);

// ─── 14. notifications ─────────────────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    type: text('type').notNull(),
    // 'medication_reminder'|'payment_confirm'|'action_required'|'appointment_reminder'
    // |'message_new'|'checkup_result'|'outbreak_alert'|'subscription_expiring'
    // |'admin_broadcast'|'doctor_verification'|'family_request'|'order_status'
    // |'ai_insight'|'habit_reminder'|'streak'|'test_due'|'family_alert' (legacy)

    title: text('title').notNull(),
    body: text('body').notNull(),

    icon: text('icon'),            // emoji icon for the notification
    link: text('link'),            // navigation path on click

    isRead: boolean('is_read').default(false).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    priority: text('priority').default('normal').notNull(), // 'low'|'normal'|'high'|'urgent'

    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // legacy — kept for backward compat
    payload: jsonb('payload').$type<{
      screen?: string;
      params?: Record<string, unknown>;
    }>(),
    readAt: timestamp('read_at'),
    pushSent: boolean('push_sent').default(false).notNull(),
    pushSentAt: timestamp('push_sent_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('notifications_user_idx').on(table.userId, table.createdAt),
    unreadIdx: index('notifications_unread_idx').on(table.userId, table.isRead, table.createdAt),
  })
);

// ─── 14b. notification_settings ────────────────────────────────────────────────

export const notificationSettings = pgTable(
  'notification_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' })
      .unique(),

    emailEnabled: boolean('email_enabled').default(true).notNull(),
    telegramEnabled: boolean('telegram_enabled').default(false).notNull(),
    telegramChatId: text('telegram_chat_id'),

    medicationReminders: boolean('medication_reminders').default(true).notNull(),
    appointmentReminders: boolean('appointment_reminders').default(true).notNull(),
    outbreakAlerts: boolean('outbreak_alerts').default(true).notNull(),
    marketingEnabled: boolean('marketing_enabled').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('notification_settings_user_idx').on(table.userId),
  })
);

// ─── 15. doctor_reports ────────────────────────────────────────────────────────

export const doctorReports = pgTable(
  'doctor_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    reportNumber: text('report_number').notNull().unique(),

    fileUrl: text('file_url').notNull(),
    fileSizeBytes: integer('file_size_bytes'),

    snapshotData: jsonb('snapshot_data')
      .$type<{
        patient: unknown;
        allergies: unknown[];
        chronic: unknown[];
        history: unknown[];
        vitals: unknown;
      }>()
      .notNull(),

    shareToken: text('share_token').unique(),
    shareTokenExpiresAt: timestamp('share_token_expires_at'),
    viewedCount: integer('viewed_count').default(0).notNull(),
    lastViewedAt: timestamp('last_viewed_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => ({
    userIdx: index('doctor_reports_user_idx').on(table.userId, table.createdAt),
    shareTokenIdx: index('doctor_reports_share_token_idx').on(table.shareToken),
  })
);

// ─── Relations ─────────────────────────────────────────────────────────────────

export const aivitaEmailVerificationsRelations = relations(aivitaEmailVerifications, ({ one }) => ({
  user: one(aivitaUsers, { fields: [aivitaEmailVerifications.userId], references: [aivitaUsers.id] }),
}));

export const aivitaPasswordResetsRelations = relations(aivitaPasswordResets, ({ one }) => ({
  user: one(aivitaUsers, { fields: [aivitaPasswordResets.userId], references: [aivitaUsers.id] }),
}));

export const aivitaUsersRelations = relations(aivitaUsers, ({ one, many }) => ({
  healthProfile: one(healthProfiles, {
    fields: [aivitaUsers.id],
    references: [healthProfiles.userId],
  }),
  chronicConditions: many(chronicConditions),
  allergies: many(allergies),
  medicalHistory: many(medicalHistory),
  medications: many(medications),
  vitals: many(vitals),
  habits: many(habits),
  meals: many(meals),
  healthScores: many(healthScores),
  testResults: many(systemTestResults),
  ownedFamily: many(familyMembers, { relationName: 'owner' }),
  memberInFamily: many(familyMembers, { relationName: 'member' }),
  chatSessions: many(chatSessions),
  notifications: many(notifications),
  notificationSettings: one(notificationSettings, {
    fields: [aivitaUsers.id],
    references: [notificationSettings.userId],
  }),
  doctorReports: many(doctorReports),
  emailVerifications: many(aivitaEmailVerifications),
  passwordResets: many(aivitaPasswordResets),
  userDevices: many(userDevices),
}));

export const healthProfilesRelations = relations(healthProfiles, ({ one }) => ({
  user: one(aivitaUsers, {
    fields: [healthProfiles.userId],
    references: [aivitaUsers.id],
  }),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(aivitaUsers, { fields: [habits.userId], references: [aivitaUsers.id] }),
  logs: many(habitLogs),
}));

export const habitLogsRelations = relations(habitLogs, ({ one }) => ({
  habit: one(habits, { fields: [habitLogs.habitId], references: [habits.id] }),
  user: one(aivitaUsers, { fields: [habitLogs.userId], references: [aivitaUsers.id] }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(aivitaUsers, { fields: [chatSessions.userId], references: [aivitaUsers.id] }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  owner: one(aivitaUsers, {
    fields: [familyMembers.ownerId],
    references: [aivitaUsers.id],
    relationName: 'owner',
  }),
  member: one(aivitaUsers, {
    fields: [familyMembers.memberUserId],
    references: [aivitaUsers.id],
    relationName: 'member',
  }),
}));

// ─── 16. user_devices (gadget connections) ────────────────────────────────────

export const userDevices = pgTable(
  'user_devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    type: text('type').notNull(),
    // 'xiaomi_band' | 'samsung_galaxy_watch' | 'huawei_band' | 'google_fit' | 'apple_health' | 'garmin' | 'fitbit'

    name: text('name').notNull(), // "Xiaomi Mi Band 8"

    status: text('status').notNull().default('pending'),
    // 'pending' | 'connected' | 'disconnected' | 'error'

    lastSyncAt: timestamp('last_sync_at'),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    metadata: jsonb('metadata'),
    connectedAt: timestamp('connected_at'),

    hcChangesToken: text('hc_changes_token'),
    hcLastSyncAt: timestamp('hc_last_sync_at', { withTimezone: true }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('user_devices_user_idx').on(table.userId),
    userTypeIdx: index('user_devices_user_type_idx').on(table.userId, table.type),
    userTypeUniq: unique('user_devices_user_type_uniq').on(table.userId, table.type),
  })
);

// ─── SOS Events ────────────────────────────────────────────────────────────────

export const sosEvents = pgTable(
  'sos_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    latitude: numeric('latitude', { precision: 10, scale: 7 }),
    longitude: numeric('longitude', { precision: 10, scale: 7 }),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    medicalDataSent: jsonb('medical_data_sent'),
    smsSent: boolean('sms_sent').notNull().default(false),
    callInitiated: boolean('call_initiated').notNull().default(false),
    resolvedAt: timestamp('resolved_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('sos_events_user_idx').on(table.userId),
  })
);

// ─── Medical Cards (QR) ────────────────────────────────────────────────────────

export const medicalCards = pgTable(
  'medical_cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }).unique(),
    cardCode: text('card_code').notNull().unique(),
    isActive: boolean('is_active').notNull().default(true),
    pinProtected: boolean('pin_protected').notNull().default(false),
    pinHash: text('pin_hash'),
    accessCount: integer('access_count').notNull().default(0),
    lastAccessedAt: timestamp('last_accessed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index('medical_cards_code_idx').on(table.cardCode),
  })
);

// ─── Family link requests ──────────────────────────────────────────────────────

export const familyLinkRequests = pgTable(
  'family_link_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    toUserId: uuid('to_user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    familyMemberId: uuid('family_member_id')
      .notNull()
      .references(() => familyMembers.id, { onDelete: 'cascade' }),
    // 'pending' | 'accepted' | 'rejected'
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    fromIdx: index('family_link_req_from_idx').on(table.fromUserId),
    toIdx: index('family_link_req_to_idx').on(table.toUserId),
    memberIdx: index('family_link_req_member_idx').on(table.familyMemberId),
  })
);

export const familyLinkRequestsRelations = relations(familyLinkRequests, ({ one }) => ({
  from: one(aivitaUsers, { fields: [familyLinkRequests.fromUserId], references: [aivitaUsers.id], relationName: 'link_from' }),
  to: one(aivitaUsers, { fields: [familyLinkRequests.toUserId], references: [aivitaUsers.id], relationName: 'link_to' }),
  member: one(familyMembers, { fields: [familyLinkRequests.familyMemberId], references: [familyMembers.id] }),
}));

// ─── Card claim requests (child migrating to adult account) ───────────────────

export const cardClaimRequests = pgTable(
  'card_claim_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    familyMemberId: uuid('family_member_id')
      .notNull()
      .references(() => familyMembers.id, { onDelete: 'cascade' }),
    parentUserId: uuid('parent_user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    // 'pending' | 'approved' | 'rejected'
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    fromIdx: index('card_claim_req_from_idx').on(table.fromUserId),
    parentIdx: index('card_claim_req_parent_idx').on(table.parentUserId),
    memberIdx2: index('card_claim_req_member_idx').on(table.familyMemberId),
  })
);

// ─── Device tokens (push notifications) ───────────────────────────────────────

export const aivitaDeviceTokens = pgTable(
  'aivita_device_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    pushToken: text('push_token').notNull(),
    platform: text('platform').notNull().default('android'), // 'android' | 'ios'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueToken: unique('unique_device_push_token').on(table.pushToken),
    userIdx: index('device_tokens_user_idx').on(table.userId),
  })
);

// ─── Health checkups (AI-чекап) ────────────────────────────────────────────────

export type CheckupSystem = {
  name: string;
  icon: string;
  score: number;
  status: 'green' | 'yellow' | 'red';
  details: string;
};

export type CheckupProblem = {
  severity: 'red' | 'yellow';
  title: string;
  description: string;
  recommendation: string;
  doctorType?: string;
};

export type CheckupPlanItem = {
  day: number;
  task: string;
  category: string;
};

export const healthCheckups = pgTable(
  'health_checkups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    bioAge:       integer('bio_age'),
    chronoAge:    integer('chrono_age'),
    healthScore:  integer('health_score'),   // 0-100

    systems:  jsonb('systems').$type<CheckupSystem[]>(),
    problems: jsonb('problems').$type<CheckupProblem[]>(),
    plan:     jsonb('plan').$type<CheckupPlanItem[]>(),
    summary:  text('summary'),

    // 'pending' | 'done' | 'error'
    status: text('status').notNull().default('pending'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx:     index('health_checkups_user_idx').on(table.userId),
    createdIdx:  index('health_checkups_created_idx').on(table.createdAt),
  })
);

// ─── Symptom reports (outbreak monitoring) ─────────────────────────────────────

export const symptomReports = pgTable(
  'symptom_reports',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    userId:           uuid('user_id').references(() => aivitaUsers.id, { onDelete: 'set null' }),
    city:             text('city').notNull(),
    symptomType:      text('symptom_type').notNull(), // fever|cough|diarrhea|rash|headache|vomiting|sore_throat
    temperature:      numeric('temperature', { precision: 4, scale: 1 }),
    diseaseCategory:  text('disease_category'),       // orvi|measles|hepatitis|intestinal|flu|other
    severity:         text('severity'),               // mild|moderate|severe
    source:           text('source').notNull().default('manual'), // checkup|vitals|manual|ai_chat
    reportedAt:       timestamp('reported_at').defaultNow().notNull(),
  },
  (table) => ({
    cityIdx:          index('symptom_reports_city_idx').on(table.city),
    categoryIdx:      index('symptom_reports_category_idx').on(table.diseaseCategory),
    reportedAtIdx:    index('symptom_reports_reported_at_idx').on(table.reportedAt),
    cityDateIdx:      index('symptom_reports_city_date_idx').on(table.city, table.diseaseCategory, table.reportedAt),
  })
);

// ─── Outbreak snapshots (aggregated cache) ─────────────────────────────────────

export const outbreakSnapshots = pgTable(
  'outbreak_snapshots',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    city:             text('city').notNull(),
    diseaseCategory:  text('disease_category').notNull(),
    activeCases:      integer('active_cases').notNull().default(0),
    recovered:        integer('recovered').notNull().default(0),
    hospitalized:     integer('hospitalized').notNull().default(0),
    trend:            text('trend').notNull().default('stable'), // rising|stable|falling
    calculatedAt:     timestamp('calculated_at').defaultNow().notNull(),
  },
  (table) => ({
    cityIdx:          index('outbreak_snapshots_city_idx').on(table.city),
    calcIdx:          index('outbreak_snapshots_calc_idx').on(table.calculatedAt),
  })
);

// ─── Lab Results ───────────────────────────────────────────────────────────────

export const labResults = pgTable(
  'lab_results',
  {
    id:             uuid('id').primaryKey().defaultRandom(),
    userId:         uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    testName:       text('test_name').notNull(),
    value:          text('value'),
    unit:           text('unit'),
    referenceRange: text('reference_range'),
    status:         text('status').default('normal'),   // normal | abnormal | critical | borderline
    category:       text('category').default('other'),  // blood | urine | hormone | biochem | other
    labName:        text('lab_name'),
    doctorName:     text('doctor_name'),
    testedAt:       date('tested_at'),
    documentUrl:    text('document_url'),
    notes:          text('notes'),
    createdAt:      timestamp('created_at').defaultNow().notNull(),
    updatedAt:      timestamp('updated_at').defaultNow().notNull(),
    deletedAt:      timestamp('deleted_at'),
  },
  (table) => ({
    userIdx:     index('lab_results_user_idx').on(table.userId),
    testedAtIdx: index('lab_results_tested_at_idx').on(table.userId, table.testedAt),
  })
);

// ─── AI Chat Messages ──────────────────────────────────────────────────────────

export const aiChatMessages = pgTable(
  'ai_chat_messages',
  {
    seq:       serial('seq').notNull(),
    id:        uuid('id').primaryKey().defaultRandom(),
    userId:    uuid('user_id')
                 .notNull()
                 .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    role:      text('role').notNull(), // 'user' | 'assistant'
    content:   text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userSeqIdx: index('ai_chat_messages_user_seq_idx').on(table.userId, table.seq),
  })
);

// ─── AI Chat Archives ─────────────────────────────────────────────────────────

export const aiChatArchives = pgTable(
  'ai_chat_archives',
  {
    id:           serial('id').primaryKey(),
    userId:       uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    title:        varchar('title', { length: 200 }).notNull(),
    messages:     jsonb('messages').$type<Array<{ role: string; content: string }>>().notNull().default([]),
    messageCount: integer('message_count').notNull().default(0),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('ai_chat_archives_user_idx').on(table.userId, table.createdAt),
  })
);

// ─── Agent Alerts ─────────────────────────────────────────────────────────────

export const agentAlerts = pgTable(
  'agent_alerts',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    userId:        uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    agentType:     varchar('agent_type', { length: 30 }).notNull(), // vitals_monitor|document_parser|medication_tracker|weekly_checkup
    severity:      varchar('severity', { length: 20 }).notNull().default('info'), // info|warning|critical
    title:         varchar('title', { length: 200 }).notNull(),
    description:   text('description'),
    recommendation: text('recommendation'),
    relatedData:   jsonb('related_data').$type<Record<string, unknown>>(),
    isRead:        boolean('is_read').notNull().default(false),
    isDismissed:   boolean('is_dismissed').notNull().default(false),
    createdAt:     timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIdx: index('agent_alerts_user_created_idx').on(table.userId, table.createdAt),
    userTypeIdx:    index('agent_alerts_user_type_idx').on(table.userId, table.agentType),
  })
);

// ─── Agent Settings ───────────────────────────────────────────────────────────

export const agentSettings = pgTable(
  'agent_settings',
  {
    id:                      uuid('id').primaryKey().defaultRandom(),
    userId:                  uuid('user_id').notNull().unique().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    vitalsMonitorEnabled:    boolean('vitals_monitor_enabled').notNull().default(true),
    documentParserEnabled:   boolean('document_parser_enabled').notNull().default(true),
    medicationTrackerEnabled: boolean('medication_tracker_enabled').notNull().default(true),
    weeklyCheckupEnabled:    boolean('weekly_checkup_enabled').notNull().default(true),
    alertThresholds:         jsonb('alert_thresholds').$type<{
      pulse_high?: number; pulse_low?: number;
      systolic_high?: number; systolic_low?: number;
      diastolic_high?: number; diastolic_low?: number;
      spo2_low?: number; sugar_high?: number; sugar_low?: number;
      temp_high?: number; temp_low?: number;
    }>().default({}),
    updatedAt:               timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('agent_settings_user_idx').on(table.userId),
  })
);

// ─── Health Analysis (AI Predict) ─────────────────────────────────────────────

export const healthAnalysis = pgTable(
  'health_analysis',
  {
    id:                uuid('id').primaryKey().defaultRandom(),
    userId:            uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    healthScore:       integer('health_score'),
    biologicalAge:     integer('biological_age'),
    overallAssessment: text('overall_assessment'),
    currentProblems:   jsonb('current_problems').$type<Array<{
      title: string; description: string;
      severity: 'low'|'medium'|'high'|'critical';
      category: string; recommendation: string; suggestedDoctor?: string;
    }>>().default([]),
    futureRisks:       jsonb('future_risks').$type<Array<{
      title: string; probability: 'low'|'medium'|'high';
      timeframe: string; preventionPlan: string;
    }>>().default([]),
    healthPlan:        jsonb('health_plan').$type<{
      duration: string;
      goals: Array<{ title: string; description: string; metric: string; target: string }>;
      dailyActions: string[]; weeklyActions: string[]; monthlyActions: string[];
    }>(),
    planProgress:      jsonb('plan_progress').$type<Record<string, boolean>>().default({}),
    createdAt:         timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIdx: index('health_analysis_user_created_idx').on(table.userId, table.createdAt),
  })
);

// ─── symptomSessions ──────────────────────────────────────────────────────────

export const symptomSessions = pgTable(
  'symptom_sessions',
  {
    id:           serial('id').primaryKey(),
    userId:       uuid('user_id').references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    sessionId:    uuid('session_id').notNull().defaultRandom(),
    mainSymptom:  varchar('main_symptom', { length: 200 }).notNull(),
    bodyArea:     varchar('body_area', { length: 50 }),
    answers:      jsonb('answers').$type<Array<{ question: string; answer: string }>>().notNull().default([]),
    results:      jsonb('results').$type<Array<{ condition: string; probability: string; description: string; specialist: string; urgency: string }>>(),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({ userIdx: index('symptom_sessions_user_id_idx').on(table.userId) })
);

// ─── nutritionLogs ────────────────────────────────────────────────────────────

export const nutritionLogs = pgTable(
  'nutrition_logs',
  {
    id:            serial('id').primaryKey(),
    userId:        uuid('user_id').references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    date:          date('date').notNull(),
    meal:          varchar('meal', { length: 20 }).notNull(),
    dishes:        jsonb('dishes').$type<Array<{ name: string; calories: number; protein?: number; fat?: number; carbs?: number }>>().notNull().default([]),
    totalCalories: integer('total_calories').notNull().default(0),
    totalProtein:  numeric('total_protein', { precision: 6, scale: 2 }).notNull().default('0'),
    totalFat:      numeric('total_fat', { precision: 6, scale: 2 }).notNull().default('0'),
    totalCarbs:    numeric('total_carbs', { precision: 6, scale: 2 }).notNull().default('0'),
    createdAt:     timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({ userDateIdx: index('nutrition_logs_user_date_idx').on(table.userId, table.date) })
);

// ─── nutritionPlans ───────────────────────────────────────────────────────────

export const nutritionPlans = pgTable(
  'nutrition_plans',
  {
    id:        serial('id').primaryKey(),
    userId:    uuid('user_id').references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    goal:      varchar('goal', { length: 20 }).notNull(),
    plan:      jsonb('plan').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({ userIdx: index('nutrition_plans_user_id_idx').on(table.userId) })
);

// ─── moodLogs ─────────────────────────────────────────────────────────────────

export const moodLogs = pgTable(
  'mood_logs',
  {
    id:        serial('id').primaryKey(),
    userId:    uuid('user_id').references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    mood:      integer('mood').notNull(),
    factors:   jsonb('factors').$type<string[]>().notNull().default([]),
    note:      text('note'),
    date:      date('date').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({ userDateIdx: index('mood_logs_user_date_idx').on(table.userId, table.date) })
);

// ─── mentalActivities ─────────────────────────────────────────────────────────

export const mentalActivities = pgTable(
  'mental_activities',
  {
    id:              serial('id').primaryKey(),
    userId:          uuid('user_id').references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    type:            varchar('type', { length: 20 }).notNull(),
    exerciseId:      varchar('exercise_id', { length: 50 }),
    durationSeconds: integer('duration_seconds'),
    createdAt:       timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({ userIdx: index('mental_activities_user_idx').on(table.userId) })
);

// ─── mentalTherapistMessages ──────────────────────────────────────────────────

export const mentalTherapistMessages = pgTable(
  'mental_therapist_messages',
  {
    id:        serial('id').primaryKey(),
    userId:    uuid('user_id').references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    role:      varchar('role', { length: 10 }).notNull(),
    content:   text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({ userIdx: index('mental_therapist_user_idx').on(table.userId) })
);

// ─── reminderSettings ─────────────────────────────────────────────────────────

export const reminderSettings = pgTable(
  'reminder_settings',
  {
    id:                 serial('id').primaryKey(),
    userId:             uuid('user_id').references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    settings:           jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
    quietHoursStart:    text('quiet_hours_start').notNull().default('23:00'),
    quietHoursEnd:      text('quiet_hours_end').notNull().default('07:00'),
    globalVoiceEnabled: boolean('global_voice_enabled').notNull().default(true),
    globalSoundEnabled: boolean('global_sound_enabled').notNull().default(true),
    globalVolume:       integer('global_volume').notNull().default(80),
    createdAt:          timestamp('created_at').notNull().defaultNow(),
    updatedAt:          timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({ userIdx: index('reminder_settings_user_idx').on(table.userId) })
);

// ─── customReminders ──────────────────────────────────────────────────────────

export const customReminders = pgTable(
  'custom_reminders',
  {
    id:           serial('id').primaryKey(),
    userId:       uuid('user_id').references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    title:        varchar('title', { length: 200 }).notNull(),
    time:         text('time').notNull(),
    repeat:       varchar('repeat', { length: 20 }).notNull().default('daily'),
    voiceEnabled: boolean('voice_enabled').notNull().default(false),
    voiceText:    varchar('voice_text', { length: 300 }),
    isActive:     boolean('is_active').notNull().default(true),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({ userIdx: index('custom_reminders_user_idx').on(table.userId) })
);
