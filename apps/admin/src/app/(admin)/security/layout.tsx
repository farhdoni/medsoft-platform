import Link from 'next/link';
import { Activity, Ban } from 'lucide-react';

const tabs = [
  { href: '/security/auth-logs', label: 'Журнал входов', icon: Activity },
  { href: '/security/blocked-ips', label: 'Блокировки IP', icon: Ban },
];

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Безопасность</h1>
        <p className="text-sm text-muted-foreground mt-1">Мониторинг входов, блокировка IP-адресов</p>
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
