import { z } from 'zod';
import { BLOOD_GROUPS, PATIENT_STATUSES } from '../constants';

export const createPatientSchema = z.object({
  phone: z.string().min(9).max(20),
  email: z.string().email().optional().nullable(),
  fullName: z.string().min(2).max(255),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  passportNumber: z.string().optional().nullable(),
  pinfl: z.string().length(14).optional().nullable(),
  status: z.enum(PATIENT_STATUSES).default('pending_verification'),
  bloodGroup: z.enum(BLOOD_GROUPS).optional().default('unknown'),
  allergies: z.array(z.string()).optional().default([]),
  chronicConditions: z.array(z.string()).optional().default([]),
  currentMedications: z.array(z.string()).optional().default([]),
  guardianPatientId: z.string().uuid().optional().nullable(),
  isMinor: z.boolean().default(false),
  depositBalance: z.string().optional().default('0'),
  depositCurrency: z.string().default('UZS'),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  preferredLanguage: z.enum(['uz', 'ru', 'en', 'oz']).default('uz'),
  anamnesisVitaeCompleted: z.boolean().default(false),
});

export const updatePatientSchema = createPatientSchema.partial();

export type CreatePatientDto = z.infer<typeof createPatientSchema>;
export type UpdatePatientDto = z.infer<typeof updatePatientSchema>;
