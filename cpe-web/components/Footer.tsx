import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid" style={{ gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1.2fr' }}>
          {/* Brand */}
          <div className="footer-brand">
            <strong>
              <span className="lang-es">Crown Point Energía S.A.</span>
              <span className="lang-en">Crown Point Energy Inc.</span>
            </strong>
            <p className="lang-es">Empresa argentina de petróleo y gas con casa matriz internacional. Operamos en las cuencas Austral (Tierra del Fuego), Neuquina, Cuyana (Mendoza) y Golfo San Jorge (Chubut – Santa Cruz). Holding Crown Point Energy Inc. cotiza en TSXV: CWV.</p>
            <p className="lang-en">Canadian holding company with oil &amp; gas operations in Argentina through Crown Point Energía S.A. We operate in the Austral (Tierra del Fuego), Neuquén, Cuyana (Mendoza) and San Jorge Gulf (Chubut – Santa Cruz) basins. Listed on TSXV: CWV.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <a
                href="https://www.linkedin.com/company/crown-point-energia-sa"
                target="_blank" rel="noreferrer"
                style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center', color: 'rgba(222,224,242,0.6)', transition: 'background .15s' }}
                aria-label="LinkedIn"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a
                href="https://www.sedarplus.ca"
                target="_blank" rel="noreferrer"
                style={{ height: 32, paddingInline: 12, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(222,224,242,0.6)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', transition: 'background .15s', textDecoration: 'none' }}
              >
                SEDAR+
              </a>
              <a
                href="https://www.cnv.gob.ar"
                target="_blank" rel="noreferrer"
                style={{ height: 32, paddingInline: 12, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(222,224,242,0.6)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', transition: 'background .15s', textDecoration: 'none' }}
              >
                CNV
              </a>
            </div>
          </div>

          {/* Inversores */}
          <div className="footer-col">
            <h5><span className="lang-es">Inversores</span><span className="lang-en">Investors</span></h5>
            <ul>
              <li><Link href="/inversores"><span className="lang-es">Resumen IR</span><span className="lang-en">IR overview</span></Link></li>
              <li><Link href="/comunicados"><span className="lang-es">Comunicados</span><span className="lang-en">Press releases</span></Link></li>
              <li><Link href="/inversores#financieros"><span className="lang-es">Estados financieros</span><span className="lang-en">Financial statements</span></Link></li>
              <li><Link href="/inversores#on"><span className="lang-es">Obligaciones negociables</span><span className="lang-en">Notes program</span></Link></li>
              <li><Link href="/inversores#cobertura"><span className="lang-es">Cobertura de analistas</span><span className="lang-en">Analyst coverage</span></Link></li>
              <li><Link href="/inversores#calendario"><span className="lang-es">Calendario financiero</span><span className="lang-en">Financial calendar</span></Link></li>
            </ul>
          </div>

          {/* Operaciones */}
          <div className="footer-col">
            <h5><span className="lang-es">Operaciones</span><span className="lang-en">Operations</span></h5>
            <ul>
              <li><Link href="/operaciones#cerro">Cerro de Los Leones</Link></li>
              <li><Link href="/operaciones#tordillo">El Tordillo · La Tapera</Link></li>
              <li><Link href="/operaciones#tdf">Tierra del Fuego</Link></li>
              <li><Link href="/operaciones#chanares">Chañares Herrados / PPCO</Link></li>
              <li><Link href="/operaciones#piedra">Piedra Clavada – Koluel Kaike</Link></li>
            </ul>
          </div>

          {/* Compañía */}
          <div className="footer-col">
            <h5><span className="lang-es">Compañía</span><span className="lang-en">Company</span></h5>
            <ul>
              <li><Link href="/acerca"><span className="lang-es">Acerca de nosotros</span><span className="lang-en">About us</span></Link></li>
              <li><Link href="/acerca#estrategia"><span className="lang-es">Estrategia</span><span className="lang-en">Strategy</span></Link></li>
              <li><Link href="/acerca#management">Management</Link></li>
              <li><Link href="/carreras"><span className="lang-es">Carreras</span><span className="lang-en">Careers</span></Link></li>
              <li><Link href="/comercial"><span className="lang-es">Comercial</span><span className="lang-en">Commercial</span></Link></li>
              <li><Link href="/contacto"><span className="lang-es">Contacto</span><span className="lang-en">Contact</span></Link></li>
              <li><Link href="/portal"><span className="lang-es">Portal de inversores</span><span className="lang-en">Investor portal</span></Link></li>
            </ul>
          </div>

          {/* Contacto + Línea ética */}
          <div className="footer-col">
            <h5><span className="lang-es">Contacto directo</span><span className="lang-en">Direct contact</span></h5>
            <ul>
              <li>Godoy Cruz 2769, Piso&nbsp;4</li>
              <li>C1425FQK, Buenos Aires</li>
              <li><a href="mailto:ir@crownpointenergy.com">ir@crownpointenergy.com</a></li>
              <li>+54 11-5032-5600</li>
            </ul>
            <div style={{
              marginTop: 20, padding: '14px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--r-md)',
            }}>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cp-green)', marginBottom: 6 }}>
                <span className="lang-es">Línea ética</span>
                <span className="lang-en">Ethics hotline</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.6, margin: '0 0 8px', color: 'rgba(222,224,242,0.55)' }}>
                <span className="lang-es">Canal confidencial para reportar conductas contrarias al Código de Ética.</span>
                <span className="lang-en">Confidential channel to report conduct contrary to the Code of Ethics.</span>
              </p>
              <a href="mailto:etica@crownpointenergy.com" style={{ fontSize: 12, fontWeight: 600, color: 'rgba(222,224,242,0.75)', letterSpacing: '0.02em' }}>
                etica@crownpointenergy.com
              </a>
            </div>
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
          <p style={{ marginTop: 8 }}>
            <strong>TSXV:</strong>{' '}
            <span className="lang-es">Ni la TSX Venture Exchange ni su Proveedor de Servicios de Regulación (conforme a ese término se define en las políticas de TSX Venture Exchange) aceptan responsabilidad por la idoneidad o exactitud de este sitio.</span>
            <span className="lang-en">Neither TSX Venture Exchange nor its Regulation Services Provider accepts responsibility for the adequacy or accuracy of this site.</span>
            {' '}<strong>CNV:</strong>{' '}
            <span className="lang-es">Crown Point Energía S.A. se encuentra inscripta en el Registro de Emisoras de la Comisión Nacional de Valores de la República Argentina.</span>
            <span className="lang-en">Crown Point Energy Inc. (through its subsidiary Crown Point Energía S.A.) is registered as an issuer with the Comisión Nacional de Valores (Argentine Securities Commission).</span>
          </p>
          <p style={{ marginTop: 8 }}>
            <span className="lang-es">Las reservas de petróleo y gas se reportan conforme a los estándares de la Canadian Securities Administrators (CSA) National Instrument 51-101. BOE puede ser un concepto engañoso ya que un barril de petróleo equivalente puede no representar la misma relación de valor que entre petróleo y gas natural.</span>
            <span className="lang-en">Oil and gas reserves are reported in accordance with Canadian Securities Administrators (CSA) National Instrument 51-101 standards. BOE may be a misleading measure as one barrel of oil equivalent may not represent the same value relationship between oil and natural gas.</span>
          </p>
        </div>

        <div className="footer-bottom">
          <span suppressHydrationWarning>© {new Date().getFullYear()} Crown Point Energy Inc.&nbsp;·&nbsp;TSXV: CWV</span>
          <span style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/legal/terminos" style={{ opacity: 0.7 }}>
              <span className="lang-es">Términos y condiciones</span>
              <span className="lang-en">Terms of Use</span>
            </Link>
            <Link href="/legal/privacidad" style={{ opacity: 0.7 }}>
              <span className="lang-es">Privacidad y cookies</span>
              <span className="lang-en">Privacy &amp; Cookies</span>
            </Link>
            <Link href="/legal/avisos" style={{ opacity: 0.7 }}>
              <span className="lang-es">Avisos legales</span>
              <span className="lang-en">Advisories</span>
            </Link>
            <Link href="/legal/terminos#accesibilidad" style={{ opacity: 0.7 }}>
              <span className="lang-es">Accesibilidad</span>
              <span className="lang-en">Accessibility</span>
            </Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
