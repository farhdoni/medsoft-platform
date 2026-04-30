'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function PublicNav() {
  const t = useTranslations('nav');
  const pathname = usePathname() ?? '/ru';
  const locale = pathname.split('/')[1] || 'ru';
  const [langOpen, setLangOpen] = useState(false);

  const langs = [
    { code: 'ru', label: 'RU' },
    { code: 'uz', label: 'UZ' },
    { code: 'en', label: 'EN' },
  ];
  const currentLang = langs.find(l => l.code === locale) || langs[0];

  return (
    <nav className="lp-nav">
      {/* Logo */}
      <a href={`/${locale}`} className="lp-logo">
        aivita<span className="lp-logo-dot" />uz
      </a>

      {/* Desktop links */}
      <div className="lp-nav-links">
        {(['features', 'how', 'personas', 'faq'] as const).map((key) => (
          <a key={key} href={`#${key}`}>{t(key)}</a>
        ))}
      </div>

      {/* Actions */}
      <div className="lp-nav-actions">
        {/* Language switcher */}
        <div style={{ position: 'relative' }}>
          <button className="lp-lang-btn" onClick={() => setLangOpen(!langOpen)}>
            🌐 {currentLang.label}
          </button>
          {langOpen && (
            <div className="lp-lang-dropdown">
              {langs.map((l) => (
                <a
                  key={l.code}
                  href={(pathname ?? '/').replace(/^\/[a-z]{2}/, `/${l.code}`)}
                  className={l.code === locale ? 'active' : ''}
                  onClick={() => setLangOpen(false)}
                >
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Profile / Login button */}
        <Link href={`/${locale}/sign-in`} className="lp-profile-btn" title={t('login')}>
          <span className="lp-profile-btn-inner">
            <svg
              className="lp-profile-icon"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="16" cy="11" r="5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M5 27c1.5-5.5 6-8.5 11-8.5s9.5 3 11 8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="lp-profile-pulse" />
        </Link>
      </div>
    </nav>
  );
}
