import { pgTable, uuid, text, boolean, timestamp, integer, inet, pgEnum, serial, varchar, jsonb } from 'drizzle-orm/pg-core';

// 'admin' and 'viewer' are legacy values, kept (not removed) so the one
// existing inactive account (role='admin') stays valid without being
// touched — see docs/rbac-model.md §7. The eight after them are the
// target roles from docs/rbac-model.md §6; 'superadmin' already existed.
export const adminRoleEnum = pgEnum('admin_role', [
  'superadmin', 'admin', 'viewer',
  'director', 'support_operator', 'accountant', 'developer',
  'marketer', 'medsoft_seller', 'hr',
]);

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  fullName: text('full_name').notNull(),
  role: adminRoleEnum('role').notNull().default('admin'),
  isActive: boolean('is_active').notNull().default(true),

  // Password-based auth (replaces magic-link + TOTP)
  passwordHash: text('password_hash'),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),

  // TOTP 2FA — actively used, not legacy: apps/api/src/routes/auth.ts's
  // /login checks totpSecret + totpActivatedAt on every login for anyone
  // who has enabled it (routes/auth.ts's /2fa/setup + /2fa/confirm), and
  // /2fa/disable clears both. backupCodesHash/backupCodesUsedCount below
  // are the exception — those two really are unused: no generate/verify
  // flow exists anywhere, so losing the authenticator device today has no
  // self-service recovery path (password reset doesn't touch TOTP).
  totpSecret: text('totp_secret'),
  totpActivatedAt: timestamp('totp_activated_at', { withTimezone: true }),
  backupCodesHash: text('backup_codes_hash').array(),
  backupCodesUsedCount: integer('backup_codes_used_count').notNull().default(0),

  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastLoginIp: text('last_login_ip'),

  // Profile
  avatarUrl: text('avatar_url'),
  locale: varchar('locale', { length: 5 }).notNull().default('ru'),
  /** 'offline' | 'online'. Читает автоответ вне часов: есть ли хоть кто-то на смене. */
  shiftStatus: varchar('shift_status', { length: 20 }).notNull().default('offline'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adminSessions = pgTable('admin_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: uuid('admin_user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),

  refreshTokenHash: text('refresh_token_hash').notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),

  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AdminPermissions = {
  dashboard?: boolean;
  users_read?: boolean;
  users_edit?: boolean;
  users_delete?: boolean;
  doctors_verify?: boolean;
  finance_read?: boolean;
  finance_edit?: boolean;
  payouts?: boolean;
  marketing?: boolean;
  settings?: boolean;
  roles?: boolean;
  ai_settings?: boolean;
  system?: boolean;
};

export const adminRoles = pgTable('admin_roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  // Legacy — the 13 cosmetic checkboxes on settings/roles/page.tsx. Not a
  // real gate anywhere (docs/rbac-model.md §2). Left as-is, untouched by
  // the RBAC foundation: changing its shape would break that live CRUD
  // screen, which still reads/writes exactly this format.
  permissions: jsonb('permissions').$type<AdminPermissions>().notNull().default({}),
  // Real RBAC catalog (docs/rbac-model.md §3/§6): the actual right slugs
  // (e.g. 'main:read', 'aivita:doctors_manage') granted to this role.
  // Deliberately a separate column from `permissions` above, not a
  // replacement of it — see the comment there. Not read by any route yet.
  rights: jsonb('rights').$type<string[]>().notNull().default([]),
  // Stale pre-RBAC-foundation rows (admin/moderator/support/marketing/
  // finance) are flagged here, not deleted: admin_user_roles has 0
  // references to them so deleting costs nothing functionally, but the
  // settings/roles screen or something unaudited might still read them,
  // and a prod DELETE isn't reversible. Removal is a separate, later task
  // once nothing is found looking at them.
  isDeprecated: boolean('is_deprecated').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adminUserRoles = pgTable('admin_user_roles', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => adminRoles.id, { onDelete: 'cascade' }),
  // "Оператор поддержки (старший)" isn't a 9th role — it's this flag on a
  // support_operator assignment, granting the senior extra rights on top
  // of the base role (docs/rbac-model.md §6). Meaningless for other roles.
  isSenior: boolean('is_senior').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
