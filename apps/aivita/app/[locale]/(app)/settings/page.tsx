import Link from 'next/link';
import { User, Target, Globe, Bell, Lock, Trash2, ChevronRight, LogOut } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { clearSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

const SETTINGS_SECTIONS = [
  {
    title: 'Аккаунт',
    items: [
      { icon: User, label: 'Личные данные', sub: 'Имя, дата рождения, фото', href: '/profile' },
      { icon: Target, label: 'Цели здоровья', sub: 'Вес, сон, активность', href: '#' },
      { icon: Globe, label: 'Язык', sub: 'Русский', href: '#' },
    ],
  },
  {
    title: 'Уведомления',
    items: [
      { icon: Bell, label: 'Push-уведомления', sub: 'Привычки, напоминания', href: '#' },
    ],
  },
  {
    title: 'Конфиденциальность',
    items: [
      { icon: Lock, label: 'Мои данные', sub: 'Экспорт, GDPR', href: '#' },
    ],
  },
];

async function signOut() {
  'use server';
  await clearSession();
  redirect('/ru/sign-in');
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <AppHeader name="Настройки" />

      <div className="px-5 space-y-5 pb-6">
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] mb-2 px-1">
              {section.title}
            </h3>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] overflow-hidden shadow-soft">
              {section.items.map((item, idx) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                    idx < section.items.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-[rgb(var(--text-secondary))]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy">{item.label}</p>
                    {item.sub && <p className="text-xs text-[rgb(var(--text-muted))]">{item.sub}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Danger zone */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] mb-2 px-1">
            Опасная зона
          </h3>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] overflow-hidden shadow-soft">
            <form action={signOut}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
              >
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-4 h-4 text-orange-500" />
                </div>
                <span className="text-sm font-medium text-orange-600">Выйти из аккаунта</span>
              </button>
            </form>
            <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-red-600">Удалить аккаунт</p>
                <p className="text-xs text-[rgb(var(--text-muted))]">Безвозвратно удалит все данные</p>
              </div>
            </button>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-[rgb(var(--text-muted))] pt-2">
          aivita v0.1.0 · demo build
        </p>
      </div>
    </div>
  );
}
