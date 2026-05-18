import { createClient } from '@/lib/supabase/client'

// Lista de emails con acceso admin
// En producción esto podría venir de una tabla en Supabase
const ADMIN_EMAILS = [
  'tu@email.com',  // ← reemplazá con los emails reales
]

export async function esAdmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return false
  return ADMIN_EMAILS.includes(user.email)
}

export async function subirArchivo(
  file: File,
  path: string
): Promise<{ path: string; url: string } | null> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from('reportes')
    .upload(path, file, { upsert: true })

  if (error) {
    console.error('Error subiendo archivo:', error)
    return null
  }

  // URL firmada válida por 1 año (para descarga privada)
  const { data: signed } = await supabase.storage
    .from('reportes')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  return { path: data.path, url: signed?.signedUrl ?? '' }
}

export async function guardarReporte(params: {
  type_id: string
  titulo: string
  periodo: string
  fecha_reporte?: string
  storage_path?: string
  datos: Record<string, unknown>
  estado?: 'borrador' | 'publicado'
}): Promise<{ id: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('reportes')
    .insert({
      ...params,
      subido_por: user?.id,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error guardando reporte:', error)
    return null
  }

  return data
}

export async function publicarReporte(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('reportes')
    .update({ estado: 'publicado', updated_at: new Date().toISOString() })
    .eq('id', id)

  return !error
}

export async function obtenerReportes(type_id?: string) {
  const supabase = createClient()
  let query = supabase
    .from('reportes')
    .select('id, titulo, periodo, estado, created_at, type_id')
    .order('periodo', { ascending: false })

  if (type_id) query = query.eq('type_id', type_id)

  const { data } = await query
  return data ?? []
}

export async function obtenerReporte(id: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('reportes')
    .select('*')
    .eq('id', id)
    .single()
  return data
}
