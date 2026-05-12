'use client';
import { useEffect } from 'react';

/** Sets document.documentElement.lang to match the current locale. */
export function LangSetter({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
