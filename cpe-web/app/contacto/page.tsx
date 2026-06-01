import Link from 'next/link'
import { getCmsState } from '@/lib/cms'
import ContactForm from './ContactForm'

export const revalidate = 60

export default async function ContactoPage() {
  const s = await getCmsState()
  const f = s.fields
  const heroImg = f['hero.contacto.img'] || ''

  const irEmail      = f['contact.ir.email']      || 'ir@crownpointenergy.com'
  const irPerson     = f['contact.ir.person']      || 'Eugenia Martínez · IR Officer'
  const prensaEmail  = f['contact.prensa.email']   || 'prensa@crownpointenergy.com'
  const comprasEmail = f['contact.compras.email']  || 'compras@crownpointenergy.com'
  const baAddress    = f['contact.ba.address']     || 'Suipacha 1111, Piso 18\nC1008AAW, Buenos Aires'
  const baPhone      = f['contact.ba.phone']       || '+54 11 5252-4801'

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

      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <ContactForm />

            <aside className="contact-info-card">
              <h3 style={{ fontSize: 20, marginBottom: 'var(--s-4)', fontFamily: 'var(--font-display)' }}>
                <span className="lang-es">Contactos directos</span><span className="lang-en">Direct contacts</span>
              </h3>

              <div className="info-row">
                <span className="info-key">Investor Relations</span>
                <div className="info-val">
                  <a href={`mailto:${irEmail}`}>{irEmail}</a>
                  <br/><span style={{ fontSize: 13, color: 'var(--fg-soft)' }}>{irPerson}</span>
                </div>
              </div>

              <div className="info-row">
                <span className="info-key">
                  <span className="lang-es">Prensa &amp; medios</span>
                  <span className="lang-en">Press &amp; media</span>
                </span>
                <div className="info-val">
                  <a href={`mailto:${prensaEmail}`}>{prensaEmail}</a>
                </div>
              </div>

              <div className="info-row">
                <span className="info-key">
                  <span className="lang-es">Proveedores</span>
                  <span className="lang-en">Suppliers</span>
                </span>
                <div className="info-val">
                  <a href={`mailto:${comprasEmail}`}>{comprasEmail}</a>
                </div>
              </div>

              <div className="info-row">
                <span className="info-key">
                  <span className="lang-es">Oficinas Buenos Aires</span>
                  <span className="lang-en">Buenos Aires office</span>
                </span>
                <div className="info-val">
                  {baAddress.split('\n').map((line, i) => (
                    <span key={i}>{line}{i < baAddress.split('\n').length - 1 ? <br/> : null}</span>
                  ))}
                  <br/><span style={{ fontSize: 13, color: 'var(--fg-soft)' }}>{baPhone}</span>
                </div>
              </div>

              <div className="info-row">
                <span className="info-key">
                  <span className="lang-es">Sede internacional</span>
                  <span className="lang-en">International HQ</span>
                </span>
                <div className="info-val">
                  Calgary, Alberta · Canada<br/>
                  <span style={{ fontSize: 13, color: 'var(--fg-soft)' }}>Crown Point Energy Inc.</span>
                </div>
              </div>

              <div className="info-row" style={{ borderBottom: 0 }}>
                <span className="info-key">
                  <span className="lang-es">Horario</span>
                  <span className="lang-en">Hours</span>
                </span>
                <div className="info-val">
                  <span style={{ fontSize: 14, color: 'var(--fg-soft)' }}>
                    Lun–Vie · 9:00–18:00 (ART · UTC−3)
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}
