import Link from 'next/link'

export const metadata = {
  title: 'Política de privacidad y cookies — Crown Point Energy',
}

export default function PrivacidadPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <span><span className="lang-es">Privacidad y cookies</span><span className="lang-en">Privacy &amp; Cookies</span></span>
          </div>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es">Política de privacidad y cookies</span>
            <span className="lang-en">Privacy policy &amp; cookies</span>
          </h1>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="lang-es">
            <h2>Datos personales</h2>
            <p>Crown Point Energía S.A. recopila únicamente los datos personales que usted provee voluntariamente a través del formulario de contacto (nombre, email, mensaje). Estos datos se usan exclusivamente para responder su consulta y no se comparten con terceros sin su consentimiento.</p>

            <h2>Cookies</h2>
            <p>Este sitio utiliza cookies propias para recordar sus preferencias de idioma y aceptación de cookies, y cookies de análisis (Google Analytics) para medir el uso del sitio de forma anónima. No utilizamos cookies publicitarias ni de seguimiento con fines comerciales.</p>
            <p>Puede desactivar las cookies de análisis configurando su navegador. Las cookies funcionales son necesarias para el correcto funcionamiento del sitio.</p>

            <h2>Retención de datos</h2>
            <p>Los datos del formulario de contacto se conservan por un máximo de 24 meses. Puede solicitar su rectificación o eliminación escribiendo a <a href="mailto:info@crownpointenergy.com">info@crownpointenergy.com</a>.</p>

            <h2>Ley aplicable</h2>
            <p>Esta política se rige por la Ley 25.326 de Protección de Datos Personales de la República Argentina y sus normas reglamentarias.</p>
          </div>

          <div className="lang-en">
            <h2>Personal data</h2>
            <p>Crown Point Energía S.A. only collects personal data that you voluntarily provide through the contact form (name, email, message). This data is used exclusively to respond to your inquiry and is not shared with third parties without your consent.</p>

            <h2>Cookies</h2>
            <p>This site uses first-party cookies to remember language preferences and cookie acceptance, and analytics cookies (Google Analytics) to measure site usage anonymously. We do not use advertising or commercial tracking cookies.</p>
            <p>You can disable analytics cookies in your browser settings. Functional cookies are necessary for the site to work correctly.</p>

            <h2>Data retention</h2>
            <p>Contact form data is kept for a maximum of 24 months. You may request rectification or deletion by writing to <a href="mailto:info@crownpointenergy.com">info@crownpointenergy.com</a>.</p>

            <h2>Applicable law</h2>
            <p>This policy is governed by Argentine Personal Data Protection Law 25,326 and its regulatory rules.</p>
          </div>
        </div>
      </section>
    </>
  )
}
