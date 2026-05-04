'use client';
import * as React from 'react';

interface HealthRingProps {
  value: number;
  size?: number;
  stroke?: number;
  animate?: boolean;
}

export const HealthRing: React.FC<HealthRingProps> = ({
  value, size = 220, stroke = 14, animate = true,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  const gradId = `ring-grad-${size}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cea6ae" />
          <stop offset="50%" stopColor="#b0a6cc" />
          <stop offset="100%" stopColor="#a8bcdc" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f5" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={animate ? { transition: 'stroke-dasharray 1200ms cubic-bezier(0.22, 1, 0.36, 1)' } : undefined}
      />
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.28} fontWeight="800" fill="#2a2540">
        {value}
      </text>
      <text x="50%" y="66%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.11} fill="#9a96a8">
        /100
      </text>
    </svg>
  );
};
