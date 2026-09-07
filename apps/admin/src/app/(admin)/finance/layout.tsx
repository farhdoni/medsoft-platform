'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

const TABS = [
  { href: '/finance',                     key: 'dashboard' },
  { href: '/finance/payments',            key: 'tabPayments' },
  { href: '/finance/subscriptions',       key: 'tabSubscriptions' },
  { href: '/finance/payouts/doctors',     key: 'tabPayoutsDoctors' },
  { href: '/finance/payouts/pharmacies',  key: 'tabPayoutsPharm' },
  { href: '/finance/promo-codes',         key: 'tabPromoCodes' },
  { href: '/finance/plans',               key: 'tabPlans' },
  { href: '/finance/settings',            key: 'tabSettings' },
];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const tabs = TABS.map((x) => ({ href: x.href, label: x.key === 'dashboard' ? t.nav.dashboard : t.finance[x.key] }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.finance.title}</h1>
        <p className="text-muted-foreground">{t.finance.subtitle}</p>
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
