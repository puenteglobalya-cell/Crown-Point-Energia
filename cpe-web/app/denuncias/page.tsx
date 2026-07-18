import Link from 'next/link'
import DenunciaForm from './DenunciaForm'

export const metadata = {
  title: 'Línea Ética — Denuncias e Irregularidades | Crown Point Energy',
  description: 'Canal confidencial para reportar conductas contrarias al Código de Ética de Crown Point Energía.',
  robots: { index: false, follow: false },
}

export default function DenunciasPage() {
  return (
    <section className="page-hero" style={{ paddingBottom: 0 }}>
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="crumbs">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <Link href="/esg">ESG</Link>
          <span>/</span>
          <span>Línea Ética</span>
        </div>
        <span className="eyebrow">Cumplimiento</span>
        <h1 style={{ marginTop: 14 }}>Línea Ética — Denuncias e irregularidades</h1>
        <p style={{ maxWidth: '60ch' }}>
          Canal confidencial para reportar conductas contrarias al Código de Ética, políticas de anticorrupción,
          uso de información privilegiada, o cualquier irregularidad. Podés enviarla de forma completamente anónima.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
          margin: '28px 0 36px',
        }}>
          {[
            { title: 'Confidencial', body: 'Solo el equipo de cumplimiento accede a las denuncias.' },
            { title: 'Sin represalias', body: 'Está prohibida cualquier represalia contra quien denuncie de buena fe.' },
            { title: 'Anónimo si querés', body: 'No es obligatorio dejar tu nombre ni contacto.' },
          ].map(item => (
            <div key={item.title} style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: 18, background: 'var(--surface)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{item.body}</div>
            </div>
          ))}
        </div>

        <DenunciaForm />

        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '24px 0 12px', lineHeight: 1.6 }}>
          Si preferís un canal directo, también podés escribir a{' '}
          <a href="mailto:etica@crownpointenergy.com" style={{ color: 'var(--accent)' }}>etica@crownpointenergy.com</a>.
        </p>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 40px', lineHeight: 1.6 }}>
          Si preferís denunciar por fuera de la empresa, la Comisión Nacional de Valores (CNV) tiene su propio canal
          externo para inversores y el público en general:{' '}
          <a href="https://www.cnv.gov.ar/SitioWeb/Denuncias" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
            cnv.gov.ar/SitioWeb/Denuncias
          </a>.
        </p>
      </div>
    </section>
  )
}
