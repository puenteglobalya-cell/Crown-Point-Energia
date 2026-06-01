import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase'

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

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes >= 1048576) return ` · ${(bytes / 1048576).toFixed(1)} MB`
  return ` · ${Math.round(bytes / 1024)} KB`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function BibliotecaPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawCarpetas } = await supabase
    .from('bib_carpetas')
    .select('id, nombre, descripcion, orden, bib_documentos(id, nombre, path, size_bytes, mime_type, vigente, created_at)')
    .order('orden')

  const adminClient = createSupabaseServerAdminClient()
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
        <div style={{ display: 'grid', gap: 20 }}>
          {carpetas.map(carpeta => {
            const vigente = carpeta.bib_documentos.find(d => d.vigente)
            const history = carpeta.bib_documentos.filter(d => !d.vigente)
            return (
              <div key={carpeta.id} style={{
                background: 'var(--surface)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--r-lg)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--cp-green)', flexShrink: 0 }}>
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, margin: 0 }}>{carpeta.nombre}</h2>
                    {carpeta.descripcion && (
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{carpeta.descripcion}</p>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    {carpeta.bib_documentos.length} archivo{carpeta.bib_documentos.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {vigente ? (
                  <div style={{
                    padding: '16px 24px',
                    background: 'rgba(130,188,0,0.05)',
                    borderBottom: history.length > 0 ? '1px solid var(--rule)' : undefined,
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        display: 'inline-block', marginBottom: 6,
                        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'var(--cp-green)', fontWeight: 700,
                        background: 'rgba(130,188,0,0.14)', borderRadius: 4, padding: '2px 7px',
                      }}>Vigente</span>
                      <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{vigente.nombre}</p>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '3px 0 0' }}>
                        {fmtDate(vigente.created_at)}{fmtSize(vigente.size_bytes)}
                      </p>
                    </div>
                    {vigente.signedUrl && (
                      <a
                        href={vigente.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '9px 18px',
                          background: 'var(--cp-green)', color: '#fff',
                          borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 600,
                          textDecoration: 'none', flexShrink: 0,
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Descargar
                      </a>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '16px 24px', color: 'var(--fg-muted)', fontSize: 14 }}>
                    Sin documento vigente
                  </div>
                )}

                {history.length > 0 && (
                  <details>
                    <summary style={{
                      padding: '10px 24px', fontSize: 13, color: 'var(--fg-soft)',
                      cursor: 'pointer', userSelect: 'none',
                    }}>
                      {history.length} versión{history.length !== 1 ? 'es' : ''} anterior{history.length !== 1 ? 'es' : ''}
                    </summary>
                    {history.map(doc => (
                      <div key={doc.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 24px', borderTop: '1px solid var(--rule)',
                      }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, margin: 0, color: 'var(--fg-soft)' }}>{doc.nombre}</p>
                          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '2px 0 0' }}>
                            {fmtDate(doc.created_at)}{fmtSize(doc.size_bytes)}
                          </p>
                        </div>
                        {doc.signedUrl && (
                          <a
                            href={doc.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 12, color: 'var(--accent)',
                              padding: '5px 12px', border: '1px solid var(--rule)',
                              borderRadius: 'var(--r-sm)', textDecoration: 'none',
                            }}
                          >
                            Descargar
                          </a>
                        )}
                      </div>
                    ))}
                  </details>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
