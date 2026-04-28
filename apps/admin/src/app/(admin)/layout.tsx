import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/layout/sidebar';

const CommandPalette = dynamic(
  () => import('@/components/command-palette').then((m) => m.CommandPalette),
  { ssr: false }
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <CommandPalette />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
