import { z } from 'zod';
import { DOCTOR_STATUSES } from '../constants';

export const createDoctorSchema = z.object({
  phone: z.string().min(9).max(20),
  email: z.string().email(),
  fullName: z.string().min(2).max(255),
  specialization: z.string().min(2),
  secondarySpecializations: z.array(z.string()).optional().default([]),
  licenseNumber: z.string().min(3),
  yearsOfExperience: z.number().int().min(0).default(0),
  clinicId: z.string().uuid().optional().nullable(),
  consultationPriceUzs: z.string().default('0'),
  acceptsTelemedicine: z.boolean().default(true),
  acceptsOffline: z.boolean().default(true),
  status: z.enum(DOCTOR_STATUSES).default('pending'),
  isOnline: z.boolean().default(false),
  bio: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  education: z.array(z.string()).optional().default([]),
  certifications: z.array(z.string()).optional().default([]),
  languages: z.array(z.string()).default(['uz', 'ru']),
});

export const updateDoctorSchema = createDoctorSchema.partial();

export type CreateDoctorDto = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorDto = z.infer<typeof updateDoctorSchema>;
