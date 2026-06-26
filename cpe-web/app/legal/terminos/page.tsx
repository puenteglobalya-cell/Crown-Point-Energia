import Link from 'next/link'

export const metadata = {
  title: 'Términos y condiciones — Crown Point Energy',
}

export default function TerminosPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <span><span className="lang-es">Términos y condiciones</span><span className="lang-en">Terms of use</span></span>
          </div>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es">Términos y condiciones de uso</span>
            <span className="lang-en">Terms of use</span>
          </h1>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="lang-es">
            <h2>Información general</h2>
            <p>Este sitio web es propiedad de Crown Point Energía S.A. (en adelante &quot;la Compañía&quot;). El acceso y uso del sitio implica la aceptación de los presentes términos.</p>

            <h2>Declaraciones prospectivas (forward-looking)</h2>
            <p>Este sitio puede contener declaraciones y estimaciones sobre resultados futuros. Dichas declaraciones implican riesgos e incertidumbres conocidos y desconocidos. Los resultados reales pueden diferir materialmente de los proyectados. La Compañía no asume ninguna obligación de actualizar estas declaraciones públicamente, salvo lo exigido por la legislación aplicable.</p>

            <h2>TSXV</h2>
            <p>Ni la TSX Venture Exchange ni su Proveedor de Servicios de Regulación (conforme a ese término se define en las políticas de TSX Venture Exchange) aceptan responsabilidad por la idoneidad o exactitud del contenido de este sitio.</p>

            <h2>CNV</h2>
            <p>Crown Point Energía S.A. se encuentra inscripta en el Registro de Emisoras de la Comisión Nacional de Valores de la República Argentina. Los documentos e información financiera presentados ante la CNV se encuentran disponibles en el sitio oficial de la CNV.</p>

            <h2>Propiedad intelectual</h2>
            <p>Todos los contenidos de este sitio (textos, imágenes, marcas, logotipos) son propiedad de la Compañía o de terceros que han autorizado su uso. Queda prohibida su reproducción parcial o total sin autorización expresa.</p>

            <h2>Jurisdicción</h2>
            <p>Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia se someterá a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.</p>
          </div>

          <div className="lang-en">
            <h2>General information</h2>
            <p>This website is owned by Crown Point Energy Inc. and operated through its Argentine subsidiary Crown Point Energía S.A. (collectively, the &quot;Company&quot;). Access to and use of the site implies acceptance of these terms.</p>

            <h2>Forward-looking statements</h2>
            <p>This site may contain forward-looking statements and estimates about future results. Such statements involve known and unknown risks and uncertainties. Actual results may differ materially from projections. The Company assumes no obligation to update these statements publicly except as required by applicable law.</p>

            <h2>TSXV</h2>
            <p>Neither TSX Venture Exchange nor its Regulation Services Provider (as that term is defined in the policies of TSX Venture Exchange) accepts responsibility for the adequacy or accuracy of this site.</p>

            <h2>CNV</h2>
            <p>Crown Point Energy Inc.&apos;s Argentine subsidiary, Crown Point Energía S.A., is registered as an issuer with the Argentine National Securities Commission (CNV). Documents and financial information filed with the CNV are available on the CNV&apos;s official website.</p>

            <h2>Intellectual property</h2>
            <p>All content on this site (text, images, trademarks, logos) is owned by the Company or by third parties who have authorized its use. Partial or total reproduction is prohibited without express authorization.</p>

            <h2>Jurisdiction</h2>
            <p>These terms are governed by the laws of the Argentine Republic. Any dispute shall be submitted to the ordinary courts of the City of Buenos Aires.</p>
          </div>
        </div>
      </section>
    </>
  )
}
