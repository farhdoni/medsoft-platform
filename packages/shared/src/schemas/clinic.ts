import { z } from 'zod';
import { CLINIC_STATUSES, CLINIC_TYPES } from '../constants';

const workingHoursSchema = z.record(
  z.string(),
  z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() })
).optional();

export const createClinicSchema = z.object({
  name: z.string().min(2).max(255),
  type: z.enum(CLINIC_TYPES).default('clinic'),
  status: z.enum(CLINIC_STATUSES).default('pending'),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  district: z.string().max(100).optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  phone: z.string().min(9).max(20),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  contractNumber: z.string().max(100).optional(),
  contractSignedAt: z.string().datetime().optional(),
  commissionPercent: z.number().min(0).max(100).default(0),
  logoUrl: z.string().url().optional(),
  description: z.string().max(2000).optional(),
  workingHours: workingHoursSchema,
});

export const updateClinicSchema = createClinicSchema.partial();

export const clinicFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(CLINIC_STATUSES).optional(),
  type: z.enum(CLINIC_TYPES).optional(),
  city: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateClinicInput = z.infer<typeof createClinicSchema>;
export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;
export type ClinicFilters = z.infer<typeof clinicFiltersSchema>;
