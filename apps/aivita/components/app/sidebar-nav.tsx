'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Shield, MessageCircle, CheckSquare,
  Utensils, Users, FileText, Settings, Bell,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';

const NAV_ITEMS = [
  { href: '/home', label: 'Главная', icon: Home },
  { href: '/test', label: 'Тест 5 систем', icon: Shield },
  { href: '/chat', label: 'AI-чат', icon: MessageCircle },
  { href: '/habits', label: 'Привычки', icon: CheckSquare },
  { href: '/nutrition', label: 'Питание', icon: Utensils },
  { href: '/family', label: 'Семья', icon: Users },
  { href: '/report', label: 'Отчёт врачу', icon: FileText },
  { href: '/notifications', label: 'Уведомления', icon: Bell },
  { href: '/settings', label: 'Настройки', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen bg-white/80 backdrop-blur-xl border-r border-[rgba(120,160,200,0.15)] flex-shrink-0">
      {/* Logo */}
      <div className="p-5 pb-4 border-b border-[rgba(120,160,200,0.1)]">
        <Logo />
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.includes(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-r from-pink-50 to-blue-50 text-navy border border-pink-100'
                  : 'text-[rgb(var(--text-secondary))] hover:bg-gray-50 hover:text-navy'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                active ? 'bg-gradient-pink-blue-mint' : 'bg-gray-100'
              }`}>
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-500'}`} />
              </div>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Profile bottom */}
      <div className="p-4 border-t border-[rgba(120,160,200,0.1)]">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-pink-blue-mint flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            А
          </div>
          <div>
            <p className="text-sm font-medium text-navy">Азиз</p>
            <p className="text-xs text-[rgb(var(--text-muted))]">demo@aivita.uz</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
