'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

const PROXY = '/api/proxy';

/**
 * "Write to this doctor" entry point from the doctor catalogue.
 *
 * The catalogue links here with ?doctorId=<aivita_users.id> — doctor_profiles
 * carries a unique user_id FK to aivita_users, and both catalogue links
 * (doctors/page.tsx and doctors/[id]/page.tsx) already pass that user id, so
 * no extra resolution step is needed: it goes straight to the AV Chat
 * conversation endpoint, which speaks aivita_users ids.
 *
 * If the API cannot open a conversation with that id — the doctor has no
 * AIVITA account row, or blocks are in play — we say so plainly rather than
 * bouncing the user somewhere unexpected.
 */
export default function MessengerStartPage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorId = searchParams?.get('doctorId') ?? null;

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!doctorId) {
      router.replace(`/${locale}/messenger`);
      return;
    }

    let cancelled = false;

    fetch(`${PROXY}/messaging/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: doctorId }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const convId = j?.data?.id;
        if (convId) router.replace(`/${locale}/messenger/${convId}`);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => { cancelled = true; };
  }, [doctorId, locale, router]);

  if (failed) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6" style={{ background: '#f4f3ef' }}>
        <div
          className="w-full max-w-sm bg-white rounded-2xl p-6 text-center"
          style={{ border: '1px solid #e8e4dc' }}
        >
          <div className="text-3xl mb-2" aria-hidden="true">💬</div>
          <p className="text-sm font-semibold text-app-t1">Врач ещё не подключил чат</p>
          <p className="text-xs text-app-t3 mt-1">
            Напишите ему позже или запишитесь на приём.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href={`/${locale}/messenger`}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--accent-dark, #9c5e6c)' }}
            >
              В центр общения
            </Link>
            <Link
              href={`/${locale}/doctors`}
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ color: '#6a6580', border: '1px solid #e8e4dc' }}
            >
              К списку врачей
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#f4f3ef' }}>
      <div
        className="w-10 h-10 border-[3px] rounded-full animate-spin"
        style={{ borderColor: 'var(--accent-dark)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
