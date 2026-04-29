import { OrbBackground } from '@/components/shared/orb-background';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-base relative">
      <OrbBackground />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
