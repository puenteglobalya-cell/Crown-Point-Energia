import Link from 'next/link'
import { getCmsState } from '@/lib/cms'
import { cmsLineBreaks } from '@/lib/cms-html'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { CopyLinkButton } from '@/components/CopyLinkButton'

type PoliticaDoc = {
  id: string
  titulo_es: string
  titulo_en: string
  storage_path: string
  file_name: string
}

export const revalidate = 60

export const metadata = {
  title: 'ESG / Políticas | Crown Point Energy',
  description: 'Responsabilidad ambiental, social y de gobierno corporativo de Crown Point Energy, y políticas corporativas públicas.',
  alternates: { canonical: 'https://crownpointenergy.com/esg' },
}

export default async function EsgPage() {
  const db = createSupabaseServerAdminClient()
  const [s, politicasRes] = await Promise.all([
    getCmsState(),
    db.from('documentos')
      .select('id,titulo_es,titulo_en,storage_path,file_name')
      .eq('tipo', 'politica')
      .eq('publico', true)
      .order('titulo_es'),
  ])
  const politicas = (politicasRes.data ?? []) as PoliticaDoc[]
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const f = s.fields
  const fe = s.fieldsEn
  const heroImg = f['hero.esg.img'] || ''
  const ethicsPhone = f['contact.ethics.phone'] || '+54 9 11 5263-0361'
  const ethicsEmail = f['contact.ethics.email'] || 'etica@crownpointenergy.com'

  return (
    <>
      <section
        className={`page-hero${heroImg ? ' has-photo' : ''}`}
        style={heroImg ? { '--hero-photo-url': `url(${heroImg})` } as React.CSSProperties : undefined}
      >
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <span>ESG</span>
          </div>
          <span className="eyebrow">
            <span className="lang-es">Responsabilidad corporativa</span>
            <span className="lang-en">Corporate responsibility</span>
          </span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es" dangerouslySetInnerHTML={{ __html: cmsLineBreaks(f['page.esg.h1'] || 'Operar bien.<br/>Reportar con claridad.') }} />
            <span className="lang-en" dangerouslySetInnerHTML={{ __html: cmsLineBreaks(fe['page.esg.h1'] || 'Operate responsibly.<br/>Report with clarity.') }} />
          </h1>
          <p>
            <span className="lang-es">{f['page.esg.lede'] || 'Nuestra estrategia ESG integra la responsabilidad ambiental, el compromiso social y la gobernanza robusta como pilares de creación de valor a largo plazo.'}</span>
            <span className="lang-en">{fe['page.esg.lede'] || 'Our ESG strategy integrates environmental responsibility, social commitment and robust governance as pillars of long-term value creation.'}</span>
          </p>
        </div>
      </section>

      {/* Gobierno corporativo */}
      <section className="section-tight" style={{ borderTop: '1px solid var(--rule)', background: 'var(--bg-alt)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-12)', alignItems: 'start' }}>

            <div>
              <span className="eyebrow" style={{ display: 'block', marginBottom: 'var(--s-4)' }}>
                <span className="lang-es">Responsabilidad corporativa</span>
                <span className="lang-en">Corporate responsibility</span>
              </span>
              <h2 style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--s-6)' }}>
                <span className="lang-es">Gobierno corporativo</span>
                <span className="lang-en">Corporate governance</span>
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--s-2)' }}>
                {politicas.map(doc => {
                  const href = `${supabaseUrl}/storage/v1/object/public/documents/${doc.storage_path}`
                  return (
                  <li key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--rule)', fontSize: 14 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: 'var(--accent)' }}>
                      <path d="M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                    <a
                      href={href}
                      target="_blank" rel="noreferrer"
                      style={{ color: 'var(--fg)', textDecoration: 'none', flex: 1 }}
                    >
                      <span className="lang-es">{doc.titulo_es}</span>
                      <span className="lang-en">{doc.titulo_en || doc.titulo_es}</span>
                    </a>
                    <CopyLinkButton url={href} />
                    <span style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>PDF</span>
                  </li>
                  )
                })}
                {[
                  { es: 'Política anticorrupción', en: 'Anti-corruption policy', href: '/biblioteca?cat=gobierno-corporativo' },
                  { es: 'Código de conducta y ética empresarial', en: 'Code of conduct & business ethics', href: '/biblioteca?cat=gobierno-corporativo' },
                  { es: 'Política de uso de información privilegiada', en: 'Insider trading policy', href: '/biblioteca?cat=gobierno-corporativo' },
                  { es: 'Política de denuncia de irregularidades', en: 'Whistleblower policy', href: '/biblioteca?cat=gobierno-corporativo' },
                  { es: 'Formulario de denuncias e irregularidades', en: 'Reporting form', href: 'https://docs.google.com/forms/d/e/1FAIpQLSceRgaaMfvPO7ndB2v_5UHpUna9tmV0om4JEDEl5cIqUasQJA/viewform?pli=1', isLink: true, external: true },
                ].map((doc, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--rule)', fontSize: 14 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: 'var(--cp-green)' }}>
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    {doc.external ? (
                      <a href={doc.href} target="_blank" rel="noreferrer" style={{ color: 'var(--fg)', textDecoration: 'none', flex: 1 }}>
                        <span className="lang-es">{doc.es}</span>
                        <span className="lang-en">{doc.en}</span>
                      </a>
                    ) : (
                      <Link href={doc.href} style={{ color: 'var(--fg)', textDecoration: 'none', flex: 1 }}>
                        <span className="lang-es">{doc.es}</span>
                        <span className="lang-en">{doc.en}</span>
                      </Link>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>
                      {doc.isLink ? 'enlace' : 'PDF'}
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 'var(--s-4)', fontStyle: 'italic' }}>
                <span className="lang-es">Los documentos se descargan desde la Biblioteca de inversores.</span>
                <span className="lang-en">Documents are available in the Investor library section.</span>
              </p>
            </div>

            {/* Ethics hotline */}
            <div style={{ background: 'var(--cp-navy-darker)', borderRadius: 'var(--r-xl)', padding: 'var(--s-10)', color: '#fff' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(130,188,0,0.15)', display: 'grid', placeItems: 'center', marginBottom: 'var(--s-5)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--cp-green)' }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 'var(--s-3)' }}>
                <span className="lang-es">Línea ética</span>
                <span className="lang-en">Ethics hotline</span>
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, marginBottom: 'var(--s-6)' }}>
                <span className="lang-es">Canal confidencial para reportar conductas contrarias al Código de Ética. Las denuncias pueden realizarse de forma anónima. Todas son tratadas con absoluta reserva.</span>
                <span className="lang-en">Confidential channel to report conduct contrary to the Code of Ethics. Reports may be submitted anonymously. All are handled with complete confidentiality.</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                <a href={`tel:${ethicsPhone.replace(/\s/g,'')}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontSize: 15, fontWeight: 600 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.8"/></svg>
                  {ethicsPhone}
                </a>
                <a href={`mailto:${ethicsEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--cp-green)', fontSize: 14 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/><path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8"/></svg>
                  {ethicsEmail}
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

    </>
  )
}
