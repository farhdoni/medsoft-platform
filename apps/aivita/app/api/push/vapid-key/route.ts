import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/push/vapid-key
 * Returns the VAPID public key from server runtime env.
 * Public key is not a secret — safe to expose to the browser.
 * Using a server route avoids the Next.js NEXT_PUBLIC_* build-time baking problem.
 */
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
  if (!key) {
    return NextResponse.json({ key: null }, { status: 404 });
  }
  return NextResponse.json({ key });
}
