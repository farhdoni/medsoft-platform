'use client';

import Link from 'next/link';
import { Activity, Ban, Laptop } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const TABS = [
  { href: '/security/auth-logs', key: 'tabAuthLogs', icon: Activity },
  { href: '/security/blocked-ips', key: 'tabBlockedIps', icon: Ban },
  { href: '/security/sessions', key: 'tabSessions', icon: Laptop },
];

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const tabs = TABS.map((x) => ({ ...x, label: t.security[x.key] }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.security.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.security.subtitle}</p>
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
