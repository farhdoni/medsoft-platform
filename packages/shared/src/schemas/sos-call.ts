import { z } from 'zod';
import { SOS_STATUSES } from '../constants';

export const sosCallFiltersSchema = z.object({
  status: z.enum(SOS_STATUSES).optional(),
  patientId: z.string().uuid().optional(),
  assignedAdminId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateSosCallSchema = z.object({
  status: z.enum(SOS_STATUSES),
  assignedAdminId: z.string().uuid().optional(),
  operatorNotes: z.string().max(5000).optional(),
  resolutionSummary: z.string().max(2000).optional(),
});

export type SosCallFilters = z.infer<typeof sosCallFiltersSchema>;
export type UpdateSosCallInput = z.infer<typeof updateSosCallSchema>;
