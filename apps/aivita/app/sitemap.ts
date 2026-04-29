import { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://aivita.uz';
  const locales = ['ru', 'uz', 'en'];
  const publicPages = ['', '/privacy', '/terms', '/sign-in'];
  return locales.flatMap((locale) =>
    publicPages.map((page) => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: page === '' ? 1 : 0.7,
    }))
  );
}
