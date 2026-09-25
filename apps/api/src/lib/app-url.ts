import { db, aivitaUsers } from '@medsoft/db';
import { eq } from 'drizzle-orm';
import { env } from '../env.js';
import { buildAppUrl } from './app-url-build.js';

// Единственный способ собрать ссылку ВНУТРЬ веб-приложения (кабинет пациента
// и врача) — для писем, Telegram, пушей, адресов возврата платёжных систем.
//
// Почему не `${env.AIVITA_URL}/<путь>`: AIVITA_URL — это aivita.uz, хост
// статического лендинга. Системный nginx пускает в Next только /ru/* и пару
// служебных путей; всё остальное (путь без локали, /uz/*, /en/*) уходит в
// лендинг, а тот на любой неизвестный адрес молча отдаёт свою главную с 200.
// APP_URL (app.aivita.uz) проксирует в Next всё, и все три локали там живые.
export function appUrl(path: string, locale?: string | null): string {
  return buildAppUrl(env.APP_URL, path, locale);
}

// То же, но в языке аккаунта — когда ссылку откроет конкретный пользователь.
export async function userAppUrl(userId: string, path: string): Promise<string> {
  const [row] = await db.select({ locale: aivitaUsers.locale })
    .from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  return appUrl(path, row?.locale);
}
