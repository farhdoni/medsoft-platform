import { z } from 'zod';
import { ADMIN_ROLES } from '../constants';

export const createAdminSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(255),
  role: z.enum(ADMIN_ROLES).default('admin'),
});

export const updateAdminSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  isActive: z.boolean().optional(),
});

export const adminFiltersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  isActive: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sendMagicLinkSchema = z.object({
  email: z.string().email(),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1),
});

export const verifyTotpSchema = z.object({
  code: z.string().length(6).regex(/^\d+$/),
  tempToken: z.string().min(1),
});

export const activateTotpSchema = z.object({
  code: z.string().length(6).regex(/^\d+$/),
  tempToken: z.string().min(1),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type AdminFilters = z.infer<typeof adminFiltersSchema>;
export type SendMagicLinkInput = z.infer<typeof sendMagicLinkSchema>;
export type VerifyMagicLinkInput = z.infer<typeof verifyMagicLinkSchema>;
export type VerifyTotpInput = z.infer<typeof verifyTotpSchema>;
export type ActivateTotpInput = z.infer<typeof activateTotpSchema>;
