'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Well } from './Surfaces';

/**
 * Soft 3D header — Main.dc.html. Logo, SOS (its own red palette, links to
 * the SOS flow), notifications bell (dot indicator, not a dropdown — the
 * mockup navigates to a dedicated Notices screen), avatar → settings.
 *
 * The language switcher that lives in the current header is deliberately
 * NOT here — per spec it moves to settings-only under this flag. Settings
 * itself isn't part of Part A; this header just stops offering the
 * language switcher at this layer.
 */
export function Header({
  locale,
  avatarInitial,
  unreadCount,
  onSosClick,
}: {
  locale: string;
  avatarInitial: string;
  /** Pass a live count if you have one; omitted/0 shows no dot. */
  unreadCount?: number;
  /** Part A has no SOS destination screen yet (out of scope — see report);
   *  this opens whatever SOS trigger currently exists in the app. */
  onSosClick: () => void;
}) {
  const t = useTranslations('app.soft3d.header');

  return (
    <header
      style={{
        position: 'relative',
        padding: '20px 18px 0 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: 'var(--s3-navy)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
          }}
          aria-hidden="true"
        >
          A
        </div>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--s3-ink)' }}>
          AIVITA
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" onClick={onSosClick} className="s3-sos-btn" aria-label={t('sosAriaLabel')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.1" aria-hidden="true">
            <path d="M12 3l9 16H3z" />
            <path d="M12 9v5M12 17h.01" />
          </svg>
          {t('sos')}
        </button>

        <Link
          href={`/${locale}/notifications`}
          className="btn-flat"
          aria-label={t('notificationsAriaLabel')}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: '50%',
            textDecoration: 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3A3646" strokeWidth="1.9" aria-hidden="true">
            <path d="M18 15V10a6 6 0 0 0-12 0v5l-2 3h16zM10 21h4" />
          </svg>
          {!!unreadCount && unreadCount > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--s3-clay)',
                boxShadow: '0 0 0 2px var(--s3-tile)',
              }}
            />
          )}
        </Link>

        <Link
          href={`/${locale}/settings`}
          aria-label={t('settingsAriaLabel')}
          style={{ textDecoration: 'none' }}
        >
          <Well
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              font: '800 15px/1 var(--font-app), Nunito, sans-serif',
              color: 'var(--s3-ink)',
            }}
          >
            {avatarInitial}
          </Well>
        </Link>
      </div>
    </header>
  );
}
