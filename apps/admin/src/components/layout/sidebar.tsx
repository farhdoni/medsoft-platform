'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Stethoscope, Building2, Calendar,
  CreditCard, AlertTriangle, Shield, LogOut, Moon, Sun,
  Server, Globe, Banknote, UserCheck, Wallet, Settings2, Bell, UsersRound, BrainCircuit,
  Mail, MessageSquare, Share2, BarChart2, HelpCircle, Link2, Activity, Ban, FileText,
  Pill, FlaskConical, MessageCircle, AtSign, Globe2, Database, ScrollText, Settings,
  ChevronDown, User,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type AdminMe = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string | null;
};

// All nav items — section:'main' = top collapsible group
const baseNavItems = [
  { href: '/dashboard',            labelKey: 'dashboard',    icon: LayoutDashboard, section: 'main' },
  { href: '/patients',             labelKey: 'patients',     icon: Users,           section: 'main' },
  { href: '/doctors',              labelKey: 'doctors',      icon: Stethoscope,     section: 'main' },
  { href: '/clinics',              labelKey: 'clinics',      icon: Building2,       section: 'main' },
  { href: '/appointments',         labelKey: 'appointments', icon: Calendar,        section: 'main' },
  { href: '/transactions',         labelKey: 'transactions', icon: CreditCard,      section: 'main' },
  { href: '/finance',              labelKey: 'finance',      icon: Banknote,        section: 'main' },
  { href: '/sos-calls',            labelKey: 'sosCalls',     icon: AlertTriangle,   section: 'main' },
  { href: '/monitoring',           labelKey: 'monitoring',   icon: Server,          section: 'main' },
  { href: '/cms',                  labelKey: 'cms',          icon: Globe,           section: 'main' },
  // ── ПОЛЬЗОВАТЕЛИ ──
  { href: '/users/patients',       label: 'Пациенты (Aivita)', icon: Users,         section: 'users' },
  { href: '/users/doctors',        label: 'Врачи (Aivita)',    icon: Stethoscope,   section: 'users' },
  // ── AIVITA ──
  { href: '/aivita/doctors',       label: 'Врачи AIVITA',      icon: UserCheck,     section: 'aivita' },
  { href: '/aivita/billing',       label: 'Биллинг',           icon: Wallet,        section: 'aivita' },
  { href: '/aivita/home-settings', label: 'Главная страница',  icon: Settings2,     section: 'aivita' },
  { href: '/aivita/notifications', label: 'Уведомления',       icon: Bell,          section: 'aivita' },
  // ── ПАРТНЁРЫ ──
  { href: '/partners/pharmacies',  label: 'Аптеки',            icon: Pill,          section: 'partners' },
  { href: '/partners/labs',        label: 'Лаборатории',       icon: FlaskConical,  section: 'partners' },
  { href: '/partners/clinics',     label: 'Клиники',           icon: Building2,     section: 'partners' },
  // ── МАРКЕТИНГ ──
  { href: '/marketing/email',      label: 'Email рассылки',    icon: Mail,          section: 'marketing' },
  { href: '/marketing/push',       label: 'Push уведомления',  icon: MessageSquare, section: 'marketing' },
  { href: '/marketing/referrals',  label: 'Реферальная',       icon: Share2,        section: 'marketing' },
  { href: '/marketing/analytics',  label: 'Аналитика',         icon: BarChart2,     section: 'marketing' },
  // ── КОНТЕНТ ──
  { href: '/content/landing',      label: 'Лендинг',           icon: Globe,         section: 'content' },
  { href: '/content/social',       label: 'Соцсети',           icon: Link2,         section: 'content' },
  { href: '/content/faq',          label: 'FAQ',               icon: HelpCircle,    section: 'content' },
  { href: '/content/clinics',      label: 'Заявки клиник',     icon: Building2,     section: 'content' },
  // ── БЕЗОПАСНОСТЬ ──
  { href: '/security/auth-logs',   label: 'Журнал входов',     icon: Activity,      section: 'security' },
  { href: '/security/blocked-ips', label: 'Блокировки IP',     icon: Ban,           section: 'security' },
  // ── ОТЧЁТЫ ──
  { href: '/reports',              label: 'Отчёты',            icon: FileText,      section: 'reports' },
  // ── СИСТЕМА ──
  { href: '/settings/general',     label: 'Общие',             icon: Settings,      section: 'system' },
  { href: '/settings/payments',    label: 'Платежи',           icon: CreditCard,    section: 'system' },
  { href: '/settings/sms',         label: 'SMS',               icon: MessageCircle, section: 'system' },
  { href: '/settings/email',       label: 'Email',             icon: AtSign,        section: 'system' },
  { href: '/settings/domains',     label: 'Домены',            icon: Globe2,        section: 'system' },
  { href: '/settings/backups',     label: 'Бэкапы',            icon: Database,      section: 'system' },
  { href: '/settings/logs',        label: 'Логи',              icon: ScrollText,    section: 'system' },
  // ── НАСТРОЙКИ ──
  { href: '/settings/roles',       label: 'Роли',              icon: Shield,        section: 'settings' },
  { href: '/settings/team',        label: 'Команда',           icon: UsersRound,    section: 'settings' },
  { href: '/settings/ai',          label: 'AI настройки',      icon: BrainCircuit,  section: 'settings' },
] as { href: string; label?: string; labelKey?: string; icon: React.ElementType; section: string }[];

const STORAGE_KEY = 'admin-sidebar-collapsed';

function MiniAvatar({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return <img src={src} alt={name} className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20 shrink-0" />;
  }
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-white/20 shrink-0">
      {initials || <User className="h-3.5 w-3.5" />}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCollapsed(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  // Auto-expand section that has the active page
  useEffect(() => {
    if (!pathname) return;
    const activeSection = navItems.find(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/'),
    )?.section;
    if (activeSection && collapsed[activeSection]) {
      toggleSection(activeSection);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleSection(section: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // ✅ Correct endpoint: /v1/auth/me
  const { data: me } = useQuery<AdminMe>({
    queryKey: ['admin-me'],
    queryFn: () => api.get('/v1/auth/me'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const sectionLabels: Record<string, string> = {
    main:      'ОСНОВНОЕ',
    aivita:    t.sections.aivita,
    users:     t.sections.users,
    partners:  t.sections.partners,
    marketing: t.sections.marketing,
    content:   t.sections.content,
    security:  t.sections.security,
    reports:   t.sections.reports,
    system:    t.sections.system,
    settings:  t.sections.settings,
  };

  // Add /admins for superadmin
  const navItems = [
    ...baseNavItems,
    ...(me?.role === 'superadmin'
      ? [{ href: '/admins', labelKey: 'admins', icon: Shield, section: 'main' }]
      : []),
  ];

  const sections = ['main', 'users', 'aivita', 'partners', 'marketing', 'content', 'security', 'reports', 'system', 'settings'];

  function getLabel(item: { label?: string; labelKey?: string }): string {
    if (item.labelKey) {
      return (t.nav as Record<string, string>)[item.labelKey] ?? item.labelKey;
    }
    return item.label ?? '';
  }

  async function handleLogout() {
    await api.post('/v1/auth/logout').catch(() => {});
    router.push('/auth/login');
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-white/10 px-6 shrink-0">
        <img src="/logo.png" alt="AIVITA" className="h-7 w-auto" />
        <span className="ml-2 text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50">Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {sections.map((section) => {
          const items = navItems.filter((item) => item.section === section);
          if (!items.length) return null;

          const isCollapsed = hydrated && !!collapsed[section];
          const hasActive = items.some(
            (item) => pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false),
          );

          return (
            <div key={section} className={section !== 'main' ? 'pt-2' : undefined}>
              {/* Section header */}
              <button
                type="button"
                onClick={() => toggleSection(section)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-1.5 rounded-md',
                  'text-[10px] font-bold uppercase tracking-widest transition-colors',
                  hasActive
                    ? 'text-sidebar-foreground/70 hover:text-white'
                    : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/60',
                )}
              >
                <span>{sectionLabels[section]}</span>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-200',
                    isCollapsed ? '-rotate-90' : 'rotate-0',
                  )}
                />
              </button>

              {/* Section items */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[800px] opacity-100',
                )}
              >
                <div className="space-y-0.5 pt-0.5">
                  {items.map((item) => {
                    const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {getLabel(item)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 shrink-0 space-y-1">
        {me && (
          <Link
            href="/account"
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
              pathname === '/account'
                ? 'bg-white/10 text-white'
                : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-white',
            )}
          >
            <MiniAvatar src={me.avatarUrl} name={me.fullName} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{me.fullName}</p>
              <p className="text-[10px] text-sidebar-foreground/50 capitalize">{me.role}</p>
            </div>
          </Link>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/70 hover:text-white hover:bg-white/5"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-sidebar-foreground/70 hover:text-white hover:bg-white/5"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t.nav.logout}
          </Button>
        </div>
      </div>
    </aside>
  );
}
