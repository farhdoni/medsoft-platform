import { z } from 'zod';
import { BLOOD_GROUPS, GENDERS, LANGUAGES, PATIENT_STATUSES } from '../constants';

export const createPatientSchema = z.object({
  phone: z.string().min(9).max(20),
  email: z.string().email().optional(),
  fullName: z.string().min(2).max(255),
  dateOfBirth: z.string().date().optional(),
  gender: z.enum(GENDERS).optional(),
  passportNumber: z.string().max(50).optional(),
  pinfl: z.string().length(14).optional(),
  status: z.enum(PATIENT_STATUSES).default('pending_verification'),
  bloodGroup: z.enum(BLOOD_GROUPS).default('unknown'),
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  currentMedications: z.array(z.string()).default([]),
  guardianPatientId: z.string().uuid().optional(),
  isMinor: z.boolean().default(false),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  preferredLanguage: z.enum(LANGUAGES).default('uz'),
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(PATIENT_STATUSES).optional(),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  isMinor: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientFilters = z.infer<typeof patientFiltersSchema>;
