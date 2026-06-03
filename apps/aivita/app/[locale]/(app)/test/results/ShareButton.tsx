'use client';

import { Share2 } from 'lucide-react';

/** Share test results via navigator.share (Web Share API) with clipboard fallback. */
export function ShareButton() {
  async function handleShare() {
    const url = window.location.href;
    const title = 'Мой Health Score — AIVITA';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(url);
      alert('Ссылка скопирована в буфер обмена');
    } catch {
      // Clipboard not available — nothing to do
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1 mt-2 text-xs text-pink-500 font-semibold hover:text-pink-600 transition-colors"
    >
      <Share2 className="w-3 h-3" />
      Поделиться →
    </button>
  );
}
