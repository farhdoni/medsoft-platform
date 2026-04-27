import { z } from 'zod';
import { DOCTOR_STATUSES, LANGUAGES } from '../constants';

export const createDoctorSchema = z.object({
  phone: z.string().min(9).max(20),
  email: z.string().email(),
  fullName: z.string().min(2).max(255),
  specialization: z.string().min(2).max(255),
  secondarySpecializations: z.array(z.string()).default([]),
  licenseNumber: z.string().min(3).max(100),
  yearsOfExperience: z.number().int().min(0).default(0),
  clinicId: z.string().uuid().optional(),
  consultationPriceUzs: z.number().min(0).default(0),
  acceptsTelemedicine: z.boolean().default(true),
  acceptsOffline: z.boolean().default(true),
  status: z.enum(DOCTOR_STATUSES).default('pending'),
  bio: z.string().max(2000).optional(),
  photoUrl: z.string().url().optional(),
  education: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  languages: z.array(z.enum(LANGUAGES)).default(['uz', 'ru']),
});

export const updateDoctorSchema = createDoctorSchema.partial();

export const doctorFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(DOCTOR_STATUSES).optional(),
  clinicId: z.string().uuid().optional(),
  specialization: z.string().optional(),
  acceptsTelemedicine: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type DoctorFilters = z.infer<typeof doctorFiltersSchema>;
