import { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/home', '/profile', '/habits', '/chat', '/test', '/family', '/report', '/settings', '/api/'] }],
    sitemap: 'https://aivita.uz/sitemap.xml',
  };
}
