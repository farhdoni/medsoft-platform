import Link from 'next/link';

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="font-bold text-xl tracking-tight flex items-center gap-2.5 group">
      <LogoMark className="w-7 h-7" />
      <span className={inverted ? 'text-white' : 'text-navy'}>
        aivita<em className="font-serif italic font-normal text-pink-500">.uz</em>
      </span>
    </Link>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" stroke="url(#logoGrad)" strokeWidth="1.5" strokeDasharray="4 2" />
      <rect x="12.5" y="8" width="3" height="12" rx="1.5" fill="url(#logoGrad)" />
      <rect x="8" y="12.5" width="12" height="3" rx="1.5" fill="url(#logoGrad)" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
          <stop stopColor="#d4849a" />
          <stop offset="0.5" stopColor="#2c5f7c" />
          <stop offset="1" stopColor="#2dba9a" />
        </linearGradient>
      </defs>
    </svg>
  );
}
