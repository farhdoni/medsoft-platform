// Soft Clay Matte page header — used by inner cabinet pages
// Shows page title + optional back link. The global TopHeader stays sticky above.

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Accent colour strip on left edge, defaults to rose */
  accentColor?: string;
}

export function PageHeader({ title, subtitle, accentColor = '#cc8a96' }: PageHeaderProps) {
  return (
    <div className="px-4 md:px-6 py-5">
      <div className="flex items-center gap-3">
        <div
          className="w-1 h-10 rounded-full flex-shrink-0"
          style={{ background: accentColor }}
        />
        <div>
          <h1 className="text-[22px] font-bold leading-none" style={{ color: '#2a2540' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] mt-1" style={{ color: '#9a96a8' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
