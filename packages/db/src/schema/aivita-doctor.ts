import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  real,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita';

// ─── 1. doctor_profiles ────────────────────────────────────────────────────────

export const doctorProfiles = pgTable(
  'doctor_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' })
      .unique(),

    // Паспортные данные
    dateOfBirth: date('date_of_birth'),
    gender: text('gender'),
    passportSeries: text('passport_series'),
    passportNumber: text('passport_number'),
    passportIssuedBy: text('passport_issued_by'),
    passportIssuedAt: date('passport_issued_at'),
    passportExpiresAt: date('passport_expires_at'),

    // Контакты
    phone: text('phone'),
    telegram: text('telegram'),
    whatsapp: text('whatsapp'),
    city: text('city'),
    languages: jsonb('languages').$type<string[]>().default(['ru']),
    photoUrl: text('photo_url'),

    // Профессиональные данные
    specialization: text('specialization'),
    specializationCode: text('specialization_code'),
    additionalSkills: jsonb('additional_skills').$type<string[]>().default([]),
    diseasesTreated: jsonb('diseases_treated').$type<string[]>().default([]),
    experienceStartDate: date('experience_start_date'),
    consultationPrice: integer('consultation_price').notNull().default(0),
    bio: text('bio'),

    // Диплом
    diplomaUniversity: text('diploma_university'),
    diplomaSpecialty: text('diploma_specialty'),
    diplomaYear: integer('diploma_year'),
    diplomaNumber: text('diploma_number'),
    diplomaScanUrl: text('diploma_scan_url'),
    diplomaVerified: text('diploma_verified').notNull().default('not_uploaded'),

    // Сертификаты
    certificates: jsonb('certificates').$type<Array<{ title: string; year?: number; scanUrl?: string }>>().default([]),

    // Лицензия
    licenseNumber: text('license_number'),
    licenseIssuedBy: text('license_issued_by'),
    licenseIssuedAt: date('license_issued_at'),
    licenseExpiresAt: date('license_expires_at'),
    licenseScanUrl: text('license_scan_url'),
    licenseVerified: text('license_verified').notNull().default('not_uploaded'),

    // Место работы
    clinicName: text('clinic_name'),
    clinicAddress: text('clinic_address'),
    cabinetNumber: text('cabinet_number'),
    clinicPhone: text('clinic_phone'),
    clinicWebsite: text('clinic_website'),

    // Настройки видимости
    showInCatalog: boolean('show_in_catalog').notNull().default(false),
    showPhone: boolean('show_phone').notNull().default(false),
    showEmail: boolean('show_email').notNull().default(false),
    showPrice: boolean('show_price').notNull().default(true),
    showRating: boolean('show_rating').notNull().default(true),

    // Статистика
    rating: real('rating').notNull().default(0),
    ratingCount: integer('rating_count').notNull().default(0),
    totalConsultations: integer('total_consultations').notNull().default(0),
    totalPatients: integer('total_patients').notNull().default(0),
    monthlyConsultations: integer('monthly_consultations').notNull().default(0),
    likesCount: integer('likes_count').notNull().default(0),
    thanksCount: integer('thanks_count').notNull().default(0),
    recommendsCount: integer('recommends_count').notNull().default(0),

    // Верификация
    verificationStatus: text('verification_status').notNull().default('not_verified'),
    // 'not_verified' | 'pending' | 'verified' | 'rejected'
    verifiedAt: timestamp('verified_at'),
    verifiedBy: uuid('verified_by'),
    rejectionReason: text('rejection_reason'),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('doctor_profiles_user_idx').on(table.userId),
    catalogIdx: index('doctor_profiles_catalog_idx').on(table.showInCatalog, table.specialization),
  })
);

// ─── 2. doctor_patients ────────────────────────────────────────────────────────

export const doctorPatients = pgTable(
  'doctor_patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    // 'pending' | 'active' | 'archived'
    accessLevel: text('access_level').notNull().default('full'),
    connectedVia: text('connected_via'),
    // 'manual' | 'ai_recommendation' | 'clinic' | 'referral'
    consultationCount: integer('consultation_count').notNull().default(0),
    lastConsultationAt: timestamp('last_consultation_at'),
    notes: text('notes'),
    connectedAt: timestamp('connected_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    doctorIdx: index('doctor_patients_doctor_idx').on(table.doctorId),
    patientIdx: index('doctor_patients_patient_idx').on(table.patientId),
    uniquePair: unique('doctor_patient_unique').on(table.doctorId, table.patientId),
  })
);

// ─── 3. aivita_appointments ────────────────────────────────────────────────────

export const aivitaAppointments = pgTable(
  'aivita_appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    scheduledAt: timestamp('scheduled_at').notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(30),
    type: text('type').notNull().default('offline'),
    // 'online' | 'offline'
    status: text('status').notNull().default('scheduled'),
    // 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
    reason: text('reason'),
    doctorNotes: text('doctor_notes'),
    diagnosis: text('diagnosis'),
    nextAppointment: timestamp('next_appointment'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    doctorTimeIdx: index('aivita_appts_doctor_time_idx').on(table.doctorId, table.scheduledAt),
    patientIdx: index('aivita_appts_patient_idx').on(table.patientId),
    statusIdx: index('aivita_appts_status_idx').on(table.doctorId, table.status),
  })
);

// ─── 4. aivita_prescriptions ───────────────────────────────────────────────────

export const aivitaPrescriptions = pgTable(
  'aivita_prescriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id').references(() => aivitaAppointments.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    // 'medication' | 'test' | 'procedure'
    title: text('title').notNull(),
    details: text('details'),
    frequency: text('frequency'),
    durationDays: integer('duration_days'),
    status: text('status').notNull().default('active'),
    // 'active' | 'completed' | 'cancelled'
    dueDate: date('due_date'),
    patientConfirmed: boolean('patient_confirmed').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    doctorIdx: index('prescriptions_doctor_idx').on(table.doctorId),
    patientIdx: index('prescriptions_patient_idx').on(table.patientId),
    statusIdx: index('prescriptions_status_idx').on(table.patientId, table.status),
  })
);

// ─── 5. doctor_schedule ────────────────────────────────────────────────────────

export const doctorSchedule = pgTable(
  'doctor_schedule',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    // 0=пн, 1=вт, ..., 6=вс
    startTime: text('start_time').notNull(),
    // "09:00"
    endTime: text('end_time').notNull(),
    // "18:00"
    breakStart: text('break_start'),
    breakEnd: text('break_end'),
    slotDurationMinutes: integer('slot_duration_minutes').notNull().default(30),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => ({
    doctorIdx: index('doctor_schedule_doctor_idx').on(table.doctorId),
    uniqueDay: unique('doctor_schedule_unique_day').on(table.doctorId, table.dayOfWeek),
  })
);

// ─── 6. doctor_reviews ─────────────────────────────────────────────────────────

export const doctorReviews = pgTable(
  'doctor_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id').references(() => aivitaAppointments.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(),
    // 1-5
    text: text('text'),
    isAnonymous: boolean('is_anonymous').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    doctorIdx: index('doctor_reviews_doctor_idx').on(table.doctorId, table.createdAt),
    uniqueReview: unique('doctor_review_unique').on(table.doctorId, table.patientId, table.appointmentId),
  })
);

// ─── 7. aivita_likes ───────────────────────────────────────────────────────────

export const aivitaLikes = pgTable(
  'aivita_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    toUserId: uuid('to_user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    // 'like' | 'thank' | 'recommend'
    context: text('context'),
    // 'profile' | 'after_appointment' | 'chat'
    appointmentId: uuid('appointment_id').references(() => aivitaAppointments.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueLike: unique('aivita_likes_unique').on(table.fromUserId, table.toUserId, table.type),
    toUserIdx: index('aivita_likes_to_user_idx').on(table.toUserId),
  })
);

// ─── 8. doctor_notifications ───────────────────────────────────────────────────

export const doctorNotifications = pgTable(
  'doctor_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    // 'appointment_new' | 'appointment_cancel' | 'chat_message' | 'vital_anomaly'
    // 'patient_request' | 'review' | 'reminder' | 'referral_incoming'
    title: text('title').notNull(),
    message: text('message'),
    relatedPatientId: uuid('related_patient_id').references(() => aivitaUsers.id, { onDelete: 'set null' }),
    relatedAppointmentId: uuid('related_appointment_id').references(() => aivitaAppointments.id, { onDelete: 'set null' }),
    isRead: boolean('is_read').notNull().default(false),
    isPushed: boolean('is_pushed').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    doctorIdx: index('doctor_notifs_doctor_idx').on(table.doctorId, table.createdAt),
    unreadIdx: index('doctor_notifs_unread_idx').on(table.doctorId, table.isRead),
  })
);

// ─── 9. prescription_templates ─────────────────────────────────────────────────

export const prescriptionTemplates = pgTable(
  'prescription_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id').references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    // null = глобальный шаблон от admin
    isGlobal: boolean('is_global').notNull().default(false),
    type: text('type').notNull(),
    // 'medication' | 'test' | 'procedure'
    title: text('title').notNull(),
    details: text('details'),
    frequency: text('frequency'),
    durationDays: integer('duration_days'),
    category: text('category'),
    // "Эндокринология", "Кардиология"
    usageCount: integer('usage_count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    doctorIdx: index('prescription_templates_doctor_idx').on(table.doctorId),
    globalIdx: index('prescription_templates_global_idx').on(table.isGlobal, table.category),
  })
);

// ─── 10. doctor_notes ──────────────────────────────────────────────────────────

export const doctorNotes = pgTable(
  'doctor_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id').references(() => aivitaAppointments.id, { onDelete: 'set null' }),
    text: text('text').notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    doctorPatientIdx: index('doctor_notes_dp_idx').on(table.doctorId, table.patientId),
  })
);

// ─── 11. aivita_referrals ──────────────────────────────────────────────────────

export const aivitaReferrals = pgTable(
  'aivita_referrals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromDoctorId: uuid('from_doctor_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    toDoctorId: uuid('to_doctor_id').references(() => aivitaUsers.id, { onDelete: 'set null' }),
    toSpecialization: text('to_specialization'),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id').references(() => aivitaAppointments.id, { onDelete: 'set null' }),
    reason: text('reason'),
    urgency: text('urgency').notNull().default('routine'),
    // 'routine' | 'soon' | 'urgent'
    status: text('status').notNull().default('pending'),
    // 'pending' | 'accepted' | 'declined' | 'completed'
    acceptedAt: timestamp('accepted_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    fromDoctorIdx: index('referrals_from_doctor_idx').on(table.fromDoctorId),
    toDoctorIdx: index('referrals_to_doctor_idx').on(table.toDoctorId),
    patientIdx: index('referrals_patient_idx').on(table.patientId),
  })
);

// ─── 12. aivita_subscriptions ──────────────────────────────────────────────────

export const aivitaSubscriptions = pgTable(
  'aivita_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' })
      .unique(),
    plan: text('plan').notNull().default('free'),
    roleType: text('role_type').notNull(),
    // 'patient' | 'doctor'
    startedAt: timestamp('started_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at'),
    isActive: boolean('is_active').notNull().default(true),
    paymentMethod: text('payment_method'),
    lastPaymentAt: timestamp('last_payment_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('aivita_subscriptions_user_idx').on(table.userId),
    activeIdx: index('aivita_subscriptions_active_idx').on(table.isActive, table.expiresAt),
  })
);

// ─── Doctor Consultations (AI Scribe) ─────────────────────────────────────────

export const doctorConsultations = pgTable(
  'doctor_consultations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    transcript: text('transcript'),
    protocol: jsonb('protocol').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    doctorIdx:  index('consult_doctor_idx').on(table.doctorId),
    patientIdx: index('consult_patient_idx').on(table.patientId),
  })
);

// ─── Doctor ↔ Patient Conversations ───────────────────────────────────────────

export const doctorConversations = pgTable(
  'doctor_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'), // active | closed | archived
    lastMessageAt: timestamp('last_message_at').defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    patientIdx:  index('conv_patient_idx').on(table.patientId),
    doctorIdx:   index('conv_doctor_idx').on(table.doctorId),
    uniquePair:  unique('conv_unique_pair').on(table.patientId, table.doctorId),
  })
);

export const doctorMessages = pgTable(
  'doctor_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => doctorConversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    senderRole: text('sender_role').notNull(), // patient | doctor
    // text | image | audio | file | prescription | referral
    type: text('type').notNull().default('text'),
    content: text('content'),
    attachmentUrl:  text('attachment_url'),
    attachmentName: text('attachment_name'),
    attachmentMime: text('attachment_mime'),
    // prescription: {drug, dosage, frequency, duration}
    // referral:     {labName, tests[]}
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    convCreatedIdx: index('msg_conv_created_idx').on(table.conversationId, table.createdAt),
  })
);
