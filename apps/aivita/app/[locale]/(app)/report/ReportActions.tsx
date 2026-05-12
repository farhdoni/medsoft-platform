'use client';

import { useState } from 'react';
import { Printer, Share2, Check } from 'lucide-react';

interface Props {
  shareToken?: string | null;
}

export function ReportActions({ shareToken }: Props) {
  const [copied, setCopied] = useState(false);

  function handlePrint() {
    window.print();
  }

  async function handleShare() {
    const url = shareToken
      ? `${window.location.origin}/r/${shareToken}`
      : window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Мой медицинский отчёт — Aivita', url });
        return;
      } catch { /* user cancelled */ }
    }
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 rounded-chip px-3 py-2 text-[12px] font-semibold transition hover:opacity-80"
        style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
      >
        <Printer className="w-3.5 h-3.5" />
        Печать
      </button>

      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 rounded-chip px-3 py-2 text-[12px] font-semibold transition hover:opacity-80"
        style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
        {copied ? 'Скопировано!' : 'Поделиться'}
      </button>
    </div>
  );
}
