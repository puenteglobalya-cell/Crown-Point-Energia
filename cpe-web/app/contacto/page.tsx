import Link from 'next/link'
import { getCmsState } from '@/lib/cms'
import ContactForm from './ContactForm'
import { UbicacionesMap } from './UbicacionesMap'

export const revalidate = 60

export default async function ContactoPage() {
  const s = await getCmsState()
  const f = s.fields
  const heroImg = f['hero.contacto.img'] || ''

  const irName      = f['contact.ir.name']      || 'María Teresa Zappino'
  const irRole      = f['contact.ir.role']      || 'Responsable de Relaciones con el Mercado'
  const irEmail     = f['contact.ir.email']     || 'ir@crownpointenergy.com'
  const arAddress   = f['contact.ar.address']   || 'Godoy Cruz 2769, Piso 4\nC1425FQK, Buenos Aires'
  const arPhone     = f['contact.ar.phone']     || '+54 11-5032-5600'
  const arEmail     = f['contact.ar.email']     || 'notificaciones@crownpointenergy.com'
  const caAddress   = f['contact.ca.address']   || 'PO Box 1562 Station M.\nCalgary, Alberta T2P 3B9'
  const caPhone     = f['contact.ca.phone']     || '+1 403-232-1150'
  const caEmail     = f['contact.ca.email']     || 'info@crownpointenergy.com'
  const taName      = f['contact.ta.name']      || 'Olympia Trust Company'
  const taAddress   = f['contact.ta.address']   || '4000, 520-3rd Avenue SW\nCalgary, AB T2P 0R3'
  const taPhone     = f['contact.ta.phone']     || '+1 587-774-2340'
  const taUrl       = f['contact.ta.url']       || 'https://www.olympiatrust.com'
  const taUrlLabel  = taUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
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
            <span><span className="lang-es">Contacto</span><span className="lang-en">Contact</span></span>
          </div>
          <span className="eyebrow"><span className="lang-es">Hablemos</span><span className="lang-en">Let&apos;s talk</span></span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es">Estamos para responder.</span>
            <span className="lang-en">We&apos;re here to answer.</span>
          </h1>
          <p>
            <span className="lang-es">Inversores, socios, proveedores o periodistas: te ponemos en contacto con la persona adecuada según tu consulta.</span>
            <span className="lang-en">Investors, partners, suppliers or journalists: we&apos;ll connect you with the right person for your enquiry.</span>
          </p>
        </div>
      </section>

      {/* Offices grid */}
      <section className="section-tight" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="container">
          <div className="offices-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--rule)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            {/* Argentina */}
            <div style={{ background: 'var(--surface)', padding: 'var(--s-8) var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              <span style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--cp-green)' }}>
                <span className="lang-es">Argentina</span>
                <span className="lang-en">Argentina</span>
              </span>
              <div>
                <strong style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  Crown Point Energía S.A.
                </strong>
                {arAddress.split('\n').map((l, i) => (
                  <span key={i} style={{ display: 'block', fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.6 }}>{l}</span>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                <a href={`tel:${arPhone.replace(/\s/g,'')}`} style={{ fontSize: 13, color: 'var(--fg-soft)' }}>{arPhone}</a>
                <a href={`mailto:${arEmail}`} style={{ fontSize: 13, color: 'var(--accent)', wordBreak: 'break-all' }}>{arEmail}</a>
              </div>
            </div>

            {/* Canada */}
            <div style={{ background: 'var(--surface)', padding: 'var(--s-8) var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              <span style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--cp-green)' }}>
                <span className="lang-es">Canadá</span>
                <span className="lang-en">Canada</span>
              </span>
              <div>
                <strong style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  Crown Point Energy Inc.
                </strong>
                {caAddress.split('\n').map((l, i) => (
                  <span key={i} style={{ display: 'block', fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.6 }}>{l}</span>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                <a href={`tel:${caPhone.replace(/\s/g,'')}`} style={{ fontSize: 13, color: 'var(--fg-soft)' }}>{caPhone}</a>
                <a href={`mailto:${caEmail}`} style={{ fontSize: 13, color: 'var(--accent)', wordBreak: 'break-all' }}>{caEmail}</a>
              </div>
            </div>

            {/* Transfer Agent */}
            <div style={{ background: 'var(--surface)', padding: 'var(--s-8) var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              <span style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--cp-green)' }}>
                <span className="lang-es">Agente de transferencia</span>
                <span className="lang-en">Transfer agent</span>
              </span>
              <div>
                <strong style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {taName}
                </strong>
                {taAddress.split('\n').map((l, i) => (
                  <span key={i} style={{ display: 'block', fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.6 }}>{l}</span>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                <a href={`tel:${taPhone.replace(/\s/g,'')}`} style={{ fontSize: 13, color: 'var(--fg-soft)' }}>{taPhone}</a>
                <a href={taUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent)' }}>{taUrlLabel}</a>
              </div>
            </div>

            {/* IR */}
            <div style={{ background: 'var(--surface)', padding: 'var(--s-8) var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              <span style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--cp-green)' }}>
                <span className="lang-es">Relaciones con inversores</span>
                <span className="lang-en">Investor relations</span>
              </span>
              <div>
                <strong style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                  {irName}
                </strong>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--accent-deep)', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 8 }}>
                  <span className="lang-es">{irRole}</span>
                  <span className="lang-en">{f['contact.ir.role_en'] || 'Investor Relations Officer'}</span>
                </span>
                <p style={{ fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.6, margin: 0 }}>
                  <span className="lang-es">TSXV: CWV</span>
                  <span className="lang-en">TSXV: CWV</span>
                </p>
              </div>
              <a href={`mailto:${irEmail}`} style={{ fontSize: 13, color: 'var(--accent)', wordBreak: 'break-all', marginTop: 4 }}>{irEmail}</a>
            </div>
          </div>

          {/* Mobile responsive note */}
          <style>{`
            @media (max-width: 860px) {
              .offices-grid { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 520px) {
              .offices-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </section>

      {/* Locations map */}
      <section className="section-tight">
        <div className="container">
          <UbicacionesMap />
        </div>
      </section>

      {/* Contact form */}
      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <ContactForm />

            <aside className="contact-info-card">
              <h3 style={{ fontSize: 18, marginBottom: 'var(--s-5)', fontFamily: 'var(--font-display)' }}>
                <span className="lang-es">Contacto rápido</span>
                <span className="lang-en">Quick contact</span>
              </h3>

              <div className="info-row">
                <span className="info-key">Investor Relations</span>
                <div className="info-val">
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{irName}</span>
                  <a href={`mailto:${irEmail}`}>{irEmail}</a>
                </div>
              </div>

              <div className="info-row">
                <span className="info-key">
                  <span className="lang-es">Comercialización</span>
                  <span className="lang-en">Trading</span>
                </span>
                <div className="info-val">
                  <a href="mailto:comercial@crownpointenergy.com">comercial@crownpointenergy.com</a>
                </div>
              </div>

              <div className="info-row">
                <span className="info-key">
                  <span className="lang-es">Proveedores</span>
                  <span className="lang-en">Suppliers</span>
                </span>
                <div className="info-val">
                  <a href="mailto:compras@crownpointenergy.com">compras@crownpointenergy.com</a>
                </div>
              </div>

              <div className="info-row">
                <span className="info-key">
                  <span className="lang-es">Recursos Humanos</span>
                  <span className="lang-en">Human Resources</span>
                </span>
                <div className="info-val">
                  <a href="mailto:rrhh@crownpointenergy.com">rrhh@crownpointenergy.com</a>
                </div>
              </div>

              <div className="info-row">
                <span className="info-key">
                  <span className="lang-es">Argentina</span>
                  <span className="lang-en">Argentina</span>
                </span>
                <div className="info-val">
                  {arAddress.split('\n').map((line, i) => (
                    <span key={i}>{line}{i < arAddress.split('\n').length - 1 ? <br/> : null}</span>
                  ))}
                  <br/><span style={{ fontSize: 13, color: 'var(--fg-soft)' }}>{arPhone}</span>
                </div>
              </div>

              <div className="info-row" style={{ borderBottom: 0 }}>
                <span className="info-key">
                  <span className="lang-es">Canadá</span>
                  <span className="lang-en">Canada</span>
                </span>
                <div className="info-val">
                  Crown Point Energy Inc.<br/>
                  <span style={{ fontSize: 13, color: 'var(--fg-soft)' }}>Calgary, AB · {caPhone}</span>
                </div>
              </div>
            </aside>
          </div>
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
                {[
                  { es: 'Política anticorrupción', en: 'Anti-corruption policy', href: '/biblioteca?cat=gobierno-corporativo' },
                  { es: 'Código de conducta y ética empresarial', en: 'Code of conduct & business ethics', href: '/biblioteca?cat=gobierno-corporativo' },
                  { es: 'Política de uso de información privilegiada', en: 'Insider trading policy', href: '/biblioteca?cat=gobierno-corporativo' },
                  { es: 'Política de denuncia de irregularidades', en: 'Whistleblower policy', href: '/biblioteca?cat=gobierno-corporativo' },
                  { es: 'Formulario de denuncias e irregularidades', en: 'Reporting form', href: '/biblioteca?cat=gobierno-corporativo', isLink: true },
                ].map((doc, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--rule)', fontSize: 14 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: 'var(--cp-green)' }}>
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    <Link href={doc.href} style={{ color: 'var(--fg)', textDecoration: 'none', flex: 1 }}>
                      <span className="lang-es">{doc.es}</span>
                      <span className="lang-en">{doc.en}</span>
                    </Link>
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
