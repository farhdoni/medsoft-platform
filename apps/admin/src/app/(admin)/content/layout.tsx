import Link from 'next/link';
import { Globe, Link2, HelpCircle } from 'lucide-react';

const tabs = [
  { href: '/content/landing', label: 'Лендинг', icon: Globe },
  { href: '/content/social', label: 'Соцсети', icon: Link2 },
  { href: '/content/faq', label: 'FAQ', icon: HelpCircle },
];

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Контент</h1>
        <p className="text-sm text-muted-foreground mt-1">Управление текстами, ссылками и FAQ сайта</p>
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
