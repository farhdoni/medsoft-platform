'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useI18n, LOCALES, formatLongDate } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();

  // next-themes only knows the resolved theme on the client, so the icon waits
  // for mount instead of rendering the wrong one and hydrating over it.
  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body: Record<string, string> = { email, password };
      if (needs2fa) body.totpCode = totpCode;

      const res = await api.post<{ requires2fa?: boolean }>('/v1/auth/login', body);

      if (res.requires2fa) {
        setNeeds2fa(true);
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.auth.loginFailed;
      setError(message);
      setLoading(false);
    }
  }

  const today = formatLongDate(new Date(), locale);

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] lg:grid-cols-[1.35fr_minmax(340px,1fr)] lg:grid-rows-1">

      {/* ── Language + theme ── */}
      <div className="fixed right-4 top-4 z-30 flex items-center gap-1 rounded-full border border-border bg-card/80 p-1 backdrop-blur lg:right-6 lg:top-5">
        {LOCALES.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLocale(l.value)}
            aria-pressed={locale === l.value}
            className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors ${
              locale === l.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {l.value.toUpperCase()}
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label={t.auth.toggleTheme}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {mounted && (resolvedTheme === 'dark'
            ? <Moon className="h-4 w-4" />
            : <Sun className="h-4 w-4" />)}
        </button>
      </div>

      {/* ── Brand panel ── */}
      <aside className="login-brand relative flex min-h-[200px] flex-col justify-between overflow-hidden p-6 lg:min-h-0 lg:p-10 xl:p-16">
        <div className="atlas-layer" aria-hidden="true">
          <div className="atlas-photo" />
        </div>
        <div className="atlas-sheen" aria-hidden="true" />
        <div className="login-brand-scrim" aria-hidden="true" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8272C] to-[#1478D2]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F3EFE6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7.5-4.6-10-9.3C.4 8.1 2 4.4 5.6 3.6c2.1-.5 4.2.4 5.4 2.1a1.2 1.2 0 0 0 2 0c1.2-1.7 3.3-2.6 5.4-2.1 3.6.8 5.2 4.5 3.6 8.1C19.5 16.4 12 21 12 21Z" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>AIVITA</span>
          {/* Hidden on small screens: the language/theme pill sits in this
              same corner there and would run straight over it. */}
          <span className="ml-0.5 hidden border-l border-white/20 pl-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 lg:inline-block">
            {t.auth.eyebrow}
          </span>
        </div>

        <div className="relative z-10 mx-auto max-w-[620px] text-center">
          <h1
            className="text-balance text-[22px] font-semibold leading-tight lg:text-[clamp(26px,2.6vw,36px)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t.auth.greeting1}
            <br />
            {t.auth.greeting2}
          </h1>
          <p className="mx-auto mt-4 hidden max-w-[42ch] text-[15.5px] leading-relaxed text-white/75 lg:block">
            {t.auth.brandSub}
          </p>
        </div>

        <div className="relative z-10 hidden items-baseline justify-between gap-4 lg:flex">
          <span className="text-[13px] tabular-nums text-white/70">{today}</span>
          <div className="flex gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11.5px] font-semibold text-white/75">2FA</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11.5px] font-semibold text-white/75">RU · UZ · EN</span>
          </div>
        </div>
      </aside>

      {/* ── Form ── */}
      <main className="relative flex items-center justify-center px-6 pb-16 pt-10 lg:px-8">
        <div className="w-full max-w-[372px]">
          <div className="mb-7 text-center">
            <h2 className="text-[22px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              {needs2fa ? t.auth.title2fa : t.auth.formTitle}
            </h2>
            {needs2fa && (
              <p className="mt-1.5 text-sm text-muted-foreground">{t.auth.desc2fa}</p>
            )}
          </div>

          {needs2fa ? (
            /* ── 2FA step ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-2 flex justify-center">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totpCode">{t.auth.code2fa}</Label>
                <Input
                  id="totpCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                  className="text-center font-mono text-2xl tracking-widest"
                />
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
                {loading ? t.auth.verifying : t.auth.verify}
              </Button>
              <button
                type="button"
                onClick={() => { setNeeds2fa(false); setTotpCode(''); setError(''); }}
                className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t.auth.back}
              </button>
            </form>
          ) : (
            /* ── Credentials step ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t.auth.emailLabel}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@aivita.uz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t.auth.pwdLabel}</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    {t.auth.forgot}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? t.auth.hidePwd : t.auth.showPwd}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.auth.submitting : t.auth.submit}
              </Button>
            </form>
          )}

          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{t.auth.trust}</span>
          </div>
        </div>

        <p className="absolute inset-x-0 bottom-5 text-center text-xs text-muted-foreground">
          © AIVITA, {new Date().getFullYear()} · {t.auth.foot}
        </p>
      </main>
    </div>
  );
}
