import { z } from 'zod';
import { PAYMENT_PROVIDERS, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '../constants';

export const createTransactionSchema = z.object({
  patientId: z.string().uuid().optional().nullable(),
  appointmentId: z.string().uuid().optional().nullable(),
  clinicId: z.string().uuid().optional().nullable(),
  type: z.enum(TRANSACTION_TYPES),
  status: z.enum(TRANSACTION_STATUSES).default('pending'),
  provider: z.enum(PAYMENT_PROVIDERS),
  amountUzs: z.string(),
  direction: z.enum(['in', 'out']),
  description: z.string().optional().nullable(),
  providerTransactionId: z.string().optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
