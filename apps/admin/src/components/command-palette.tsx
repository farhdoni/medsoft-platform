'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import { LayoutDashboard, Users, Stethoscope, Building2, Calendar, CreditCard, AlertTriangle, Shield } from 'lucide-react';

const commands = [
  { label: 'Дашборд', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Пациенты', href: '/patients', icon: Users },
  { label: 'Врачи', href: '/doctors', icon: Stethoscope },
  { label: 'Клиники', href: '/clinics', icon: Building2 },
  { label: 'Приёмы', href: '/appointments', icon: Calendar },
  { label: 'Транзакции', href: '/transactions', icon: CreditCard },
  { label: 'SOS вызовы', href: '/sos-calls', icon: AlertTriangle },
  { label: 'Админы', href: '/admins', icon: Shield },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Поиск..." />
      <CommandList>
        <CommandEmpty>Ничего не найдено.</CommandEmpty>
        <CommandGroup heading="Навигация">
          {commands.map(({ label, href, icon: Icon }) => (
            <CommandItem
              key={href}
              onSelect={() => { router.push(href); setOpen(false); }}
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
