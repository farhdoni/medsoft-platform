'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
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
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border bg-background shadow-2xl outline-none">
          <Dialog.Title className="sr-only">Поиск команд</Dialog.Title>
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            <CommandInput placeholder="Поиск..." className="h-12 w-full border-0 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground" />
            <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">Ничего не найдено.</CommandEmpty>
              <CommandGroup heading="Навигация" className="px-2">
                {commands.map(({ label, href, icon: Icon }) => (
                  <CommandItem
                    key={href}
                    onSelect={() => { router.push(href); setOpen(false); }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
