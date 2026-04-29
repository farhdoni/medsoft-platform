'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, MessageCircle, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/home', label: 'Главная', icon: Home },
  { href: '/habits', label: 'Привычки', icon: CheckSquare },
  { href: '/chat', label: 'AI', icon: MessageCircle },
  { href: '/profile', label: 'Я', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-[rgba(120,160,200,0.15)] pb-safe md:hidden">
      <div className="flex items-center justify-around py-2 max-w-sm mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.includes(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all min-w-[64px] ${
                active
                  ? 'text-pink-500'
                  : 'text-gray-400 hover:text-navy'
              }`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-2xl transition-all ${
                active ? 'bg-pink-50' : ''
              }`}>
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-pink-500' : ''}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
