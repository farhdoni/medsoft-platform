import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  User, Target, Globe, Bell, Lock, ChevronRight,
  Heart, Users, Cpu, HelpCircle, Stethoscope, Calendar, FileText, DollarSign, ShieldCheck,
} from 'lucide-react';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { DangerZone } from './danger-zone';
import { SettingsInteractive } from './SettingsInteractive';
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

type Section = { id: string; title: string; items: SettingItem[] };

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
  const { notificationsOn } = await loadSettingsData();
  const LOCALE_LABELS: Record<string, string> = { ru: 'Русский', uz: "O'zbek", en: 'English' };
  const localeLabel = LOCALE_LABELS[locale] ?? 'Русский';
  const session = await getSession();
  const isDoctor = session?.role === 'doctor';
  const t = await getTranslations('app.settings');

  const DOCTOR_SECTIONS: Section[] = [
    {
      id: 'account',
      title: t('sectionAccount'),
      items: [
        { icon: Stethoscope, label: t('doctorProfile'),  sub: t('doctorProfileSub'),  href: `/${locale}/doctor-profile`, bg: '#dbeeff', color: '#4a7fb5' },
        { icon: ShieldCheck, label: t('documents'),       sub: t('documentsSub'),       href: `/${locale}/doctor-profile`, bg: '#e8f4ec', color: '#2d7a56' },
      ],
    },
    {
      id: 'practice',
      title: t('sectionPractice'),
      items: [
        { icon: Calendar,   label: t('schedule'),         sub: t('scheduleSub'),         href: `/${locale}/doctor-schedule`,      bg: '#dbeeff', color: '#4a7fb5' },
        { icon: FileText,   label: t('prescriptions'),    sub: t('prescriptionsSub'),    href: `/${locale}/doctor-prescriptions`, bg: '#e8f4ec', color: '#2d7a56' },
        { icon: DollarSign, label: t('consultationCost'), sub: t('consultationCostSub'), href: `/${locale}/doctor-profile`,       bg: '#fff3e8', color: '#c07038' },
      ],
    },
    {
      id: 'app',
      title: t('sectionApp'),
      items: [
        { icon: Globe, label: t('language'),      sub: localeLabel,                     href: '#', value: localeLabel,                                           bg: '#d4dff0', color: '#5e75a8' },
        { icon: Bell,  label: t('notifications'), sub: t('notificationsSubDoctor'),     href: '#', value: notificationsOn ? t('notifOn') : t('notifOff'),        bg: '#dbeeff', color: '#4a7fb5' },
        { icon: Lock,  label: t('privacy'),       sub: t('privacySubDoctor'),           href: `/${locale}/privacy`,                                              bg: '#e8f4ec', color: '#2d7a56' },
      ],
    },
    {
      id: 'other',
      title: t('sectionOther'),
      items: [
        { icon: HelpCircle, label: t('help'),  sub: t('helpSub'),   href: 'https://t.me/aivita_uz', bg: '#f4f3ef', color: '#9a96a8' },
        { icon: Lock,       label: t('about'), sub: 'Aivita v0.1.0', href: '#', value: 'v0.1.0',     bg: '#f4f3ef', color: '#9a96a8' },
      ],
    },
  ];

  const PATIENT_SECTIONS: Section[] = [
    {
      id: 'account',
      title: t('sectionAccount'),
      items: [
        { icon: User,   label: t('profile'),     sub: t('profileSub'),     href: `/${locale}/profile`, bg: 'var(--accent-light)', color: 'var(--accent-dark)' },
        { icon: Heart,  label: t('medProfile'),  sub: t('medProfileSub'),  href: `/${locale}/profile`, bg: '#d4e8d8',             color: '#548068' },
        { icon: Target, label: t('healthGoals'), sub: t('healthGoalsSub'), href: `/${locale}/profile`, bg: '#d4dff0',             color: '#5e75a8' },
      ],
    },
    {
      id: 'app',
      title: t('sectionApp'),
      items: [
        { icon: Globe, label: t('language'),      sub: localeLabel,                 href: '#', value: localeLabel,                                       bg: '#d4dff0',               color: '#5e75a8' },
        { icon: Bell,  label: t('notifications'), sub: t('notificationsSub'),       href: '#', value: notificationsOn ? t('notifOn') : t('notifOff'),    bg: 'var(--accent-bg-light)', color: 'var(--accent-dark)' },
        { icon: Lock,  label: t('privacy'),       sub: t('privacySub'),             href: `/${locale}/privacy`,                                          bg: '#d4e8d8',               color: '#548068' },
      ],
    },
    {
      id: 'health',
      title: t('sectionHealth'),
      items: [
        { icon: Users, label: t('family'),  sub: t('familySub'),  href: `/${locale}/family`,  bg: 'var(--accent-bg-light)', color: 'var(--accent-dark)' },
        { icon: Cpu,   label: t('gadgets'), sub: t('gadgetsSub'), href: `/${locale}/gadgets`, bg: '#d4dff0',               color: '#5e75a8' },
      ],
    },
    {
      id: 'other',
      title: t('sectionOther'),
      items: [
        { icon: HelpCircle, label: t('help'),  sub: t('helpSub'),    href: 'https://t.me/aivita_uz', bg: '#f4f3ef', color: '#9a96a8' },
        { icon: Lock,       label: t('about'), sub: 'Aivita v0.1.0', href: '#', value: 'v0.1.0',      bg: '#f4f3ef', color: '#9a96a8' },
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
            {t('pageEyebrow')}
          </p>
          <h1 className="text-[22px] font-extrabold text-text-primary">
            {isDoctor ? t('pageTitleDoctor') : t('pageTitle')}
          </h1>
          {isDoctor && (
            <p className="text-[13px] text-text-muted mt-1">{t('doctorSubtitle')}</p>
          )}
        </div>

        {/* ── Sections ─────────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.id}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2.5 px-0.5">
                {section.title}
              </p>
              {section.id === 'app' ? (
                /* Language + Notifications + Navigation rendered as interactive client component */
                <SettingsInteractive locale={locale} localeLabel={localeLabel} notificationsOn={notificationsOn} />
              ) : (
                <div className="rounded-card bg-white border border-border-soft overflow-hidden">
                  {section.items.map((item, idx) => (
                    <SettingRow key={item.label} item={item} last={idx === section.items.length - 1} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* ── Danger zone ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2.5 px-0.5">
              {t('dangerZone')}
            </p>
            <DangerZone locale={locale} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
