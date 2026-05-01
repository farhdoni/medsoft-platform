'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Stethoscope, Building2, Calendar,
  CreditCard, AlertTriangle, Shield, LogOut, Moon, Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

type AdminMe = { id: string; email: string; fullName: string; role: string; isActive: boolean };

const baseNavItems = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/patients', label: 'Пациенты aivita', icon: Users },
  { href: '/doctors', label: 'Врачи', icon: Stethoscope },
  { href: '/clinics', label: 'Клиники', icon: Building2 },
  { href: '/appointments', label: 'Приёмы', icon: Calendar },
  { href: '/transactions', label: 'Транзакции', icon: CreditCard },
  { href: '/sos-calls', label: 'SOS вызовы', icon: AlertTriangle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const { data: me } = useQuery<AdminMe>({
    queryKey: ['admin-me'],
    queryFn: () => api.get('/v1/admins/me'),
    staleTime: 5 * 60 * 1000, // 5 min — role doesn't change often
    retry: false,
  });

  const navItems = [
    ...baseNavItems,
    ...(me?.role === 'superadmin' ? [{ href: '/admins', label: 'Админы', icon: Shield }] : []),
  ];

  async function handleLogout() {
    await api.post('/v1/auth/logout').catch(() => {});
    router.push('/auth/login');
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">M</div>
        <span className="text-lg font-semibold">MedSoft Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-white/10 text-white'
                : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        {me && (
          <div className="px-3 py-1.5 text-xs text-sidebar-foreground/50 truncate">
            {me.fullName} · <span className="capitalize">{me.role}</span>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/70 hover:text-white hover:bg-white/5"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-sidebar-foreground/70 hover:text-white hover:bg-white/5"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>
    </aside>
  );
}
