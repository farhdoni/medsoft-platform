'use client';
import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

const PROXY = '/api/proxy';

export default function ChatsStartPage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorId = searchParams?.get('doctorId') ?? null;

  useEffect(() => {
    if (!doctorId) {
      router.replace(`/${locale}/chats`);
      return;
    }

    // Create or get existing conversation with this doctor
    fetch(`${PROXY}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId }),
    })
      .then(r => r.json())
      .then(j => {
        const convId = j.data?.id;
        if (convId) {
          router.replace(`/${locale}/chats/${convId}`);
        } else {
          router.replace(`/${locale}/chats`);
        }
      })
      .catch(() => {
        router.replace(`/${locale}/chats`);
      });
  }, [doctorId, locale, router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#f4f3ef' }}>
      <div className="w-10 h-10 border-[3px] rounded-full animate-spin"
        style={{ borderColor: 'var(--accent-dark)', borderTopColor: 'transparent' }} />
    </div>
  );
}
