import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase'
import { isAdminEmail } from '@/lib/admin-auth'
import BibliotecaSearch from './BibliotecaSearch'

export const dynamic = 'force-dynamic'

type Doc = {
  id: string
  nombre: string
  path: string
  size_bytes: number | null
  mime_type: string | null
  vigente: boolean
  created_at: string
  signedUrl?: string
}

type Carpeta = {
  id: number
  nombre: string
  descripcion: string
  orden: number
  bib_documentos: Doc[]
}


export default async function BibliotecaPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createSupabaseServerAdminClient()

  // Admins bypass RLS and see all carpetas; regular users are filtered by their groups
  const queryClient = isAdminEmail(user.email) ? adminClient : supabase

  const { data: rawCarpetas } = await queryClient
    .from('bib_carpetas')
    .select('id, nombre, descripcion, orden, bib_documentos(id, nombre, path, size_bytes, mime_type, vigente, created_at)')
    .eq('activa', true)
    .order('orden')
  const carpetas: (Carpeta & { bib_documentos: (Doc & { signedUrl: string })[] })[] = await Promise.all(
    (rawCarpetas ?? []).map(async (c) => ({
      ...c,
      bib_documentos: await Promise.all(
        ((c.bib_documentos ?? []) as Doc[])
          .sort((a, b) => {
            if (a.vigente && !b.vigente) return -1
            if (!a.vigente && b.vigente) return 1
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
          .map(async (d) => {
            const { data } = await adminClient.storage
              .from('biblioteca')
              .createSignedUrl(d.path, 7200)
            return { ...d, signedUrl: data?.signedUrl ?? '' }
          })
      ),
    }))
  )

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ marginBottom: 40 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cp-green)', fontWeight: 700 }}>
          Uso interno
        </span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6, marginBottom: 4 }}>
          Biblioteca
        </h1>
        <p style={{ color: 'var(--fg-soft)', fontSize: 15, margin: 0 }}>
          Documentos vigentes — acceso según perfil asignado
        </p>
      </div>

      {carpetas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--fg-muted)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.35 }}>
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p style={{ fontSize: 15, margin: '0 0 6px' }}>No hay carpetas disponibles para tu perfil.</p>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>Contactá al administrador para solicitar acceso.</p>
        </div>
      ) : (
        <BibliotecaSearch carpetas={carpetas} />
      )}
    </div>
  )
}
