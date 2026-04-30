import '@/styles/marketing.css';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp">
      {/* Subtle grid background */}
      <div className="lp-grid" aria-hidden="true" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
