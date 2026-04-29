'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/shared/logo';
import { useState } from 'react';

export function PublicNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';
  const [langOpen, setLangOpen] = useState(false);

  const langs = [
    { code: 'ru', label: 'RU' },
    { code: 'uz', label: 'UZ' },
    { code: 'en', label: 'EN' },
  ];
  const currentLang = langs.find(l => l.code === locale) || langs[0];

  return (
    <nav className="sticky top-0 z-50 px-6 md:px-14 py-4 bg-white/70 backdrop-blur-3xl border-b border-[rgba(120,160,200,0.1)]">
      <div className="max-w-[1320px] mx-auto flex justify-between items-center">
        <Logo />
        <div className="hidden md:flex gap-1 items-center">
          {(['features', 'how', 'personas', 'faq'] as const).map((key) => (
            <a
              key={key}
              href={`#${key}`}
              className="px-3 py-2 text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-navy rounded-xl hover:bg-white/60 transition-all"
            >
              {t(key)}
            </a>
          ))}
          <Link
            href={`/${locale}/sign-in`}
            className="ml-3 px-[18px] py-[10px] bg-gradient-pink-blue-mint text-white text-sm font-bold rounded-full shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all"
          >
            {t('openApp')}
          </Link>
          <div className="relative ml-2">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[rgb(var(--text-tertiary))] hover:text-navy rounded-full border border-[rgba(120,160,200,0.2)] hover:bg-white/60 transition-all"
            >
              🌐 {currentLang.label}
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white/95 backdrop-blur-xl rounded-xl border border-[rgba(120,160,200,0.15)] shadow-medium py-1 min-w-[100px]">
                {langs.map((l) => (
                  <a
                    key={l.code}
                    href={pathname.replace(/^\/[a-z]{2}/, `/${l.code}`)}
                    className={`block px-3 py-2 text-sm hover:bg-pink-50 rounded-lg mx-1 transition-colors ${l.code === locale ? 'text-pink-600 font-semibold' : 'text-navy'}`}
                    onClick={() => setLangOpen(false)}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href={`/${locale}/sign-in`}
            className="px-4 py-2.5 bg-gradient-pink-blue-mint text-white text-sm font-bold rounded-full shadow-pink"
          >
            {t('openApp')}
          </Link>
        </div>
      </div>
    </nav>
  );
}
