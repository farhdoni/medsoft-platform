'use client';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: 'superadmin' | 'admin' | 'viewer';
  isActive: boolean;
}

export function getRedirectAfterLogin() {
  return '/dashboard';
}
