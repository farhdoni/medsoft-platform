'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { LayoutDashboard, Users, Stethoscope, Building2, Calendar, CreditCard, AlertTriangle, Shield, Search } from 'lucide-react';

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
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

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

  function handleSelect(href: string) {
    router.push(href);
    setOpen(false);
    setQuery('');
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border bg-background shadow-2xl outline-none"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Поиск команд</Dialog.Title>

          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск..."
              className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
            />
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Ничего не найдено.</p>
            ) : (
              <div>
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Навигация</p>
                {filtered.map(({ label, href, icon: Icon }) => (
                  <button
                    key={href}
                    onClick={() => handleSelect(href)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent text-left"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <kbd className="rounded border px-1 font-mono text-xs">↵</kbd> выбрать
              <span className="mx-2">·</span>
              <kbd className="rounded border px-1 font-mono text-xs">Esc</kbd> закрыть
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
