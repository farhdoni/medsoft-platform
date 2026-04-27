export const ADMIN_ROLES = ['superadmin', 'admin', 'viewer'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export const PATIENT_STATUSES = ['pending_verification', 'active', 'suspended', 'premium'] as const;
export type PatientStatus = typeof PATIENT_STATUSES[number];

export const BLOOD_GROUPS = ['O_minus', 'O_plus', 'A_minus', 'A_plus', 'B_minus', 'B_plus', 'AB_minus', 'AB_plus', 'unknown'] as const;
export type BloodGroup = typeof BLOOD_GROUPS[number];

export const DOCTOR_STATUSES = ['pending', 'active', 'suspended', 'offline'] as const;
export type DoctorStatus = typeof DOCTOR_STATUSES[number];

export const CLINIC_TYPES = ['hospital', 'clinic', 'laboratory', 'pharmacy', 'diagnostic_center'] as const;
export type ClinicType = typeof CLINIC_TYPES[number];

export const CLINIC_STATUSES = ['pending', 'active', 'suspended'] as const;
export type ClinicStatus = typeof CLINIC_STATUSES[number];

export const APPOINTMENT_TYPES = ['telemedicine_video', 'telemedicine_chat', 'offline_clinic', 'home_visit'] as const;
export type AppointmentType = typeof APPOINTMENT_TYPES[number];

export const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled_by_patient', 'cancelled_by_doctor', 'no_show'] as const;
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number];

export const TRANSACTION_TYPES = ['deposit_topup', 'appointment_payment', 'refund', 'withdrawal', 'commission_to_clinic', 'bonus'] as const;
export type TransactionType = typeof TRANSACTION_TYPES[number];

export const TRANSACTION_STATUSES = ['pending', 'completed', 'failed', 'refunded', 'cancelled'] as const;
export type TransactionStatus = typeof TRANSACTION_STATUSES[number];

export const PAYMENT_PROVIDERS = ['click', 'payme', 'uzcard', 'humo', 'internal_deposit', 'manual'] as const;
export type PaymentProvider = typeof PAYMENT_PROVIDERS[number];

export const SOS_STATUSES = ['triggered', 'operator_assigned', 'brigade_dispatched', 'in_progress', 'resolved', 'false_alarm', 'cancelled'] as const;
export type SosStatus = typeof SOS_STATUSES[number];

export const LANGUAGES = ['uz', 'ru', 'en', 'oz'] as const;
export type Language = typeof LANGUAGES[number];

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = typeof GENDERS[number];
