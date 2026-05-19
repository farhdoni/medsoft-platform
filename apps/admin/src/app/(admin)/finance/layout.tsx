'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/finance',               label: 'Дашборд' },
  { href: '/finance/payments',      label: 'Платежи' },
  { href: '/finance/subscriptions', label: 'Подписки' },
  { href: '/finance/payouts/doctors',    label: 'Выплаты врачам' },
  { href: '/finance/payouts/pharmacies', label: 'Выплаты аптекам' },
  { href: '/finance/promo-codes',   label: 'Промокоды' },
  { href: '/finance/plans',         label: 'Тарифы' },
  { href: '/finance/settings',      label: 'Настройки' },
];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Финансы</h1>
        <p className="text-muted-foreground">Управление платежами, подписками и выплатами</p>
      </div>
      <nav className="flex gap-1 flex-wrap border-b border-border">
        {tabs.map(t => {
          const active = pathname === t.href || (t.href !== '/finance' && (pathname ?? '').startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors',
                active
                  ? 'border-primary text-primary bg-background'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div>{children}</div>
    </div>
  );
}
