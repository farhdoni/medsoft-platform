import Link from 'next/link';
import {
  User, Target, Globe, Bell, Lock, ChevronRight,
  Heart, Users, Cpu, HelpCircle, Stethoscope, Calendar, FileText, DollarSign, ShieldCheck,
} from 'lucide-react';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { DangerZone } from './danger-zone';
import { loadSettingsData } from './data';
import { getSession } from '@/lib/auth/session';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingItem = {
  icon: React.ElementType;
  label: string;
  sub?: string;
  value?: string;
  href: string;
  bg: string;
  color: string;
};

// ─── Row component ────────────────────────────────────────────────────────────

function SettingRow({ item, last }: { item: SettingItem; last: boolean }) {
  const rowClass = `flex items-center gap-3 px-4 py-3.5 transition-colors ${
    !last ? 'border-b border-border-soft' : ''
  }`;
  const inner = (
    <>
      <div
        className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center"
        style={{ background: item.bg }}
      >
        <item.icon className="w-4 h-4" style={{ color: item.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-text-primary">{item.label}</p>
        {item.sub && <p className="text-[11px] text-text-muted mt-0.5">{item.sub}</p>}
      </div>
      {item.value ? (
        <span className="text-[12px] text-text-muted flex-shrink-0 mr-1">{item.value}</span>
      ) : null}
      <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
    </>
  );
  if (!item.href || item.href === '#') {
    return <div className={`${rowClass} opacity-60`}>{inner}</div>;
  }
  return (
    <Link href={item.href} className={`${rowClass} hover:bg-bg-app`}>
      {inner}
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { localeLabel, notificationsOn } = await loadSettingsData();
  const session = await getSession();
  const isDoctor = session?.role === 'doctor';

  const DOCTOR_SECTIONS: Array<{ title: string; items: SettingItem[] }> = [
    {
      title: 'Аккаунт',
      items: [
        { icon: Stethoscope, label: 'Профиль врача',           sub: 'Специализация, фото, клиника',  href: `/${locale}/doctor-profile`, bg: '#dbeeff', color: '#4a7fb5' },
        { icon: ShieldCheck, label: 'Документы и верификация', sub: 'Диплом, лицензия, сертификаты', href: `/${locale}/doctor-profile`, bg: '#e8f4ec', color: '#2d7a56' },
      ],
    },
    {
      title: 'Практика',
      items: [
        { icon: Calendar,  label: 'Расписание по умолчанию', sub: 'Рабочие дни, часы, слоты',     href: `/${locale}/doctor-schedule`, bg: '#dbeeff', color: '#4a7fb5' },
        { icon: FileText,  label: 'Шаблоны назначений',      sub: 'Лекарства, анализы, процедуры', href: `/${locale}/doctor-prescriptions`, bg: '#e8f4ec', color: '#2d7a56' },
        { icon: DollarSign, label: 'Стоимость консультации', sub: 'Настроить цену приёма', href: `/${locale}/doctor-profile`, bg: '#fff3e8', color: '#c07038' },
      ],
    },
    {
      title: 'Приложение',
      items: [
        { icon: Globe, label: 'Язык',              sub: localeLabel,                           href: '#', value: localeLabel, bg: '#d4dff0', color: '#5e75a8' },
        { icon: Bell,  label: 'Уведомления',       sub: 'Приёмы, чаты, алерты пациентов',     href: '#', value: notificationsOn ? 'Вкл' : 'Выкл', bg: '#dbeeff', color: '#4a7fb5' },
        { icon: Lock,  label: 'Конфиденциальность', sub: 'Данные пациентов, экспорт',          href: `/${locale}/privacy`, bg: '#e8f4ec', color: '#2d7a56' },
      ],
    },
    {
      title: 'Прочее',
      items: [
        { icon: HelpCircle, label: 'Помощь',       sub: 'FAQ и поддержка',  href: 'https://t.me/aivita_uz', bg: '#f4f3ef', color: '#9a96a8' },
        { icon: Lock,       label: 'О приложении', sub: 'Aivita v0.1.0',    href: '#', value: 'v0.1.0', bg: '#f4f3ef', color: '#9a96a8' },
      ],
    },
  ];

  const PATIENT_SECTIONS: Array<{ title: string; items: SettingItem[] }> = [
    {
      title: 'Аккаунт',
      items: [
        { icon: User,   label: 'Профиль',          sub: 'Имя, дата рождения, пол',   href: `/${locale}/profile`, bg: 'var(--accent-light)', color: 'var(--accent-dark)' },
        { icon: Heart,  label: 'Мед. профиль',      sub: 'Аллергии, заболевания',     href: `/${locale}/profile`, bg: '#d4e8d8', color: '#548068' },
        { icon: Target, label: 'Цели здоровья',     sub: 'Шаги, сон, вода',           href: `/${locale}/profile`, bg: '#d4dff0', color: '#5e75a8' },
      ],
    },
    {
      title: 'Приложение',
      items: [
        { icon: Globe, label: 'Язык',          sub: localeLabel,                          href: '#', value: localeLabel, bg: '#d4dff0', color: '#5e75a8' },
        { icon: Bell,  label: 'Уведомления',   sub: 'Привычки, напоминания',              href: '#', value: notificationsOn ? 'Вкл' : 'Выкл', bg: 'var(--accent-bg-light)', color: 'var(--accent-dark)' },
        { icon: Lock,  label: 'Конфиденциальность', sub: 'Что видит семья, экспорт',     href: `/${locale}/privacy`, bg: '#d4e8d8', color: '#548068' },
      ],
    },
    {
      title: 'Здоровье',
      items: [
        { icon: Users, label: 'Семья',          sub: 'Члены и приглашения',   href: `/${locale}/family`, bg: 'var(--accent-bg-light)', color: 'var(--accent-dark)' },
        { icon: Cpu,   label: 'Гаджеты',        sub: 'Не подключено',         href: `/${locale}/gadgets`, bg: '#d4dff0', color: '#5e75a8' },
      ],
    },
    {
      title: 'Прочее',
      items: [
        { icon: HelpCircle, label: 'Помощь',          sub: 'FAQ и поддержка',    href: 'https://t.me/aivita_uz', bg: '#f4f3ef', color: '#9a96a8' },
        { icon: Lock,       label: 'О приложении',    sub: 'Aivita v0.1.0',      href: '#', value: 'v0.1.0', bg: '#f4f3ef', color: '#9a96a8' },
      ],
    },
  ];

  const SECTIONS = isDoctor ? DOCTOR_SECTIONS : PATIENT_SECTIONS;

  return (
    <PageShell active="" locale={locale}>
      <div className="max-w-[680px] mx-auto pb-6">

        {/* ── Title ────────────────────────────────────────────────────────── */}
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
            НАСТРОЙКИ
          </p>
          <h1 className="text-[22px] font-extrabold text-text-primary">
            {isDoctor ? 'Кабинет врача' : 'Управление аккаунтом'}
          </h1>
          {isDoctor && (
            <p className="text-[13px] text-text-muted mt-1">Профиль, практика, уведомления</p>
          )}
        </div>

        {/* ── Sections ─────────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2.5 px-0.5">
                {section.title}
              </p>
              <div className="rounded-card bg-white border border-border-soft overflow-hidden">
                {section.items.map((item, idx) => (
                  <SettingRow key={item.label} item={item} last={idx === section.items.length - 1} />
                ))}
              </div>
            </div>
          ))}

          {/* ── Danger zone ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2.5 px-0.5">
              Опасная зона
            </p>
            <DangerZone locale={locale} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
