import Link from 'next/link';
import { Logo } from '@/components/shared/logo';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-base flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6"><Logo /></div>
          <h1 className="text-3xl font-light tracking-tightest text-navy mb-2">
            Войти в <em className="font-serif italic font-normal text-pink-500 not-italic">aivita</em>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-sm">Выбери способ входа</p>
        </div>
        <div className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-8 shadow-medium space-y-4">
          {[
            { icon: '🔵', label: 'Войти через Google', disabled: false },
            { icon: '🍎', label: 'Войти через Apple', disabled: true },
            { icon: '✈️', label: 'Войти через Telegram', disabled: true },
          ].map((btn) => (
            <button
              key={btn.label}
              disabled={btn.disabled}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl border font-semibold text-sm transition-all ${
                btn.disabled
                  ? 'border-[rgba(120,160,200,0.1)] text-[rgb(var(--text-muted))] cursor-not-allowed'
                  : 'border-[rgba(120,160,200,0.2)] text-navy hover:bg-white hover:shadow-soft'
              }`}
            >
              <span className="text-xl">{btn.icon}</span>
              {btn.label}
              {btn.disabled && <span className="ml-auto text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))]">скоро</span>}
            </button>
          ))}
          {/* Mock dev sign-in */}
          <div className="pt-4 border-t border-[rgba(120,160,200,0.1)]">
            <Link
              href="/home"
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm"
            >
              🚀 Войти (демо-режим)
            </Link>
            <p className="text-center text-[10px] text-[rgb(var(--text-muted))] mt-2">Только для тестирования</p>
          </div>
        </div>
        <div className="text-center mt-6 text-xs text-[rgb(var(--text-muted))]">
          Входя, вы соглашаетесь с{' '}
          <Link href="/terms" className="text-pink-500 hover:underline">условиями</Link>
          {' '}и{' '}
          <Link href="/privacy" className="text-pink-500 hover:underline">политикой конфиденциальности</Link>
        </div>
      </div>
    </div>
  );
}
