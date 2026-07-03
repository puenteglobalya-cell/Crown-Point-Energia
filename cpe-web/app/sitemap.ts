import { MetadataRoute } from 'next'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

const BASE = 'https://crownpointenergy.com'

// Revalidate the sitemap hourly so newly published releases appear.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                       lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/inversores`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/comunicados`,      lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/operaciones`,      lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/acerca`,           lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/comercial`,        lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/carreras`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/contacto`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.6 },
    { url: `${BASE}/legal/terminos`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/legal/privacidad`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/legal/avisos`,     lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  // Published press releases — resilient if the table doesn't exist yet.
  let comunicados: MetadataRoute.Sitemap = []
  try {
    const { data } = await createSupabaseServerAdminClient()
      .from('comunicados')
      .select('id, fecha, updated_at')
      .eq('publicado', true)
      .order('fecha', { ascending: false })
      .limit(500)
    comunicados = (data ?? []).map((c: { id: string; fecha: string | null; updated_at: string | null }) => ({
      url: `${BASE}/comunicados/${c.id}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : c.fecha ? new Date(c.fecha + 'T12:00:00Z') : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch {
    comunicados = []
  }

  return [...staticRoutes, ...comunicados]
}
