import { z } from 'zod';
import { ADMIN_ROLES } from '../constants';

export const createAdminSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(255),
  role: z.enum(ADMIN_ROLES).default('admin'),
  isActive: z.boolean().default(true),
});

export const updateAdminSchema = createAdminSchema.partial();

export type CreateAdminDto = z.infer<typeof createAdminSchema>;
export type UpdateAdminDto = z.infer<typeof updateAdminSchema>;
