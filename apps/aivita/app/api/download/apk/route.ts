import { NextResponse } from 'next/server';

/**
 * GET /api/download/apk  (rewritten from /downloads/aivita.apk)
 *
 * Redirects to the Android APK.
 * Set ANDROID_APK_URL env var to the actual file URL after an EAS Build.
 * Until then returns a 302 to the /get-app page so users aren't stranded on a 404.
 */
export async function GET() {
  const apkUrl = process.env.ANDROID_APK_URL;

  if (apkUrl) {
    return NextResponse.redirect(apkUrl, { status: 302 });
  }

  // APK not published yet — send to the app landing page
  return NextResponse.redirect(new URL('/get-app', process.env.NEXT_PUBLIC_APP_URL ?? 'https://aivita.uz'), {
    status: 302,
  });
}
