import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { isSoft3dEnabled } from '@/lib/soft3d/flag';
import { getTranslations } from 'next-intl/server';
import { ShowcaseClient } from './ShowcaseClient';
import { HomeShowcaseSection } from './HomeShowcaseSection';

/**
 * Internal showcase — every Part A component, every state, next to which
 * mockup file it was ported from. Flag-gated on top of the layout's own
 * gating: a signed-in user without the flag hits notFound() here even if
 * they guess the URL directly.
 */
export default async function Soft3dShowcasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session || !isSoft3dEnabled(session.email)) {
    notFound();
  }
  const t = await getTranslations('app.soft3d');

  return (
    <ShowcaseClient title={t('showcaseTitle')}>
      <HomeShowcaseSection locale={locale} />
    </ShowcaseClient>
  );
}
