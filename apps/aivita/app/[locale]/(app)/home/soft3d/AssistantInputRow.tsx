'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Well } from '@/components/soft3d/Surfaces';
import { Button3D } from '@/components/soft3d/Button3D';

/**
 * Bottom "Ответить ассистенту…" row (every non-empty/paused state per the
 * mockups). Real wiring, not decorative: submits to /ai-chat?q=..., which
 * AiChatClient.tsx already reads on mount and sends automatically.
 */
export function AssistantInputRow({
  locale,
  placeholder,
  ariaLabel,
  openChatAriaLabel,
}: {
  locale: string;
  placeholder: string;
  ariaLabel: string;
  openChatAriaLabel: string;
}) {
  const router = useRouter();
  const [text, setText] = React.useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    router.push(q ? `/${locale}/ai-chat?q=${encodeURIComponent(q)}` : `/${locale}/ai-chat`);
  };

  return (
    <form
      onSubmit={submit}
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 108, maxWidth: 456, margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: 9, padding: '0 6px', zIndex: 30,
      }}
    >
      <label htmlFor="soft3d-home-ask" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>
        {ariaLabel}
      </label>
      <Well style={{ flexGrow: 1, borderRadius: 24 }}>
        <input
          id="soft3d-home-ask"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', height: 48, padding: '0 16px', border: 'none', background: 'none',
            fontFamily: 'Nunito, sans-serif', fontSize: 14, color: 'var(--s3-ink)', outline: 'none',
          }}
        />
      </Well>
      <Button3D
        type="submit"
        aria-label={openChatAriaLabel}
        style={{ width: 48, height: 48, minHeight: 0, borderRadius: '50%', padding: 0, flexShrink: 0 }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 4L3 11l7 3 3 7z" />
        </svg>
      </Button3D>
    </form>
  );
}
