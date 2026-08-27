import Link from 'next/link';
import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';

// Placeholder. The real chat settings screen (own @username, privacy, who may
// write to you, notification rules) is the next stage.
export default async function MessengerSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <ChatPageShell active="messenger" locale={locale}>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center gap-2">
          <Link
            href={`/${locale}/messenger`}
            aria-label="Назад"
            className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70"
            style={{ background: '#fff', border: '1px solid #e8e4dc' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m15 18-6-6 6-6" stroke="#6a6580" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-[18px] font-bold text-app-t1">Настройки чата</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="bg-white rounded-2xl p-6 text-center" style={{ border: '1px solid #e8e4dc' }}>
            <div className="text-3xl mb-2" aria-hidden="true">⚙️</div>
            <p className="text-sm font-semibold text-app-t1">Настройки чата</p>
            <p className="text-xs text-app-t3 mt-1">Скоро</p>
          </div>
        </div>
      </div>
    </ChatPageShell>
  );
}
