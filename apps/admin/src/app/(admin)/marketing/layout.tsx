import Link from 'next/link';
import { Mail, MessageSquare, Share2, BarChart2 } from 'lucide-react';

const tabs = [
  { href: '/marketing/email', label: 'Email рассылки', icon: Mail },
  { href: '/marketing/push', label: 'Push уведомления', icon: MessageSquare },
  { href: '/marketing/referrals', label: 'Реферальная', icon: Share2 },
  { href: '/marketing/analytics', label: 'Аналитика', icon: BarChart2 },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Маркетинг</h1>
        <p className="text-sm text-muted-foreground mt-1">Рассылки, push-уведомления, реферальная программа</p>
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
