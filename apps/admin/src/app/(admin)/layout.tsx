import { Sidebar } from '@/components/layout/sidebar';
import { CommandPalette } from '@/components/command-palette';

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
