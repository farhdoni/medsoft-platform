'use client';
import { useState, useEffect } from 'react';

interface Props {
  /** Extra classes on the <button> wrapper */
  className?: string;
  /** Inline style for the text span (font-size, color, opacity, etc.) */
  textStyle?: React.CSSProperties;
}

/**
 * Fetches the user's medical-card code and renders it as a copy-to-clipboard
 * badge. Renders nothing while loading or if no card exists.
 *
 * Usage:
 *   <CardCodeBadge textStyle={{ fontSize: 12, color: '#fff', opacity: 0.8 }} />
 */
export function CardCodeBadge({ className = '', textStyle }: Props) {
  const [cardCode, setCardCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/proxy/card/my')
      .then(r => (r.ok ? r.json() : null))
      .then((j: { data?: { cardCode?: string } } | null) => {
        if (j?.data?.cardCode) setCardCode(j.data.cardCode);
      })
      .catch(() => {});
  }, []);

  if (!cardCode) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(cardCode!);
    } catch {
      /* clipboard not available — silent fail */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Нажмите, чтобы скопировать номер медкарты"
      className={`inline-flex items-center gap-1 cursor-pointer select-none transition-opacity hover:opacity-100 active:scale-95 ${className}`}
    >
      <span
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          letterSpacing: '0.06em',
          ...textStyle,
        }}
      >
        {copied ? '✓ Скопировано!' : `📋 ${cardCode}`}
      </span>
    </button>
  );
}
