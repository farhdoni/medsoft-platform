import { z } from 'zod';
import { PAYMENT_PROVIDERS, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '../constants';

export const createTransactionSchema = z.object({
  patientId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  clinicId: z.string().uuid().optional(),
  type: z.enum(TRANSACTION_TYPES),
  status: z.enum(TRANSACTION_STATUSES).default('pending'),
  provider: z.enum(PAYMENT_PROVIDERS),
  amountUzs: z.number().min(0),
  direction: z.enum(['debit', 'credit']),
  providerTransactionId: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
});

export const updateTransactionSchema = z.object({
  status: z.enum(TRANSACTION_STATUSES).optional(),
  providerTransactionId: z.string().max(255).optional(),
  providerResponse: z.string().optional(),
  description: z.string().max(1000).optional(),
});

export const transactionFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  provider: z.enum(PAYMENT_PROVIDERS).optional(),
  patientId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
