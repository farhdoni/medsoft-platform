'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
  User, Camera, Trash2, Sun, Moon, Monitor, Lock, ShieldCheck,
  ShieldOff, Languages, Check, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useI18n, LOCALES, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type AdminMe = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string | null;
  locale?: string;
};

// ── Avatar helpers ─────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function AvatarDisplay({ src, name, size = 80 }: { src?: string | null; name: string; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover ring-2 ring-white/20"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-primary flex items-center justify-center text-white font-bold ring-2 ring-white/20"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(name) || <User style={{ width: size * 0.45, height: size * 0.45 }} />}
    </div>
  );
}

// ── Theme card ─────────────────────────────────────────────────────────────────
function ThemeCard({
  value,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all cursor-pointer',
        active
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/40',
      )}
    >
      {active && (
        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
          <Check className="h-3 w-3" />
        </span>
      )}
      <Icon className="h-7 w-7 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: me } = useQuery<AdminMe>({
    queryKey: ['admin-me'],
    queryFn: () => api.get('/v1/auth/me'),
    staleTime: 5 * 60 * 1000,
  });

  // ── Profile state ────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (me) {
      setFullName(me.fullName ?? '');
      setAvatarUrl(me.avatarUrl ?? null);
    }
  }, [me]);

  // ── Password state ───────────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd]         = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [pwdError, setPwdError]     = useState('');

  // ── 2FA state ────────────────────────────────────────────────────────────────
  const { data: twoFaStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ['2fa-status'],
    queryFn: () => api.get('/v1/auth/2fa/status'),
  });

  // ── Avatar upload ─────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Максимальный размер файла — 2 МБ');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarPreview(dataUrl);
      setAvatarUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatarPreview(null);
    setAvatarUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  // ── Profile mutation ─────────────────────────────────────────────────────────
  const profileMutation = useMutation({
    mutationFn: (data: { fullName: string; avatarUrl: string; locale: string }) =>
      api.put('/v1/auth/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-me'] });
      setProfileSaved(true);
      toast.success(t.account.saved);
      setTimeout(() => setProfileSaved(false), 2000);
    },
    onError: () => toast.error(t.errors.updateFailed),
  });

  function saveProfile() {
    if (fullName.trim().length < 2) {
      toast.error(t.errors.nameTooShort);
      return;
    }
    profileMutation.mutate({
      fullName: fullName.trim(),
      avatarUrl: avatarUrl ?? '',
      locale,
    });
  }

  // ── Language change (also syncs with profile) ─────────────────────────────────
  function changeLocale(l: Locale) {
    setLocale(l);
    api.put('/v1/auth/profile', { locale: l }).catch(() => {});
  }

  // ── Password mutation ────────────────────────────────────────────────────────
  const pwdMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/v1/auth/change-password', data),
    onSuccess: () => {
      toast.success('Пароль обновлён');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdError('');
    },
    onError: (err: Error) => {
      if (err.message?.includes('incorrect')) {
        setPwdError(t.errors.pwdWrong);
      } else {
        setPwdError(t.errors.updateFailed);
      }
    },
  });

  function updatePassword() {
    setPwdError('');
    if (newPwd.length < 6) { setPwdError(t.errors.pwdTooShort); return; }
    if (newPwd !== confirmPwd) { setPwdError(t.errors.pwdMismatch); return; }
    pwdMutation.mutate({ currentPassword: currentPwd, newPassword: newPwd });
  }

  const displayAvatar = avatarPreview ?? avatarUrl ?? me?.avatarUrl;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">{t.account.title}</h1>
        <p className="text-muted-foreground mt-1">{t.account.subtitle}</p>
      </div>

      {/* ── PROFILE ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {t.account.profile}
          </CardTitle>
          <CardDescription>{t.account.profileDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              <AvatarDisplay src={displayAvatar} name={me?.fullName ?? ''} size={80} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{t.account.avatar}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                  {t.account.changePhoto}
                </Button>
                {displayAvatar && (
                  <Button variant="ghost" size="sm" onClick={removeAvatar} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    {t.account.removePhoto}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG, GIF · макс. 2 МБ</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName">{t.account.fullName}</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ivan Petrov"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <Label htmlFor="email">{t.account.email}</Label>
            <Input id="email" value={me?.email ?? ''} readOnly className="bg-muted/30 cursor-default" />
          </div>

          <Button onClick={saveProfile} disabled={profileMutation.isPending}>
            {profileMutation.isPending
              ? t.account.saving
              : profileSaved
              ? <><Check className="h-3.5 w-3.5 mr-1.5" />{t.account.saved}</>
              : t.account.saveProfile}
          </Button>
        </CardContent>
      </Card>

      {/* ── APPEARANCE ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="h-4 w-4" />
            {t.account.appearance}
          </CardTitle>
          <CardDescription>{t.account.appearanceDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="space-y-3">
            <p className="text-sm font-medium">{t.account.theme}</p>
            <div className="grid grid-cols-3 gap-3">
              <ThemeCard value="light"  label={t.account.themeLight}  icon={Sun}     active={theme === 'light'}  onClick={() => setTheme('light')} />
              <ThemeCard value="dark"   label={t.account.themeDark}   icon={Moon}    active={theme === 'dark'}   onClick={() => setTheme('dark')} />
              <ThemeCard value="system" label={t.account.themeSystem} icon={Monitor} active={theme === 'system'} onClick={() => setTheme('system')} />
            </div>
          </div>

          {/* Language */}
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Languages className="h-4 w-4" />
              {t.account.language}
            </p>
            <div className="flex flex-wrap gap-2">
              {LOCALES.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => changeLocale(l.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                    locale === l.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/40',
                  )}
                >
                  <span className="text-base">{l.flag}</span>
                  {l.label}
                  {locale === l.value && <Check className="h-3.5 w-3.5 ml-1" />}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECURITY ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {t.account.security}
          </CardTitle>
          <CardDescription>{t.account.securityDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Change password */}
          <div className="space-y-4">
            <p className="text-sm font-semibold">{t.account.changePassword}</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="currentPwd">{t.account.currentPwd}</Label>
                <div className="relative">
                  <Input
                    id="currentPwd"
                    type={showPwd ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPwd">{t.account.newPwd}</Label>
                <Input
                  id="newPwd"
                  type={showPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Минимум 6 символов"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPwd">{t.account.confirmPwd}</Label>
                <Input
                  id="confirmPwd"
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
              </div>
            </div>
            {pwdError && (
              <div className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {pwdError}
              </div>
            )}
            <Button
              onClick={updatePassword}
              disabled={pwdMutation.isPending || !currentPwd || !newPwd}
            >
              {pwdMutation.isPending ? t.account.updating : t.account.updatePwd}
            </Button>
          </div>

          {/* 2FA */}
          <div className="rounded-xl border p-4 flex items-start gap-4">
            {twoFaStatus?.enabled
              ? <ShieldCheck className="h-8 w-8 text-green-500 shrink-0 mt-0.5" />
              : <ShieldOff   className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{t.account.twoFactor}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.account.twoFactorDesc}</p>
              <span className={cn(
                'inline-flex items-center mt-2 rounded-full px-2.5 py-0.5 text-xs font-medium',
                twoFaStatus?.enabled
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-muted text-muted-foreground',
              )}>
                {twoFaStatus?.enabled ? t.account.twoFactorOn : t.account.twoFactorOff}
              </span>
            </div>
            {twoFaStatus?.enabled
              ? (
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5 shrink-0">
                  {t.account.disable2fa}
                </Button>
              )
              : (
                <Button variant="outline" size="sm" className="shrink-0">
                  {t.account.setup2fa}
                </Button>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
