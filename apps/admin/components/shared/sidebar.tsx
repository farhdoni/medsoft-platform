'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Stethoscope, Building2, Calendar,
  CreditCard, AlertTriangle, Bot, ChevronRight,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/patients', label: 'Пациенты', icon: Users },
  { href: '/doctors', label: 'Врачи', icon: Stethoscope },
  { href: '/clinics', label: 'Клиники', icon: Building2 },
  { href: '/appointments', label: 'Приёмы', icon: Calendar },
  { href: '/transactions', label: 'Транзакции', icon: CreditCard },
  { href: '/sos-calls', label: 'SOS-вызовы', icon: AlertTriangle },
  { href: '/ai-logs', label: 'AI-логи', icon: Bot },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex h-full w-60 flex-col border-r bg-card">
      <div className="flex h-14 items-center px-4 border-b font-semibold text-lg tracking-tight">
        MedSoft
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              path === href || path.startsWith(href + '/')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
            {(path === href || path.startsWith(href + '/')) && (
              <ChevronRight className="ml-auto h-3 w-3 opacity-50" />
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
