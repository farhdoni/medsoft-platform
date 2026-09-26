import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { isSoft3dEnabled } from '@/lib/soft3d/flag';
import { Soft3dShell } from '@/components/soft3d/Soft3dShell';
import PushManager from '@/components/push/PushManager';
import { FullscreenReminder } from '@/components/notifications/FullscreenReminder';
import { IdleWarningModal } from '@/components/IdleWarningModal';
import { NativeScrollSync } from '@/components/NativeScrollSync';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

// Doctor-unread-reply signal (Part C), fetched at the layout level (not
// per-page) so the bell dot and the "assistant" nav badge in Soft3dShell
// stay correct everywhere in the app, not just on Home. Fail-open to "no
// unread" on any error — a network hiccup must not fabricate a badge.
async function fetchDoctorUnread(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('aivita_api');
    if (!sessionCookie) return false;

    const r = await fetch(`${API_BASE}/v1/aivita/home-state`, {
      cache: 'no-store',
      headers: { Cookie: `aivita_api=${sessionCookie.value}` },
    });
    if (!r.ok) return false;
    const json = await r.json() as { data?: { doctorReply?: { hasUnread?: boolean } } };
    return !!json.data?.doctorReply?.hasUnread;
  } catch {
    return false;
  }
}

export default async function CabinetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/sign-in`);
  }

  // Part A: flag-gated Soft 3D shell (new header + bottom nav) layered over
  // the existing page content. Off for everyone except the test-account
  // allowlist — see lib/soft3d/flag.ts for why this is env-based, not a DB
  // column. Zero effect on anyone else: the branch below is the ONLY thing
  // that changes here.
  const soft3d = isSoft3dEnabled(session.email);
  const doctorUnread = soft3d ? await fetchDoctorUnread() : false;

  const content = (
    <div className="max-w-[480px] mx-auto w-full min-h-screen bg-app-bg shadow-xl">
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-app-bg">
      <PushManager />
      <NativeScrollSync />
      <FullscreenReminder />
      {/* Auto-logout after 15 min idle (14 min + 1 min warning) */}
      <IdleWarningModal locale={locale} />
      {soft3d ? (
        <Soft3dShell locale={locale} avatarInitial={(session.name || session.email || '?').charAt(0).toUpperCase()} unreadCount={doctorUnread ? 1 : 0}>
          {content}
        </Soft3dShell>
      ) : (
        content
      )}
    </div>
  );
}
