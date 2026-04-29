import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';

export async function PublicFooter() {
  const t = await getTranslations('footer');
  return (
    <footer style={{ background: 'rgba(15,25,41,0.95)' }} className="px-6 md:px-14 pt-16 pb-8">
      <div className="max-w-[1320px] mx-auto">
        <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-12">
          {/* Brand */}
          <div>
            <Logo inverted />
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'rgba(180,220,240,0.7)' }}>{t('desc')}</p>
            <div className="flex gap-3 mt-6">
              {['📷', '✈️', '▶', '👤'].map((icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
                  style={{ color: 'rgba(180,220,240,0.7)' }}>
                  {icon}
                </a>
              ))}
            </div>
          </div>
          {/* Product */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white mb-4">{t('product')}</div>
            <ul className="space-y-3">
              {[['#features', t('features')], ['#how', t('how')], ['#personas', t('forWhom')], ['/sign-in', t('openApp')]].map(([href, label]) => (
                <li key={href}><a href={href} className="text-sm hover:text-white transition-colors" style={{ color: 'rgba(180,220,240,0.7)' }}>{label}</a></li>
              ))}
            </ul>
          </div>
          {/* Company */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white mb-4">{t('company')}</div>
            <ul className="space-y-3">
              {[t('aboutMedsoft'), t('partners'), t('careers'), t('blog')].map((l) => (
                <li key={l}><a href="#" className="text-sm hover:text-white transition-colors" style={{ color: 'rgba(180,220,240,0.7)' }}>{l}</a></li>
              ))}
            </ul>
          </div>
          {/* Support */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white mb-4">{t('support')}</div>
            <ul className="space-y-3">
              {[['#faq', t('faq')], ['#', t('contact')], ['https://t.me/aivita_uz', t('telegram')], ['mailto:hello@aivita.uz', t('email')]].map(([href, label]) => (
                <li key={href}><a href={href} className="text-sm hover:text-white transition-colors" style={{ color: 'rgba(180,220,240,0.7)' }}>{label}</a></li>
              ))}
            </ul>
          </div>
        </div>
        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs" style={{ color: 'rgba(180,220,240,0.5)' }}>{t('copyright')}</span>
          <div className="flex gap-4">
            {[['privacy', '/privacy'], ['terms', '/terms'], ['law', '#']].map(([key, href]) => (
              <a key={key} href={href} className="text-xs hover:text-white transition-colors" style={{ color: 'rgba(180,220,240,0.5)' }}>
                {t(key as any)}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
