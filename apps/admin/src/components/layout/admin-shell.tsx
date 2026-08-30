'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { CommandPalette } from '@/components/command-palette';

/**
 * Каркас админки: боковое меню + область контента.
 *
 * До `lg` (1024px) сайдбар — выдвижной оверлей, а не колонка: на 375-390px
 * фиксированные 256px съедали две трети экрана, и внутренние страницы
 * (кабинет поддержки в первую очередь) оставались нерабочими с телефона.
 * На `lg` и шире всё как было — статичная колонка, бургер и подложка скрыты.
 *
 * Высоту хрома страницы отдаём вниз переменной `--admin-chrome`: страницам,
 * которые сами тянутся на весь экран, иначе пришлось бы дублировать здешние
 * отступы и высоту мобильной шапки числами.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  // Переход по ссылке закрывает меню. Ссылки закрывают его и сами (клик по
  // активному пункту не меняет pathname), но переходы бывают и не из меню.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      {/* Подложка: гасит меню тапом мимо него. Только под `lg`. */}
      {navOpen && (
        <div
          aria-hidden="true"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <main className="flex-1 overflow-y-auto bg-background">
        <CommandPalette />

        {/* Мобильная шапка: единственная точка входа в меню под `lg`. */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 lg:hidden">
          <button
            type="button"
            aria-label="Открыть меню"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Текстом, а не /logo.png: логотип — тёмная навигация на прозрачном
              фоне и в ночной теме сливается с шапкой. */}
          <span className="text-sm font-bold tracking-wide">AIVITA</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Admin
          </span>
        </div>

        <div className="p-3 [--admin-chrome:5rem] lg:p-6 lg:[--admin-chrome:3rem]">
          {children}
        </div>
      </main>
    </div>
  );
}
