import { clearSession } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
