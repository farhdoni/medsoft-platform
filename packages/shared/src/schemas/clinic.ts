import { z } from 'zod';
import { CLINIC_STATUSES, CLINIC_TYPES } from '../constants';

export const createClinicSchema = z.object({
  name: z.string().min(2),
  type: z.enum(CLINIC_TYPES).default('clinic'),
  status: z.enum(CLINIC_STATUSES).default('pending'),
  address: z.string().min(5),
  city: z.string().min(2),
  district: z.string().optional().nullable(),
  locationLat: z.string().optional().nullable(),
  locationLng: z.string().optional().nullable(),
  phone: z.string().min(9),
  email: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable(),
  contractNumber: z.string().optional().nullable(),
  contractSignedAt: z.string().optional().nullable(),
  commissionPercent: z.string().default('0'),
  logoUrl: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  workingHours: z.record(z.string()).optional().nullable(),
});

export const updateClinicSchema = createClinicSchema.partial();

export type CreateClinicDto = z.infer<typeof createClinicSchema>;
export type UpdateClinicDto = z.infer<typeof updateClinicSchema>;
