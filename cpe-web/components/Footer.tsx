import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <strong>Crown Point Energía S.A.</strong>
            <p className="lang-es">Empresa argentina de petróleo y gas con casa matriz internacional. Operamos en las cuencas Austral (Tierra del Fuego), Neuquina y Cuyana (Mendoza). La empresa holding Crown Point Energy Inc. cotiza en TSXV: CWV.</p>
            <p className="lang-en">Argentine oil &amp; gas company with international headquarters. We operate in the Austral (Tierra del Fuego), Neuquén and Cuyana (Mendoza) basins. Holding company Crown Point Energy Inc. is listed on TSXV: CWV.</p>
          </div>
          <div className="footer-col">
            <h5><span className="lang-es">Inversores</span><span className="lang-en">Investors</span></h5>
            <ul>
              <li><Link href="/inversores"><span className="lang-es">Resumen</span><span className="lang-en">Overview</span></Link></li>
              <li><Link href="/comunicados"><span className="lang-es">Comunicados</span><span className="lang-en">Press releases</span></Link></li>
              <li><Link href="/inversores#financieros"><span className="lang-es">Financieros</span><span className="lang-en">Financials</span></Link></li>
              <li><Link href="/inversores#on"><span className="lang-es">Obligaciones negociables</span><span className="lang-en">Notes</span></Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5><span className="lang-es">Operaciones</span><span className="lang-en">Operations</span></h5>
            <ul>
              <li><Link href="/operaciones#cerro">Cerro de Los Leones</Link></li>
              <li><Link href="/operaciones#tdf">Tierra del Fuego</Link></li>
              <li><Link href="/operaciones#chanares">Chañares Herrados</Link></li>
              <li><Link href="/operaciones#piedra">Piedra Clavada – Koluel Kaike</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5><span className="lang-es">Contacto</span><span className="lang-en">Contact</span></h5>
            <ul>
              <li>Suipacha 1111, Piso&nbsp;18</li>
              <li>C1008AAW, Buenos Aires</li>
              <li>info@crownpointenergy.com</li>
              <li>+54 11 5252-4801</li>
            </ul>
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="footer-legal">
          <p className="lang-es">
            <strong>Información forward-looking:</strong> Este sitio puede contener declaraciones prospectivas en el sentido de la legislación canadiense de valores. Dichas declaraciones implican riesgos e incertidumbres conocidos y desconocidos que podrían provocar que los resultados reales difieran materialmente. Crown Point Energy Inc. no asume ninguna obligación de actualizar declaraciones prospectivas.
          </p>
          <p className="lang-en">
            <strong>Forward-looking information:</strong> This site may contain forward-looking statements within the meaning of applicable Canadian securities legislation. Such statements involve known and unknown risks and uncertainties that could cause actual results to differ materially. Crown Point Energy Inc. does not assume any obligation to update forward-looking statements.
          </p>
          <p className="lang-es" style={{ marginTop: 8 }}>
            <strong>TSXV:</strong> Ni la TSX Venture Exchange ni su Proveedor de Servicios de Regulación (conforme a ese término se define en las políticas de TSX Venture Exchange) aceptan responsabilidad por la idoneidad o exactitud de este sitio.{' '}
            <strong>CNV:</strong> Crown Point Energía S.A. se encuentra inscripta en el Registro de Emisoras de la Comisión Nacional de Valores de la República Argentina.
          </p>
          <p className="lang-en" style={{ marginTop: 8 }}>
            <strong>TSXV:</strong> Neither TSX Venture Exchange nor its Regulation Services Provider accepts responsibility for the adequacy or accuracy of this site.{' '}
            <strong>CNV:</strong> Crown Point Energía S.A. is registered as an issuer with the Comisión Nacional de Valores (Argentine Securities Commission).
          </p>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Crown Point Energy Inc.&nbsp;·&nbsp;TSXV: CWV</span>
          <span>
            <Link href="/legal/terminos" style={{ opacity: 0.8 }}>
              <span className="lang-es">Términos y condiciones</span>
              <span className="lang-en">Terms of Use</span>
            </Link>
            {' · '}
            <Link href="/legal/privacidad" style={{ opacity: 0.8 }}>
              <span className="lang-es">Privacidad y cookies</span>
              <span className="lang-en">Privacy &amp; Cookies</span>
            </Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
