import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * GET /api/download/apk  (rewritten from /downloads/aivita.apk)
 *
 * Serves the Android APK file directly from disk if present at
 * public/downloads/aivita.apk, otherwise falls back to ANDROID_APK_URL
 * env var, otherwise redirects to the /get-app landing page.
 */
export async function GET() {
  const apkPath = path.join(process.cwd(), 'public', 'downloads', 'aivita.apk');

  if (fs.existsSync(apkPath)) {
    const stat = fs.statSync(apkPath);
    const stream = fs.createReadStream(apkPath);

    // Convert Node.js ReadableStream → Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="aivita.apk"',
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Fallback: redirect to externally-hosted APK (set via Coolify env var)
  const apkUrl = process.env.ANDROID_APK_URL;
  if (apkUrl) {
    return NextResponse.redirect(apkUrl, { status: 302 });
  }

  // APK not available yet — send to the app landing page
  return NextResponse.redirect(
    new URL('/get-app', process.env.NEXT_PUBLIC_APP_URL ?? 'https://aivita.uz'),
    { status: 302 },
  );
}
