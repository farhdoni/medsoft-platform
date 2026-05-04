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

    locale: text('locale').default('ru').notNull(),

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

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at'),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: index('aivita_users_email_idx').on(table.email),
    phoneIdx: index('aivita_users_phone_idx').on(table.phone),
    providerIdx: index('aivita_users_provider_idx').on(table.provider, table.providerUserId),
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

    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),

    smokingStatus: text('smoking_status'), // 'never' | 'former' | 'current'
    alcoholFrequency: text('alcohol_frequency'), // 'never' | 'rare' | 'moderate' | 'frequent'
    exerciseFrequency: text('exercise_frequency'), // 'never' | 'rare' | 'sometimes' | 'often' | 'daily'

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

    type: text('type').notNull(), // 'ai_insight' | 'habit_reminder' | 'streak' | 'test_due' | 'family_alert'
    title: text('title').notNull(),
    body: text('body').notNull(),

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
    unreadIdx: index('notifications_unread_idx').on(table.userId, table.readAt),
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
  doctorReports: many(doctorReports),
  emailVerifications: many(aivitaEmailVerifications),
  passwordResets: many(aivitaPasswordResets),
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
