import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <strong>Crown Point Energy</strong>
            <p className="lang-es">Empresa argentina de petróleo y gas con cartera de oportunidades en las cuencas Austral, Neuquina y Cuyana. Listada en TSXV: CWV.</p>
            <p className="lang-en">Argentine oil &amp; gas company with a portfolio across the Austral, Neuquén and Cuyana basins. Listed on TSXV: CWV.</p>
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
        <div className="footer-bottom">
          <span>© 2026 Crown Point Energy Inc.&nbsp;·&nbsp;TSXV: CWV</span>
          <span>
            <a href="#" style={{ opacity: 0.8 }}>Terms of Use</a>
            {' · '}
            <a href="#" style={{ opacity: 0.8 }}>Términos y condiciones</a>
            {' · '}
            <a href="#" style={{ opacity: 0.8 }}>Privacy</a>
          </span>
        </div>
      </div>
    </footer>
  )
}
