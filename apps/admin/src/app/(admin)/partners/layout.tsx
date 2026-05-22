import Link from 'next/link';
import { Pill, FlaskConical, Building2 } from 'lucide-react';

const tabs = [
  { href: '/partners/pharmacies', label: 'Аптеки', icon: Pill },
  { href: '/partners/labs', label: 'Лаборатории', icon: FlaskConical },
  { href: '/partners/clinics', label: 'Клиники', icon: Building2 },
];

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Партнёры</h1>
        <p className="text-sm text-muted-foreground mt-1">Управление партнёрами платформы Aivita</p>
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
