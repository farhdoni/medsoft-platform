'use client';

import Link from 'next/link';
import { Mail, MessageSquare, Share2, BarChart2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const TABS = [
  { href: '/marketing/email', key: 'tabEmail', icon: Mail },
  { href: '/marketing/push', key: 'tabPush', icon: MessageSquare },
  { href: '/marketing/referrals', key: 'tabReferrals', icon: Share2 },
  { href: '/marketing/analytics', key: 'tabAnalytics', icon: BarChart2 },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const tabs = TABS.map(x => ({ href: x.href, label: t.marketing[x.key], icon: x.icon }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.marketing.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.marketing.subtitle}</p>
      </div>
      <div className="flex gap-1 border-b">
        {tabs.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-muted-foreground/30 transition-colors"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
