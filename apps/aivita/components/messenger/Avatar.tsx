'use client';

import { initialsOf } from './format';
import type { MessengerUser } from './types';

/**
 * Avatar for a conversation partner: their picture when they have one,
 * otherwise their initials on the AIVITA accent gradient.
 */
export function Avatar({
  user,
  size = 48,
}: {
  user: MessengerUser | null;
  size?: number;
}) {
  const dimension = { width: size, height: size };

  if (user?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className="rounded-full object-cover flex-shrink-0 border border-app-border"
        style={dimension}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white select-none"
      style={{
        ...dimension,
        fontSize: Math.round(size * 0.36),
        background: 'linear-gradient(135deg, var(--accent, #cc8a96), var(--accent-dark, #9c5e6c))',
      }}
    >
      {initialsOf(user)}
    </div>
  );
}
