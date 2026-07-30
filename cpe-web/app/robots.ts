import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/portal/', '/auth/', '/api/', '/biblioteca', '/infografia'],
      },
    ],
    // TEMP: pointing at the Vercel domain until DNS migrates — see sitemap.ts
    sitemap: 'https://crown-point-energia.vercel.app/sitemap.xml',
    host: 'https://crown-point-energia.vercel.app',
  }
}
