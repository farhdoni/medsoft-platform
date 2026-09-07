'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { LayoutDashboard, Users, Stethoscope, Building2, Calendar, CreditCard, AlertTriangle, Shield, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

// Labels come from the same nav dictionary the sidebar uses, so the palette
// can never drift out of sync with the menu it mirrors.
const COMMANDS = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'patients', href: '/patients', icon: Users },
  { key: 'doctors', href: '/doctors', icon: Stethoscope },
  { key: 'clinics', href: '/clinics', icon: Building2 },
  { key: 'appointments', href: '/appointments', icon: Calendar },
  { key: 'transactions', href: '/transactions', icon: CreditCard },
  { key: 'sosCalls', href: '/sos-calls', icon: AlertTriangle },
  { key: 'admins', href: '/admins', icon: Shield },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t } = useI18n();

  const commands = COMMANDS.map((c) => ({ ...c, label: t.nav[c.key] ?? c.key }));
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
          <Dialog.Title className="sr-only">{t.common.searchCommands}</Dialog.Title>

          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.common.search}
              className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
            />
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.common.nothingFound}</p>
            ) : (
              <div>
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{t.common.navigation}</p>
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
              <kbd className="rounded border px-1 font-mono text-xs">↵</kbd> {t.common.select}
              <span className="mx-2">·</span>
              <kbd className="rounded border px-1 font-mono text-xs">Esc</kbd> {t.common.close}
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
