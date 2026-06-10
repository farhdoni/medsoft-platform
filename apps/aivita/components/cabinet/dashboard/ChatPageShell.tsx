import { TopBar } from "./TopBar";
import { FloatingNav } from "./FloatingNav";
import { getSession } from "@/lib/auth/session";

interface Props {
  active?: string;
  locale?: string;
  children: React.ReactNode;
}

/**
 * Shell for full-height chat screens (ai-chat, chat, chats, chats/[id]).
 *
 * Unlike PageShell this does NOT wrap content in a card with padding.
 * Instead it provides a flex column where children fill the available
 * space between TopBar and FloatingNav.
 *
 * Children must use h-full (not 100dvh) so the layout composes correctly.
 */
export async function ChatPageShell({ active, locale = "ru", children }: Props) {
  const session = await getSession();
  const rawName = session?.name?.trim() || '';
  const words = rawName.split(/\s+/).filter(Boolean);
  const initials = rawName
    ? words.length >= 2
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : rawName.slice(0, 2).toUpperCase()
    : 'FN';

  return (
    <div
      className="flex flex-col bg-app-bg"
      style={{ height: '100dvh', maxWidth: 480, margin: '0 auto' }}
    >
      {/* TopBar: logo • SOS • bell • account — present on all chat screens */}
      <div className="flex-shrink-0">
        <TopBar
          avatarInitial={initials}
          session={session}
          locale={locale}
          role={session?.role === 'doctor' ? 'doctor' : 'patient'}
        />
      </div>

      {/* Chat content fills remaining space; inner sub-header lives inside */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        {children}
      </div>

      {/* FloatingNav at bottom */}
      <div className="flex-shrink-0">
        <FloatingNav active={active} />
      </div>

      {/* Spacer for the fixed FloatingNav: it's position:fixed so the wrapper
          above collapses to 0 — this div gives the flex layout real height so
          the chat input is never hidden behind the nav pill. */}
      <div
        aria-hidden="true"
        className="flex-shrink-0"
        style={{ height: 'calc(84px + env(safe-area-inset-bottom))' }}
      />
    </div>
  );
}
