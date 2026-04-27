import { z } from 'zod';
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '../constants';

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  clinicId: z.string().uuid().optional(),
  type: z.enum(APPOINTMENT_TYPES),
  status: z.enum(APPOINTMENT_STATUSES).default('scheduled'),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(480).default(30),
  priceUzs: z.number().min(0),
  patientComplaint: z.string().max(2000).optional(),
  doctorNotes: z.string().max(5000).optional(),
  diagnosis: z.string().max(2000).optional(),
  prescription: z.string().max(5000).optional(),
  aiLogId: z.string().uuid().optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();

export const appointmentFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  type: z.enum(APPOINTMENT_TYPES).optional(),
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  clinicId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type AppointmentFilters = z.infer<typeof appointmentFiltersSchema>;
