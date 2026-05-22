'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Stethoscope, Building2, Calendar,
  CreditCard, AlertTriangle, Shield, LogOut, Moon, Sun,
  Server, Globe, Banknote, UserCheck, Wallet, Settings2, Bell, UsersRound, BrainCircuit,
  Mail, MessageSquare, Share2, BarChart2, HelpCircle, Link2, Activity, Ban, FileText,
  Pill, FlaskConical, MessageCircle, AtSign, Globe2, Database, ScrollText, Settings,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

type AdminMe = { id: string; email: string; fullName: string; role: string; isActive: boolean };

const baseNavItems = [
  { href: '/dashboard',             label: 'Дашборд',          icon: LayoutDashboard, section: null },
  { href: '/patients',              label: 'Пациенты',          icon: Users,           section: null },
  { href: '/doctors',               label: 'Врачи',             icon: Stethoscope,     section: null },
  { href: '/clinics',               label: 'Клиники',           icon: Building2,       section: null },
  { href: '/appointments',          label: 'Приёмы',            icon: Calendar,        section: null },
  { href: '/transactions',          label: 'Транзакции',        icon: CreditCard,      section: null },
  { href: '/finance',               label: 'Финансы',           icon: Banknote,        section: null },
  { href: '/sos-calls',             label: 'SOS вызовы',        icon: AlertTriangle,   section: null },
  { href: '/monitoring',            label: 'Мониторинг',        icon: Server,          section: null },
  { href: '/cms',                   label: 'CMS лендинга',      icon: Globe,           section: null },
  // ── ПОЛЬЗОВАТЕЛИ ──
  { href: '/users/patients',        label: 'Пациенты (Aivita)', icon: Users,           section: 'users' },
  { href: '/users/doctors',         label: 'Врачи (Aivita)',    icon: Stethoscope,     section: 'users' },
  // ── AIVITA ──
  { href: '/aivita/doctors',        label: 'Врачи AIVITA',      icon: UserCheck,       section: 'aivita' },
  { href: '/aivita/billing',        label: 'Биллинг',           icon: Wallet,          section: 'aivita' },
  { href: '/aivita/home-settings',  label: 'Главная страница',  icon: Settings2,       section: 'aivita' },
  { href: '/aivita/notifications',  label: 'Уведомления',       icon: Bell,            section: 'aivita' },
  // ── ПАРТНЁРЫ ──
  { href: '/partners/pharmacies',   label: 'Аптеки',            icon: Pill,            section: 'partners' },
  { href: '/partners/labs',         label: 'Лаборатории',       icon: FlaskConical,    section: 'partners' },
  { href: '/partners/clinics',      label: 'Клиники',           icon: Building2,       section: 'partners' },
  // ── МАРКЕТИНГ ──
  { href: '/marketing/email',       label: 'Email рассылки',    icon: Mail,            section: 'marketing' },
  { href: '/marketing/push',        label: 'Push уведомления',  icon: MessageSquare,   section: 'marketing' },
  { href: '/marketing/referrals',   label: 'Реферальная',       icon: Share2,          section: 'marketing' },
  { href: '/marketing/analytics',   label: 'Аналитика',         icon: BarChart2,       section: 'marketing' },
  // ── КОНТЕНТ ──
  { href: '/content/landing',       label: 'Лендинг',           icon: Globe,           section: 'content' },
  { href: '/content/social',        label: 'Соцсети',           icon: Link2,           section: 'content' },
  { href: '/content/faq',           label: 'FAQ',               icon: HelpCircle,      section: 'content' },
  // ── БЕЗОПАСНОСТЬ ──
  { href: '/security/auth-logs',    label: 'Журнал входов',     icon: Activity,        section: 'security' },
  { href: '/security/blocked-ips',  label: 'Блокировки IP',     icon: Ban,             section: 'security' },
  // ── ОТЧЁТЫ ──
  { href: '/reports',               label: 'Отчёты',            icon: FileText,        section: 'reports' },
  // ── СИСТЕМА ──
  { href: '/settings/general',      label: 'Общие',             icon: Settings,        section: 'system' },
  { href: '/settings/payments',     label: 'Платежи',           icon: CreditCard,      section: 'system' },
  { href: '/settings/sms',          label: 'SMS',               icon: MessageCircle,   section: 'system' },
  { href: '/settings/email',        label: 'Email',             icon: AtSign,          section: 'system' },
  { href: '/settings/domains',      label: 'Домены',            icon: Globe2,          section: 'system' },
  { href: '/settings/backups',      label: 'Бэкапы',            icon: Database,        section: 'system' },
  { href: '/settings/logs',         label: 'Логи',              icon: ScrollText,      section: 'system' },
  // ── НАСТРОЙКИ ──
  { href: '/settings/roles',        label: 'Роли',              icon: Shield,          section: 'settings' },
  { href: '/settings/team',         label: 'Команда',           icon: UsersRound,      section: 'settings' },
  { href: '/settings/ai',           label: 'AI настройки',      icon: BrainCircuit,    section: 'settings' },
];

const sectionLabels: Record<string, string> = {
  aivita:    'AIVITA',
  users:     'ПОЛЬЗОВАТЕЛИ',
  partners:  'ПАРТНЁРЫ',
  marketing: 'МАРКЕТИНГ',
  content:   'КОНТЕНТ',
  security:  'БЕЗОПАСНОСТЬ',
  reports:   'ОТЧЁТЫ',
  system:    'СИСТЕМА',
  settings:  'НАСТРОЙКИ',
};

const STORAGE_KEY = 'admin-sidebar-collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Which sections are collapsed — persisted in localStorage
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
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
    const activeSection = baseNavItems.find(
      (item) => item.section && (pathname === item.href || pathname.startsWith(item.href + '/')),
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

  const { data: me } = useQuery<AdminMe>({
    queryKey: ['admin-me'],
    queryFn: () => api.get('/v1/admins/me'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const navItems = [
    ...baseNavItems,
    ...(me?.role === 'superadmin'
      ? [{ href: '/admins', label: 'Админы', icon: Shield, section: null as null }]
      : []),
  ];

  async function handleLogout() {
    await api.post('/v1/auth/logout').catch(() => {});
    router.push('/auth/login');
  }

  // Group: null-section items are rendered inline; sectioned items are grouped
  const sections = Object.keys(sectionLabels);

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">M</div>
        <span className="text-lg font-semibold">MedSoft Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {/* Top-level items (no section) */}
        {navItems
          .filter((item) => item.section === null)
          .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === href || (pathname?.startsWith(href + '/') ?? false)
                  ? 'bg-white/10 text-white'
                  : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}

        {/* Sectioned items */}
        {sections.map((section) => {
          const items = navItems.filter((item) => item.section === section);
          if (!items.length) return null;

          const isCollapsed = hydrated && !!collapsed[section];
          const hasActive = items.some(
            (item) => pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false),
          );

          return (
            <div key={section} className="pt-2">
              {/* Section header — clickable */}
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
                  isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100',
                )}
              >
                <div className="space-y-0.5 pt-0.5">
                  {items.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        pathname === href || (pathname?.startsWith(href + '/') ?? false)
                          ? 'bg-white/10 text-white'
                          : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-1 shrink-0">
        {me && (
          <div className="px-3 py-1.5 text-xs text-sidebar-foreground/50 truncate">
            {me.fullName} · <span className="capitalize">{me.role}</span>
          </div>
        )}
        <div className="flex gap-2">
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
            Выйти
          </Button>
        </div>
      </div>
    </aside>
  );
}
