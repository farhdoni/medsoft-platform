'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Re-arms the native pull-to-refresh gate after App-Router client navigation.
 *
 * The mobile app's RefreshControl is enabled only when the WebView reports it is
 * scrolled to the top (`webViewAtTop`), which the native side derives from a
 * passive `window` 'scroll' listener. On client-side (SPA) navigation between
 * cabinet pages no `scroll` event is guaranteed to fire at the new page's top,
 * so the gate can stay stuck at the previous page's value and pull-to-refresh
 * stops working (e.g. on Home). Here we explicitly post the current scroll
 * position on every route change so the gate re-arms to "at top".
 *
 * No-op outside the native WebView.
 */
export function NativeScrollSync() {
  const pathname = usePathname();

  useEffect(() => {
    const rn = (window as Window & {
      ReactNativeWebView?: { postMessage: (msg: string) => void };
    }).ReactNativeWebView;
    if (!rn) return;

    const post = () => {
      rn.postMessage(JSON.stringify({ type: '__scroll__', y: window.scrollY }));
    };

    // Post after paint (route settled at top) and once more after late layout
    // shifts from async data so the gate reflects the final scroll position.
    const raf = requestAnimationFrame(post);
    const timer = setTimeout(post, 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
