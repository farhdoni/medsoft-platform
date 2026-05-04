/**
 * 3D clay-style SVG icon set — extracted from the design prototype.
 * Each icon: 64×64 viewBox, multi-stop gradient, drop-shadow.
 *
 * Usage:  <Icon name="heart" size={48} />
 *
 * To add a new icon, drop a new <symbol>-style React component into
 * ICON_MAP and the type union. Keep palette tokens in sync with
 * tailwind.config.ts colors.
 */

import * as React from "react";

type Size = number;

const PALETTE = {
  blue: { light: "#cdd9f0", mid: "#8aa1cc", dark: "#5e75a8" },
  purple: { light: "#d6cfee", mid: "#9889c4", dark: "#6e5fa0" },
  lime: { light: "#d8e8b0", mid: "#9ab866", dark: "#688844" },
  pink: { light: "#f0c8d0", mid: "#cc8a96", dark: "#9c5e6c" },
  white: { light: "#fefdfa", mid: "#ece8e0", dark: "#bfb8a8" },
  mint: { light: "#c8e0d0", mid: "#80b094", dark: "#548068" },
  orange: { light: "#f5d4b0", mid: "#d8a06a", dark: "#a87238" },
} as const;

const grad = (id: string, c1: string, c2: string, c3: string) => (
  <linearGradient id={id} x1="20%" y1="0%" x2="80%" y2="100%">
    <stop offset="0%" stopColor={c1} />
    <stop offset="55%" stopColor={c2} />
    <stop offset="100%" stopColor={c3} />
  </linearGradient>
);
const radial = (id: string, c1: string, c2: string) => (
  <radialGradient id={id} cx="32%" cy="28%" r="55%">
    <stop offset="0%" stopColor={c1} stopOpacity="0.95" />
    <stop offset="100%" stopColor={c2} stopOpacity="0" />
  </radialGradient>
);

const shadowFilter =
  "drop-shadow(0 6px 8px rgba(80, 70, 140, 0.18)) drop-shadow(0 2px 3px rgba(80, 70, 140, 0.12))";

const Heart3D = ({ size }: { size: Size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      {grad("h-body", PALETTE.lime.light, PALETTE.lime.mid, PALETTE.lime.dark)}
      {radial("h-hl", "#fff", "#fff")}
    </defs>
    <ellipse cx="32" cy="56" rx="14" ry="2.5" fill="rgba(80, 70, 140, 0.2)" />
    <path
      d="M32 52 C32 52 12 38 12 24 C12 16 18 12 24 12 C28 12 30 14 32 18 C34 14 36 12 40 12 C46 12 52 16 52 24 C52 38 32 52 32 52 Z"
      fill="url(#h-body)"
      stroke={PALETTE.lime.dark}
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    <ellipse cx="22" cy="22" rx="6" ry="4" fill="url(#h-hl)" opacity="0.7" transform="rotate(-25 22 22)" />
    <ellipse cx="20" cy="20" rx="2.5" ry="1.5" fill="#fff" opacity="0.9" transform="rotate(-25 20 20)" />
  </svg>
);

const Drop3D = ({ size }: { size: Size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      {grad("d-body", PALETTE.blue.light, PALETTE.blue.mid, PALETTE.blue.dark)}
      {radial("d-hl", "#fff", "#fff")}
    </defs>
    <ellipse cx="32" cy="58" rx="11" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path
      d="M32 6 C32 6 16 28 16 40 C16 50 23 56 32 56 C41 56 48 50 48 40 C48 28 32 6 32 6 Z"
      fill="url(#d-body)"
      stroke={PALETTE.blue.dark}
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    <ellipse cx="24" cy="32" rx="4" ry="8" fill="url(#d-hl)" opacity="0.7" transform="rotate(-15 24 32)" />
    <ellipse cx="22" cy="28" rx="1.5" ry="3" fill="#fff" opacity="0.9" transform="rotate(-15 22 28)" />
  </svg>
);

const Steps3D = ({ size }: { size: Size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      {grad("s-body", PALETTE.mint.light, PALETTE.mint.mid, PALETTE.mint.dark)}
      {radial("s-hl", "#fff", "#fff")}
    </defs>
    <ellipse cx="32" cy="58" rx="14" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <ellipse cx="22" cy="38" rx="9" ry="14" fill="url(#s-body)" stroke={PALETTE.mint.dark} strokeWidth="0.8" />
    <ellipse cx="14" cy="22" rx="3.5" ry="4.5" fill="url(#s-body)" stroke={PALETTE.mint.dark} strokeWidth="0.6" />
    <ellipse cx="22" cy="14" rx="3" ry="4" fill="url(#s-body)" stroke={PALETTE.mint.dark} strokeWidth="0.6" />
    <ellipse cx="30" cy="18" rx="3" ry="4" fill="url(#s-body)" stroke={PALETTE.mint.dark} strokeWidth="0.6" />
    <ellipse cx="18" cy="32" rx="2.5" ry="3" fill="url(#s-hl)" opacity="0.7" />
  </svg>
);

const Habit3D = ({ size }: { size: Size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      {grad("hb-body", PALETTE.pink.light, PALETTE.pink.mid, PALETTE.pink.dark)}
      {radial("hb-hl", "#fff", "#fff")}
    </defs>
    <ellipse cx="32" cy="58" rx="14" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <rect x="14" y="10" width="36" height="44" rx="4" fill="url(#hb-body)" stroke={PALETTE.pink.dark} strokeWidth="0.8" />
    <rect x="20" y="16" width="24" height="3" rx="1.5" fill="#fff" opacity="0.7" />
    <rect x="20" y="24" width="20" height="2.5" rx="1" fill="#fff" opacity="0.5" />
    <rect x="20" y="32" width="22" height="2.5" rx="1" fill="#fff" opacity="0.5" />
    <ellipse cx="22" cy="20" rx="3" ry="6" fill="url(#hb-hl)" opacity="0.7" />
  </svg>
);

const Search3D = ({ size }: { size: Size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      {grad("sr-body", PALETTE.blue.light, PALETTE.blue.mid, PALETTE.blue.dark)}
    </defs>
    <circle cx="26" cy="26" r="14" fill="none" stroke="url(#sr-body)" strokeWidth="5" />
    <circle cx="22" cy="22" r="4" fill="#fff" opacity="0.4" />
    <line x1="38" y1="38" x2="52" y2="52" stroke={PALETTE.blue.dark} strokeWidth="6" strokeLinecap="round" />
  </svg>
);

const Bell3D = ({ size }: { size: Size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      {grad("bl-body", PALETTE.mint.light, PALETTE.mint.mid, PALETTE.mint.dark)}
      {radial("bl-hl", "#fff", "#fff")}
    </defs>
    <ellipse cx="32" cy="56" rx="12" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path
      d="M32 8 C22 8 16 16 16 28 L14 44 L50 44 L48 28 C48 16 42 8 32 8 Z"
      fill="url(#bl-body)"
      stroke={PALETTE.mint.dark}
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    <ellipse cx="32" cy="50" rx="4" ry="3" fill={PALETTE.mint.dark} />
    <ellipse cx="24" cy="20" rx="3" ry="6" fill="url(#bl-hl)" opacity="0.7" />
  </svg>
);

const Report3D = ({ size }: { size: Size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      {grad("rp-body", PALETTE.purple.light, PALETTE.purple.mid, PALETTE.purple.dark)}
      {radial("rp-hl", "#fff", "#fff")}
    </defs>
    <ellipse cx="32" cy="58" rx="14" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <rect x="14" y="8" width="32" height="44" rx="3" fill={PALETTE.white.light} stroke={PALETTE.purple.dark} strokeWidth="0.8" />
    <rect x="14" y="8" width="32" height="44" rx="3" fill="url(#rp-body)" opacity="0.18" />
    <rect x="20" y="14" width="20" height="3" rx="1.5" fill={PALETTE.purple.mid} />
    <rect x="20" y="22" width="16" height="2.5" rx="1" fill={PALETTE.purple.light} />
    <rect x="20" y="28" width="20" height="2.5" rx="1" fill={PALETTE.purple.light} />
    <rect x="20" y="34" width="14" height="2.5" rx="1" fill={PALETTE.purple.light} />
    <rect x="38" y="40" width="10" height="14" rx="2" fill="url(#rp-body)" stroke={PALETTE.purple.dark} strokeWidth="0.8" />
    <ellipse cx="20" cy="14" rx="2" ry="3" fill="url(#rp-hl)" opacity="0.7" />
  </svg>
);

const Test3D = ({ size }: { size: Size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      {grad("ts-body", PALETTE.blue.light, PALETTE.blue.mid, PALETTE.blue.dark)}
    </defs>
    <ellipse cx="32" cy="58" rx="9" ry="1.6" fill="rgba(80, 70, 140, 0.2)" />
    <rect x="22" y="6" width="12" height="6" rx="1.5" fill={PALETTE.white.dark} />
    <path d="M24 12 L24 50 Q24 56 32 56 Q40 56 40 50 L40 12 Z" fill="url(#ts-body)" stroke={PALETTE.blue.dark} strokeWidth="0.8" />
    <path d="M24 36 L24 50 Q24 56 32 56 Q40 56 40 50 L40 36 Z" fill={PALETTE.blue.mid} opacity="0.6" />
    <circle cx="29" cy="44" r="1.5" fill="#fff" opacity="0.7" />
    <circle cx="34" cy="48" r="1" fill="#fff" opacity="0.5" />
  </svg>
);

const Food3D = ({ size }: { size: Size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      {grad("fd-body", PALETTE.orange.light, PALETTE.orange.mid, PALETTE.orange.dark)}
      {radial("fd-hl", "#fff", "#fff")}
    </defs>
    <ellipse cx="32" cy="58" rx="13" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path
      d="M32 16 Q22 16 16 26 Q14 38 22 50 Q28 56 32 56 Q36 56 42 50 Q50 38 48 26 Q42 16 32 16 Z"
      fill="url(#fd-body)"
      stroke={PALETTE.orange.dark}
      strokeWidth="0.8"
    />
    <path d="M32 16 L34 8 Q36 6 38 8" fill="none" stroke={PALETTE.lime.dark} strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="38" cy="12" rx="3" ry="2" fill={PALETTE.lime.mid} transform="rotate(20 38 12)" />
    <ellipse cx="22" cy="28" rx="3" ry="6" fill="url(#fd-hl)" opacity="0.7" />
  </svg>
);

const Family3D = ({ size }: { size: Size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      {grad("fm-body", PALETTE.purple.light, PALETTE.purple.mid, PALETTE.purple.dark)}
      {grad("fm-skin", "#fde0c8", "#f5c8a0", "#d8a070")}
    </defs>
    <ellipse cx="32" cy="58" rx="16" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <circle cx="20" cy="20" r="6" fill="url(#fm-skin)" />
    <path d="M10 48 Q10 36 20 36 Q30 36 30 48 L30 54 L10 54 Z" fill="url(#fm-body)" stroke={PALETTE.purple.dark} strokeWidth="0.6" />
    <circle cx="44" cy="20" r="6" fill="url(#fm-skin)" />
    <path d="M34 48 Q34 36 44 36 Q54 36 54 48 L54 54 L34 54 Z" fill="url(#fm-body)" stroke={PALETTE.purple.dark} strokeWidth="0.6" />
    <circle cx="32" cy="34" r="3.5" fill="url(#fm-skin)" />
    <path d="M27 48 Q27 40 32 40 Q37 40 37 48 L37 54 L27 54 Z" fill={PALETTE.pink.mid} stroke={PALETTE.pink.dark} strokeWidth="0.4" />
  </svg>
);

const ChatAI3D = ({ size }: { size: Size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      {grad("ca-body", PALETTE.purple.light, PALETTE.purple.mid, PALETTE.purple.dark)}
      {radial("ca-hl", "#fff", "#fff")}
    </defs>
    <ellipse cx="32" cy="58" rx="14" ry="2" fill="rgba(80, 70, 140, 0.2)" />
    <path
      d="M10 28 Q10 14 26 14 L40 14 Q54 14 54 28 Q54 42 40 42 L24 42 L14 50 L17 42 Q10 40 10 28 Z"
      fill="url(#ca-body)"
      stroke={PALETTE.purple.dark}
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    <circle cx="22" cy="28" r="2.5" fill="#fff" />
    <circle cx="32" cy="28" r="2.5" fill="#fff" />
    <circle cx="42" cy="28" r="2.5" fill="#fff" />
    <ellipse cx="20" cy="22" rx="4" ry="2" fill="url(#ca-hl)" opacity="0.7" />
  </svg>
);

const ICON_MAP = {
  heart: Heart3D,
  drop: Drop3D,
  steps: Steps3D,
  habit: Habit3D,
  search: Search3D,
  bell: Bell3D,
  report: Report3D,
  test: Test3D,
  food: Food3D,
  family: Family3D,
  chat: ChatAI3D,
} as const;

export type IconName = keyof typeof ICON_MAP;

export function DashIcon({ name, size = 56 }: { name: IconName; size?: number }) {
  return <Icon name={name} size={size} />;
}

export function Icon({ name, size = 56 }: { name: IconName; size?: number }) {
  const C = ICON_MAP[name];
  return (
    <span
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        filter: shadowFilter,
      }}
    >
      <C size={size} />
    </span>
  );
}
