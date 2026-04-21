import { z } from 'zod';
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '../constants';

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  clinicId: z.string().uuid().optional().nullable(),
  type: z.enum(APPOINTMENT_TYPES),
  status: z.enum(APPOINTMENT_STATUSES).default('scheduled'),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).default(30),
  priceUzs: z.string(),
  isPaid: z.boolean().default(false),
  patientComplaint: z.string().optional().nullable(),
  doctorNotes: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  prescription: z.string().optional().nullable(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentDto = z.infer<typeof updateAppointmentSchema>;
