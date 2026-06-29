import { MetadataRoute } from 'next'

const BASE = 'https://crownpointenergy.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                       lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/inversores`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/comunicados`,      lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/operaciones`,      lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/acerca`,           lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/esg`,              lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/comercial`,        lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/carreras`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/infografia`,       lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contacto`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.6 },
    { url: `${BASE}/legal/terminos`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/legal/privacidad`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/legal/avisos`,     lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  return staticRoutes
}
