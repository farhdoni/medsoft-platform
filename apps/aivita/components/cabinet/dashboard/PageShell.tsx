import { TopBar } from "./TopBar";
import { FloatingNav } from "./FloatingNav";
import { getSession } from "@/lib/auth/session";

interface Props {
  active?: string;
  avatarInitial?: string;
  locale?: string;
  children: React.ReactNode;
}

/** Wraps inner cabinet pages with the shared TopBar + FloatingNav chrome. */
export async function PageShell({ active, avatarInitial = "F", locale = "ru", children }: Props) {
  const session = await getSession();
  const initials = session?.name
    ? session.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : avatarInitial.toUpperCase();

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] px-4 pb-32 md:px-6 bg-bg-app">
      <div className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_rgba(42,37,64,0.10)]">
        <TopBar avatarInitial={initials} session={session} locale={locale} />
        <div className="px-7 py-5">
          {children}
        </div>
      </div>
      <FloatingNav active={active} />
    </main>
  );
}
