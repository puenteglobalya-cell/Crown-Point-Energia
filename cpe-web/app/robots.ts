import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/portal/', '/auth/', '/api/', '/biblioteca', '/infografia', '/esg'],
      },
    ],
    sitemap: 'https://crownpointenergy.com/sitemap.xml',
    host: 'https://crownpointenergy.com',
  }
}
