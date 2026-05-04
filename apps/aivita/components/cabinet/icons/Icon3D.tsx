'use client';
import * as React from 'react';

const PALETTE = {
  blue:   { light: '#cdd9f0', mid: '#8aa1cc', dark: '#5e75a8' },
  purple: { light: '#d6cfee', mid: '#9889c4', dark: '#6e5fa0' },
  lime:   { light: '#d8e8b0', mid: '#9ab866', dark: '#688844' },
  pink:   { light: '#f0c8d0', mid: '#cc8a96', dark: '#9c5e6c' },
  white:  { light: '#fefdfa', mid: '#ece8e0', dark: '#bfb8a8' },
  mint:   { light: '#c8e0d0', mid: '#80b094', dark: '#548068' },
  orange: { light: '#f5d4b0', mid: '#d8a06a', dark: '#a87238' },
} as const;

const grad = (id: string, c1: string, c2: string, c3: string): React.ReactElement => (
  <linearGradient id={id} x1="20%" y1="0%" x2="80%" y2="100%">
    <stop offset="0%" stopColor={c1} />
    <stop offset="55%" stopColor={c2} />
    <stop offset="100%" stopColor={c3} />
  </linearGradient>
);

const radial = (id: string, c1: string, c2: string): React.ReactElement => (
  <radialGradient id={id} cx="32%" cy="28%" r="55%">
    <stop offset="0%" stopColor={c1} stopOpacity="0.95" />
    <stop offset="100%" stopColor={c2} stopOpacity="0" />
  </radialGradient>
);

const Heart3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('heart-body', PALETTE.lime.light, PALETTE.lime.mid, PALETTE.lime.dark)}
      {radial('heart-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="56" rx="14" ry="2.5" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M32 52 C32 52 12 38 12 24 C12 16 18 12 24 12 C28 12 30 14 32 18 C34 14 36 12 40 12 C46 12 52 16 52 24 C52 38 32 52 32 52 Z" fill="url(#heart-body)" stroke={PALETTE.lime.dark} strokeWidth="0.8" strokeLinejoin="round" />
    <ellipse cx="22" cy="22" rx="6" ry="4" fill="url(#heart-hl)" opacity="0.7" transform="rotate(-25 22 22)" />
    <ellipse cx="20" cy="20" rx="2.5" ry="1.5" fill="#ffffff" opacity="0.9" transform="rotate(-25 20 20)" />
  </svg>
);

const Drop3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('drop-body', PALETTE.blue.light, PALETTE.blue.mid, PALETTE.blue.dark)}
      {radial('drop-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="56" rx="12" ry="2.5" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M32 8 C32 8 16 26 16 38 C16 47 23 54 32 54 C41 54 48 47 48 38 C48 26 32 8 32 8 Z" fill="url(#drop-body)" stroke={PALETTE.blue.dark} strokeWidth="0.8" strokeLinejoin="round" />
    <ellipse cx="25" cy="30" rx="5" ry="8" fill="url(#drop-hl)" opacity="0.6" transform="rotate(-15 25 30)" />
    <ellipse cx="23" cy="26" rx="2" ry="3" fill="#ffffff" opacity="0.95" transform="rotate(-15 23 26)" />
  </svg>
);

const Kit3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('kit-body', PALETTE.blue.light, PALETTE.blue.mid, PALETTE.blue.dark)}
      {grad('kit-top', '#e0e6ff', '#c0cbf0', '#9aaad8')}
      {radial('kit-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="56" rx="20" ry="2.5" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M24 18 Q24 12 32 12 Q40 12 40 18" fill="none" stroke={PALETTE.blue.dark} strokeWidth="3" strokeLinecap="round" />
    <rect x="11" y="18" width="42" height="8" rx="2" fill="url(#kit-top)" stroke={PALETTE.blue.dark} strokeWidth="0.8" />
    <rect x="11" y="24" width="42" height="28" rx="3" fill="url(#kit-body)" stroke={PALETTE.blue.dark} strokeWidth="0.8" />
    <rect x="22" y="30" width="20" height="16" rx="2" fill="#ffffff" stroke={PALETTE.blue.dark} strokeWidth="0.6" opacity="0.95" />
    <rect x="30" y="32" width="4" height="12" rx="1" fill={PALETTE.lime.mid} />
    <rect x="26" y="36" width="12" height="4" rx="1" fill={PALETTE.lime.mid} />
    <ellipse cx="20" cy="32" rx="4" ry="6" fill="url(#kit-hl)" opacity="0.5" />
  </svg>
);

const Shield3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('shield-body', PALETTE.blue.light, PALETTE.blue.mid, PALETTE.blue.dark)}
      {grad('shield-disc', PALETTE.white.light, PALETTE.white.mid, PALETTE.white.dark)}
      {radial('shield-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="56" rx="14" ry="2.5" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M32 8 L50 14 V32 C50 42 42 50 32 54 C22 50 14 42 14 32 V14 Z" fill="url(#shield-body)" stroke={PALETTE.blue.dark} strokeWidth="0.8" strokeLinejoin="round" />
    <circle cx="32" cy="30" r="13" fill="url(#shield-disc)" stroke={PALETTE.blue.dark} strokeWidth="0.6" opacity="0.95" />
    <path d="M25 30 L30 35 L40 24" fill="none" stroke={PALETTE.lime.dark} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M25 30 L30 35 L40 24" fill="none" stroke={PALETTE.lime.mid} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="22" cy="18" rx="5" ry="8" fill="url(#shield-hl)" opacity="0.55" transform="rotate(-15 22 18)" />
  </svg>
);

const Pill3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('pill-l', PALETTE.pink.light, PALETTE.pink.mid, PALETTE.pink.dark)}
      {grad('pill-r', PALETTE.white.light, PALETTE.white.mid, PALETTE.white.dark)}
      {radial('pill-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="56" rx="18" ry="2.5" fill="rgba(80, 70, 140, 0.2)" />
    <g transform="rotate(-30 32 32)">
      <path d="M14 32 a18 12 0 0 1 18 -12 V44 a18 12 0 0 1 -18 -12 Z" fill="url(#pill-l)" stroke={PALETTE.pink.dark} strokeWidth="0.8" />
      <path d="M50 32 a18 12 0 0 1 -18 12 V20 a18 12 0 0 1 18 12 Z" fill="url(#pill-r)" stroke={PALETTE.white.dark} strokeWidth="0.8" />
      <ellipse cx="22" cy="26" rx="4" ry="2.5" fill="url(#pill-hl)" opacity="0.7" />
    </g>
  </svg>
);

const Chat3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('chat-body', PALETTE.purple.light, PALETTE.purple.mid, PALETTE.purple.dark)}
      {radial('chat-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="56" rx="18" ry="2.5" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M12 22 C12 16 16 12 22 12 H42 C48 12 52 16 52 22 V36 C52 42 48 46 42 46 H28 L18 54 V46 C14 45 12 41 12 36 Z" fill="url(#chat-body)" stroke={PALETTE.purple.dark} strokeWidth="0.8" strokeLinejoin="round" />
    <circle cx="22" cy="29" r="2.5" fill="#ffffff" />
    <circle cx="32" cy="29" r="2.5" fill="#ffffff" />
    <circle cx="42" cy="29" r="2.5" fill="#ffffff" />
    <ellipse cx="22" cy="20" rx="6" ry="3" fill="url(#chat-hl)" opacity="0.55" />
  </svg>
);

const Report3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('rep-body', PALETTE.white.light, PALETTE.white.mid, PALETTE.white.dark)}
      {grad('rep-fold', '#e0e6ff', '#c0cbf0', '#9aaad8')}
      {radial('rep-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="58" rx="16" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M16 8 H40 L52 20 V52 C52 54 50 56 48 56 H16 C14 56 12 54 12 52 V12 C12 10 14 8 16 8 Z" fill="url(#rep-body)" stroke={PALETTE.blue.dark} strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M40 8 V18 C40 19 41 20 42 20 H52 Z" fill="url(#rep-fold)" stroke={PALETTE.blue.dark} strokeWidth="0.8" strokeLinejoin="round" />
    <rect x="20" y="28" width="22" height="2.5" rx="1.25" fill={PALETTE.blue.mid} />
    <rect x="20" y="34" width="18" height="2.5" rx="1.25" fill={PALETTE.blue.mid} opacity="0.7" />
    <rect x="20" y="42" width="14" height="2.5" rx="1.25" fill={PALETTE.lime.mid} />
    <path d="M20 48 L24 48 L26 44 L29 52 L32 48 L42 48" fill="none" stroke={PALETTE.pink.mid} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="22" cy="18" rx="4" ry="6" fill="url(#rep-hl)" opacity="0.5" />
  </svg>
);

const Bell3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('bell-body', PALETTE.lime.light, PALETTE.lime.mid, PALETTE.lime.dark)}
      {radial('bell-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="58" rx="14" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M14 44 V40 C14 28 20 18 32 18 C44 18 50 28 50 40 V44 L54 48 H10 Z" fill="url(#bell-body)" stroke={PALETTE.lime.dark} strokeWidth="0.8" strokeLinejoin="round" />
    <circle cx="32" cy="14" r="3" fill={PALETTE.lime.dark} />
    <path d="M27 52 C27 56 29 58 32 58 C35 58 37 56 37 52 Z" fill={PALETTE.lime.dark} />
    <ellipse cx="22" cy="28" rx="4" ry="7" fill="url(#bell-hl)" opacity="0.6" />
    <ellipse cx="20" cy="24" rx="1.8" ry="3" fill="#ffffff" opacity="0.9" />
  </svg>
);

const Family3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('fam-a', PALETTE.blue.light, PALETTE.blue.mid, PALETTE.blue.dark)}
      {grad('fam-b', PALETTE.purple.light, PALETTE.purple.mid, PALETTE.purple.dark)}
      {grad('fam-head', '#fde0c8', '#f0bc94', '#c89066')}
      {radial('fam-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="58" rx="20" ry="2.5" fill="rgba(80, 70, 140, 0.2)" />
    <circle cx="42" cy="22" r="7" fill="url(#fam-head)" stroke={PALETTE.blue.dark} strokeWidth="0.5" />
    <path d="M30 50 C30 40 36 34 42 34 C48 34 54 40 54 50 V54 H30 Z" fill="url(#fam-b)" stroke={PALETTE.purple.dark} strokeWidth="0.6" />
    <circle cx="24" cy="24" r="8" fill="url(#fam-head)" stroke={PALETTE.blue.dark} strokeWidth="0.5" />
    <path d="M10 54 C10 42 16 36 24 36 C32 36 38 42 38 54 V56 H10 Z" fill="url(#fam-a)" stroke={PALETTE.blue.dark} strokeWidth="0.6" />
    <ellipse cx="20" cy="20" rx="2" ry="1.5" fill="#ffffff" opacity="0.8" />
    <ellipse cx="38" cy="18" rx="1.5" ry="1" fill="#ffffff" opacity="0.7" />
  </svg>
);

const Home3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('home-body', PALETTE.white.light, PALETTE.white.mid, PALETTE.white.dark)}
      {grad('home-roof', PALETTE.blue.light, PALETTE.blue.mid, PALETTE.blue.dark)}
      {radial('home-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="56" rx="18" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M14 28 V52 C14 53 15 54 16 54 H48 C49 54 50 53 50 52 V28 Z" fill="url(#home-body)" stroke={PALETTE.blue.dark} strokeWidth="0.8" />
    <path d="M10 30 L32 12 L54 30 Z" fill="url(#home-roof)" stroke={PALETTE.blue.dark} strokeWidth="0.8" strokeLinejoin="round" />
    <rect x="27" y="38" width="10" height="16" rx="2" fill={PALETTE.lime.mid} stroke={PALETTE.lime.dark} strokeWidth="0.6" />
    <circle cx="34" cy="46" r="1" fill={PALETTE.lime.dark} />
    <rect x="18" y="34" width="6" height="6" rx="1" fill={PALETTE.blue.light} stroke={PALETTE.blue.dark} strokeWidth="0.5" />
    <rect x="40" y="34" width="6" height="6" rx="1" fill={PALETTE.blue.light} stroke={PALETTE.blue.dark} strokeWidth="0.5" />
    <path d="M14 28 L30 16 L32 18 L18 30 Z" fill="url(#home-hl)" opacity="0.4" />
  </svg>
);

const Steps3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('step-body', PALETTE.mint.light, PALETTE.mint.mid, PALETTE.mint.dark)}
      {radial('step-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="56" rx="18" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M18 30 C18 22 24 16 32 16 C40 16 46 22 46 30 V42 C46 48 42 52 36 52 H28 C22 52 18 48 18 42 Z" fill="url(#step-body)" stroke={PALETTE.mint.dark} strokeWidth="0.8" />
    <circle cx="22" cy="22" r="3" fill={PALETTE.mint.light} stroke={PALETTE.mint.dark} strokeWidth="0.5" />
    <circle cx="28" cy="18" r="3.5" fill={PALETTE.mint.light} stroke={PALETTE.mint.dark} strokeWidth="0.5" />
    <circle cx="36" cy="18" r="3.5" fill={PALETTE.mint.light} stroke={PALETTE.mint.dark} strokeWidth="0.5" />
    <circle cx="42" cy="22" r="3" fill={PALETTE.mint.light} stroke={PALETTE.mint.dark} strokeWidth="0.5" />
    <ellipse cx="24" cy="34" rx="3" ry="5" fill="url(#step-hl)" opacity="0.5" />
  </svg>
);

const Food3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('food-body', '#ffd0a0', '#f0a060', '#c87030')}
      {grad('food-leaf', PALETTE.lime.light, PALETTE.lime.mid, PALETTE.lime.dark)}
      {radial('food-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="56" rx="16" ry="2.5" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M32 18 C24 18 14 22 14 34 C14 46 22 54 32 54 C42 54 50 46 50 34 C50 22 40 18 32 18 Z" fill="url(#food-body)" stroke="#a05020" strokeWidth="0.8" />
    <rect x="31" y="12" width="2" height="8" rx="1" fill="#704030" />
    <path d="M33 14 Q40 10 42 16 Q38 18 33 16 Z" fill="url(#food-leaf)" stroke={PALETTE.lime.dark} strokeWidth="0.6" />
    <ellipse cx="22" cy="28" rx="4" ry="7" fill="url(#food-hl)" opacity="0.65" />
    <ellipse cx="20" cy="24" rx="1.8" ry="3" fill="#ffffff" opacity="0.9" />
  </svg>
);

const Sparkle3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('spk-body', PALETTE.purple.light, PALETTE.purple.mid, PALETTE.purple.dark)}
      {radial('spk-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="58" rx="12" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M32 8 L36 28 L56 32 L36 36 L32 56 L28 36 L8 32 L28 28 Z" fill="url(#spk-body)" stroke={PALETTE.purple.dark} strokeWidth="0.8" strokeLinejoin="round" />
    <ellipse cx="24" cy="22" rx="3" ry="5" fill="url(#spk-hl)" opacity="0.7" transform="rotate(-30 24 22)" />
  </svg>
);

const Doctor3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('doc-coat', PALETTE.white.light, PALETTE.white.mid, PALETTE.white.dark)}
      {grad('doc-board', PALETTE.blue.light, PALETTE.blue.mid, PALETTE.blue.dark)}
      {grad('doc-pants', PALETTE.blue.mid, PALETTE.blue.dark, '#3d4d75')}
      {grad('doc-skin', '#fde0c8', '#f5c8a0', '#d8a070')}
      {radial('doc-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="60" rx="18" ry="2.2" fill="rgba(80, 70, 140, 0.22)" />
    <rect x="6" y="14" width="28" height="36" rx="3" fill="url(#doc-board)" stroke={PALETTE.blue.dark} strokeWidth="0.8" />
    <rect x="10" y="18" width="20" height="28" rx="1.5" fill="#fbfaf6" />
    <rect x="16" y="11" width="8" height="5" rx="1" fill="#b9b6b0" />
    <line x1="13" y1="25" x2="27" y2="25" stroke={PALETTE.blue.light} strokeWidth="1" />
    <line x1="13" y1="30" x2="24" y2="30" stroke={PALETTE.blue.light} strokeWidth="1" />
    <line x1="13" y1="35" x2="26" y2="35" stroke={PALETTE.blue.light} strokeWidth="1" />
    <rect x="33" y="44" width="4.5" height="14" rx="1.8" fill="url(#doc-pants)" />
    <rect x="40.5" y="44" width="4.5" height="14" rx="1.8" fill="url(#doc-pants)" />
    <path d="M30 26 Q30 22.5 34 22.5 L46 22.5 Q50 22.5 50 26 L51 46 Q40 49 29 46 Z" fill="url(#doc-coat)" stroke={PALETTE.white.dark} strokeWidth="0.6" strokeLinejoin="round" />
    <path d="M34 26 Q33 36 38 38" fill="none" stroke="#2a2a35" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="38.5" cy="39" r="2" fill={PALETTE.blue.mid} stroke="#2a2a35" strokeWidth="0.6" />
    <circle cx="40" cy="14" r="6.2" fill="url(#doc-skin)" stroke="#c89070" strokeWidth="0.4" />
    <ellipse cx="37.5" cy="14.5" rx="0.9" ry="1.3" fill="#1a1a2e" />
    <ellipse cx="42" cy="14.5" rx="0.9" ry="1.3" fill="#1a1a2e" />
    <ellipse cx="34" cy="30" rx="3" ry="6" fill="url(#doc-hl)" opacity="0.6" />
  </svg>
);

const Plus3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('plus-body', PALETTE.lime.light, PALETTE.lime.mid, PALETTE.lime.dark)}
      {radial('plus-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="56" rx="14" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <circle cx="32" cy="32" r="22" fill="url(#plus-body)" stroke={PALETTE.lime.dark} strokeWidth="0.8" />
    <rect x="29" y="20" width="6" height="24" rx="2" fill="#ffffff" />
    <rect x="20" y="29" width="24" height="6" rx="2" fill="#ffffff" />
    <ellipse cx="22" cy="22" rx="5" ry="7" fill="url(#plus-hl)" opacity="0.6" transform="rotate(-25 22 22)" />
  </svg>
);

const Book3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('book-body', PALETTE.pink.light, PALETTE.pink.mid, PALETTE.pink.dark)}
      {grad('book-page', '#ffffff', '#f0eef8', '#d8d4ec')}
      {radial('book-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="56" rx="18" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M14 14 H46 C48 14 50 16 50 18 V52 C50 54 48 56 46 56 H14 Z" fill="url(#book-body)" stroke={PALETTE.pink.dark} strokeWidth="0.8" />
    <rect x="18" y="18" width="28" height="34" rx="1" fill="url(#book-page)" stroke={PALETTE.pink.dark} strokeWidth="0.5" />
    <rect x="22" y="26" width="20" height="2" rx="1" fill={PALETTE.pink.mid} opacity="0.7" />
    <rect x="22" y="32" width="16" height="2" rx="1" fill={PALETTE.pink.mid} opacity="0.5" />
    <rect x="22" y="38" width="18" height="2" rx="1" fill={PALETTE.pink.mid} opacity="0.5" />
    <path d="M14 14 V56 H12 V14 Z" fill={PALETTE.pink.dark} />
    <ellipse cx="22" cy="22" rx="3" ry="5" fill="url(#book-hl)" opacity="0.4" />
  </svg>
);

const Settings3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('set-body', PALETTE.purple.light, PALETTE.purple.mid, PALETTE.purple.dark)}
      {radial('set-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="58" rx="16" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M32 8 L36 12 L42 10 L44 16 L50 18 L48 24 L52 30 V34 L48 40 L50 46 L44 48 L42 54 L36 52 L32 56 L28 52 L22 54 L20 48 L14 46 L16 40 L12 34 V30 L16 24 L14 18 L20 16 L22 10 L28 12 Z" fill="url(#set-body)" stroke={PALETTE.purple.dark} strokeWidth="0.8" strokeLinejoin="round" />
    <circle cx="32" cy="32" r="8" fill={PALETTE.white.light} stroke={PALETTE.purple.dark} strokeWidth="0.6" />
    <circle cx="32" cy="32" r="4" fill={PALETTE.purple.mid} />
    <ellipse cx="22" cy="20" rx="3" ry="5" fill="url(#set-hl)" opacity="0.55" transform="rotate(-25 22 20)" />
  </svg>
);

const Search3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('srch-body', PALETTE.blue.light, PALETTE.blue.mid, PALETTE.blue.dark)}
      {radial('srch-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="58" rx="14" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <circle cx="26" cy="26" r="14" fill="none" stroke="url(#srch-body)" strokeWidth="6" />
    <circle cx="26" cy="26" r="14" fill="none" stroke={PALETTE.blue.dark} strokeWidth="0.8" />
    <circle cx="26" cy="26" r="11" fill="#ffffff" opacity="0.3" />
    <rect x="36" y="36" width="16" height="6" rx="3" fill="url(#srch-body)" stroke={PALETTE.blue.dark} strokeWidth="0.6" transform="rotate(45 44 39)" />
    <ellipse cx="20" cy="20" rx="3" ry="5" fill="url(#srch-hl)" opacity="0.7" transform="rotate(-25 20 20)" />
  </svg>
);

const Arrow3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('arr-body', PALETTE.blue.light, PALETTE.blue.mid, PALETTE.blue.dark)}
    </defs>
    <ellipse cx="32" cy="56" rx="14" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path d="M14 32 H44 M34 20 L46 32 L34 44" fill="none" stroke="url(#arr-body)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 32 H44 M34 20 L46 32 L34 44" fill="none" stroke={PALETTE.blue.dark} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Test3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('test-body', PALETTE.lime.light, PALETTE.lime.mid, PALETTE.lime.dark)}
      {grad('test-glass', '#e8eeff', '#c8d2f0', '#a0aed8')}
      {radial('test-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="58" rx="10" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <g transform="rotate(15 32 32)">
      <rect x="22" y="8" width="20" height="6" rx="2" fill={PALETTE.blue.dark} />
      <path d="M24 14 V44 C24 50 28 54 32 54 C36 54 40 50 40 44 V14 Z" fill="url(#test-glass)" stroke={PALETTE.blue.dark} strokeWidth="0.8" />
      <path d="M24 32 V44 C24 50 28 54 32 54 C36 54 40 50 40 44 V32 Z" fill="url(#test-body)" stroke={PALETTE.lime.dark} strokeWidth="0.6" opacity="0.95" />
      <circle cx="29" cy="40" r="1.5" fill="#ffffff" opacity="0.6" />
      <ellipse cx="27" cy="22" rx="2" ry="8" fill="url(#test-hl)" opacity="0.6" />
    </g>
  </svg>
);

const Calendar3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('cal-body', PALETTE.white.light, PALETTE.white.mid, PALETTE.white.dark)}
      {grad('cal-top', PALETTE.pink.light, PALETTE.pink.mid, PALETTE.pink.dark)}
      {radial('cal-hl', '#ffffff', '#ffffff')}
    </defs>
    <ellipse cx="32" cy="58" rx="18" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <rect x="10" y="14" width="44" height="40" rx="4" fill="url(#cal-body)" stroke={PALETTE.blue.dark} strokeWidth="0.8" />
    <rect x="10" y="14" width="44" height="12" rx="4" fill="url(#cal-top)" stroke={PALETTE.pink.dark} strokeWidth="0.6" />
    <rect x="18" y="10" width="4" height="10" rx="2" fill={PALETTE.purple.dark} />
    <rect x="42" y="10" width="4" height="10" rx="2" fill={PALETTE.purple.dark} />
    <circle cx="22" cy="36" r="2" fill={PALETTE.blue.mid} opacity="0.6" />
    <circle cx="32" cy="36" r="2" fill={PALETTE.lime.mid} />
    <circle cx="42" cy="36" r="2" fill={PALETTE.blue.mid} opacity="0.6" />
    <circle cx="22" cy="44" r="2" fill={PALETTE.blue.mid} opacity="0.6" />
    <circle cx="32" cy="44" r="2" fill={PALETTE.blue.mid} opacity="0.6" />
    <circle cx="42" cy="44" r="2" fill={PALETTE.pink.mid} />
    <ellipse cx="18" cy="20" rx="4" ry="3" fill="url(#cal-hl)" opacity="0.5" />
  </svg>
);

const Menu3D = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
    <defs>
      {grad('menu-body', PALETTE.purple.light, PALETTE.purple.mid, PALETTE.purple.dark)}
    </defs>
    <ellipse cx="32" cy="56" rx="14" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <rect x="12" y="16" width="40" height="6" rx="3" fill="url(#menu-body)" stroke={PALETTE.purple.dark} strokeWidth="0.6" />
    <rect x="12" y="29" width="40" height="6" rx="3" fill="url(#menu-body)" stroke={PALETTE.purple.dark} strokeWidth="0.6" />
    <rect x="12" y="42" width="40" height="6" rx="3" fill="url(#menu-body)" stroke={PALETTE.purple.dark} strokeWidth="0.6" />
  </svg>
);

const ICON_3D_MAP = {
  heart: Heart3D, drop: Drop3D, kit: Kit3D, shield: Shield3D,
  pill: Pill3D, chat: Chat3D, report: Report3D, bell: Bell3D,
  family: Family3D, home: Home3D, steps: Steps3D, food: Food3D,
  sparkle: Sparkle3D, doctor: Doctor3D, plus: Plus3D, book: Book3D,
  habit: Book3D, settings: Settings3D, search: Search3D,
  menu: Menu3D, arrow: Arrow3D, test: Test3D, calendar: Calendar3D,
} as const;

export type Icon3DName = keyof typeof ICON_3D_MAP;

export interface Icon3DProps {
  name: Icon3DName;
  size?: number;
  className?: string;
}

export const Icon3D: React.FC<Icon3DProps> = ({ name, size = 32, className }) => {
  const Component = ICON_3D_MAP[name] ?? ICON_3D_MAP.heart;
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 4px 6px rgba(80, 70, 140, 0.15)) drop-shadow(0 1px 2px rgba(80, 70, 140, 0.1))',
        lineHeight: 0,
      }}
    >
      <Component size={size} />
    </span>
  );
};

export {
  Heart3D, Drop3D, Kit3D, Shield3D, Pill3D, Chat3D, Report3D, Bell3D,
  Family3D, Home3D, Steps3D, Food3D, Sparkle3D, Doctor3D, Plus3D, Book3D,
  Settings3D, Search3D, Arrow3D, Test3D, Calendar3D, Menu3D,
};
