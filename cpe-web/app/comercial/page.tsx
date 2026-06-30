import Link from 'next/link'
import CommercialForm from './CommercialForm'

export const revalidate = 3600

export const metadata = {
  title: 'Comercial | Crown Point Energy',
  description: 'Comercialización de petróleo crudo y gas natural de la producción de Crown Point Energy en el mercado argentino y de exportación.',
  alternates: { canonical: 'https://crownpointenergy.com/comercial' },
}

export default function ComercialPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="breadcrumb">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span><span className="lang-es">Comercial</span><span className="lang-en">Commercial</span></span>
          </nav>
          <span className="eyebrow">
            <span className="lang-es">Comercialización de hidrocarburos</span>
            <span className="lang-en">Hydrocarbon trading</span>
          </span>
          <h1>
            <span className="lang-es">Contacto comercial.</span>
            <span className="lang-en">Commercial enquiries.</span>
          </h1>
          <p className="hero-lede">
            <span className="lang-es">Petróleo crudo tipo Medanito y gas natural desde cuatro cuencas argentinas. Completá el formulario y nuestro equipo de comercialización te contactará.</span>
            <span className="lang-en">Medanito-type crude oil and natural gas from four Argentine basins. Fill in the form and our commercial team will be in touch.</span>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="two-col" style={{ gap: 'var(--s-16)' }}>

            {/* Left — product info */}
            <aside className="left-rail" style={{ position: 'sticky', top: 120 }}>
              <div style={{ marginBottom: 'var(--s-8)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 'var(--s-3)' }}>
                  <span className="lang-es">Lo que ofrecemos</span>
                  <span className="lang-en">What we offer</span>
                </h3>
                <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
                  {[
                    {
                      icon: '🛢',
                      titleEs: 'Petróleo crudo',
                      titleEn: 'Crude oil',
                      descEs: 'Medanito y variantes de Chubut (GSJO). Precio referenciado Brent / Medanito. Origen certificado.',
                      descEn: 'Medanito and Chubut variants (GSJO). Brent / Medanito-referenced price. Certified origin.',
                    },
                    {
                      icon: '🔥',
                      titleEs: 'Gas natural',
                      titleEn: 'Natural gas',
                      descEs: 'Producción en cuenca Neuquina y Austral. Contratos de suministro de corto y mediano plazo.',
                      descEn: 'Production from Neuquén and Austral basins. Short and medium-term supply contracts.',
                    },
                  ].map(p => (
                    <div key={p.titleEs} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: 'var(--s-5)' }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{p.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                        <span className="lang-es">{p.titleEs}</span>
                        <span className="lang-en">{p.titleEn}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.55, margin: 0 }}>
                        <span className="lang-es">{p.descEs}</span>
                        <span className="lang-en">{p.descEn}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 'var(--s-6)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 'var(--s-3)' }}>
                  <span className="lang-es">Contacto directo</span>
                  <span className="lang-en">Direct contact</span>
                </div>
                <a
                  href="mailto:comercial@crownpointenergy.com"
                  style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 500, wordBreak: 'break-all' }}
                >
                  comercial@crownpointenergy.com
                </a>
                <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
                  <span className="lang-es">Respuesta en 2 días hábiles.</span>
                  <span className="lang-en">Response within 2 business days.</span>
                </p>
              </div>
            </aside>

            {/* Right — form */}
            <div>
              <CommercialForm />
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 'var(--s-6)', lineHeight: 1.6 }}>
                <span className="lang-es">
                  La información proporcionada se utiliza exclusivamente para gestionar su consulta comercial conforme a nuestra{' '}
                  <Link href="/legal/privacidad" style={{ color: 'var(--accent)' }}>Política de privacidad</Link>.
                </span>
                <span className="lang-en">
                  Information provided is used solely to process your commercial enquiry in accordance with our{' '}
                  <Link href="/legal/privacidad" style={{ color: 'var(--accent)' }}>Privacy policy</Link>.
                </span>
              </p>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}
