'use client';

import Link from 'next/link';
import { Globe, Link2, HelpCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const TABS = [
  { href: '/content/landing', key: 'tabLanding', icon: Globe },
  { href: '/content/social', key: 'tabSocial', icon: Link2 },
  { href: '/content/faq', key: null, label: 'FAQ', icon: HelpCircle },
];

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const tabs = TABS.map(x => ({ href: x.href, label: x.key ? t.content[x.key] : x.label, icon: x.icon }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.content.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.content.subtitle}</p>
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
