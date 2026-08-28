'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_PREFS, readPrefs, surfaceVars, type ChatPrefs } from './chat-prefs';

/**
 * Applies the device's chat appearance settings as CSS custom properties.
 *
 * Renders with the light defaults on the server so the first paint is never
 * wrong-coloured, then swaps to the stored preferences on mount. Listens for
 * `av-chat-prefs`, which the settings screen fires, so changes land instantly
 * without a reload — and for `storage`, so a second tab follows along.
 */
export function ChatSurface({
  children,
  paint = false,
}: {
  children: React.ReactNode;
  /** Paint the chosen chat background. The thread does; the hub keeps app-bg. */
  paint?: boolean;
}) {
  const [prefs, setPrefs] = useState<ChatPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    const sync = () => setPrefs(readPrefs());
    sync();
    window.addEventListener('av-chat-prefs', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('av-chat-prefs', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <div
      data-av-theme={prefs.theme}
      data-av-text={prefs.textSize}
      data-av-bg={prefs.background}
      className="h-full min-h-0"
      style={{
        ...surfaceVars(prefs),
        ...(paint ? { background: 'var(--av-chat-bg)' } : null),
        color: 'var(--av-text)',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
