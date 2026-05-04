import Link from 'next/link';
import { User, Target, Globe, Bell, Lock, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DangerZone } from './danger-zone';

const SETTINGS_SECTIONS = [
  {
    title: 'Аккаунт',
    accentColor: '#cc8a96',
    items: [
      { icon: User, label: 'Личные данные', sub: 'Имя, дата рождения, фото', href: '/profile', bg: '#f0d4dc', color: '#9c5e6c' },
      { icon: Target, label: 'Цели здоровья', sub: 'Вес, сон, активность', href: '#', bg: '#d4e8d8', color: '#548068' },
      { icon: Globe, label: 'Язык', sub: 'Русский', href: '#', bg: '#d4dff0', color: '#5e75a8' },
    ],
  },
  {
    title: 'Уведомления',
    accentColor: '#9889c4',
    items: [
      { icon: Bell, label: 'Push-уведомления', sub: 'Привычки, напоминания', href: '#', bg: '#e0d8f0', color: '#6e5fa0' },
    ],
  },
  {
    title: 'Конфиденциальность',
    accentColor: '#80b094',
    items: [
      { icon: Lock, label: 'Мои данные', sub: 'Экспорт, GDPR', href: '#', bg: '#d4e8d8', color: '#548068' },
    ],
  },
];

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="max-w-[760px] mx-auto px-4 md:px-6">
      <PageHeader
        title="Настройки"
        subtitle="Управление аккаунтом и приложением"
        accentColor="#9a96a8"
      />

      <div className="space-y-5 pb-8">
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title}>
            <p
              className="text-[11px] font-bold uppercase tracking-wider mb-2.5 px-0.5"
              style={{ color: '#9a96a8' }}
            >
              {section.title}
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: '#ffffff', border: '1px solid #e8e4dc' }}
            >
              {section.items.map((item, idx) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#f4f3ef]"
                  style={idx < section.items.length - 1 ? { borderBottom: '1px solid #f4f3ef' } : {}}
                >
                  {/* Icon tile */}
                  <div
                    className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center"
                    style={{ background: item.bg }}
                  >
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>

                  <div className="flex-1">
                    <p className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>
                      {item.label}
                    </p>
                    {item.sub && (
                      <p className="text-[11px] mt-0.5" style={{ color: '#9a96a8' }}>
                        {item.sub}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#9a96a8' }} />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Danger zone */}
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-wider mb-2.5 px-0.5"
            style={{ color: '#9a96a8' }}
          >
            Опасная зона
          </p>
          <DangerZone locale={locale} />
        </div>

        <p className="text-center text-[11px] pt-2" style={{ color: '#9a96a8' }}>
          aivita v0.1.0 · demo build
        </p>
      </div>
    </div>
  );
}
