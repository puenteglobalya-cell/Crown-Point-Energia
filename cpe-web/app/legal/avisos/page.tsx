import Link from 'next/link'

export const metadata = {
  title: 'Avisos legales / Advisories — Crown Point Energy',
}

const abbrevs = [
  { abbr: '3D',                     es: 'tres dimensiones',                     en: 'three dimensional' },
  { abbr: 'bbl',                    es: 'barril',                               en: 'barrel' },
  { abbr: 'bbls',                   es: 'barriles',                             en: 'barrels' },
  { abbr: 'bcf',                    es: 'mil millones de pies cúbicos',         en: 'billion cubic feet' },
  { abbr: 'bls/d o bbls/d',        es: 'barriles por día',                     en: 'barrels per day' },
  { abbr: 'BOE',                    es: 'barriles de petróleo equivalente',     en: 'barrels of oil equivalent' },
  { abbr: 'boepd',                  es: 'barriles de petróleo equivalente por día', en: 'barrels of oil equivalent per day' },
  { abbr: 'bopd',                   es: 'barriles de petróleo por día',         en: 'barrels of oil per day' },
  { abbr: 'km',                     es: 'kilómetros',                           en: 'kilometres' },
  { abbr: 'km² o km2',             es: 'kilómetros cuadrados',                 en: 'square kilometres' },
  { abbr: 'm',                      es: 'metros',                               en: 'metres' },
  { abbr: 'm³',                     es: 'metros cúbicos',                       en: 'cubic metres' },
  { abbr: 'm³/d',                   es: 'metros cúbicos por día',               en: 'cubic metres per day' },
  { abbr: 'mcf',                    es: 'mil pies cúbicos',                     en: 'thousand cubic feet' },
  { abbr: 'mcf/d',                  es: 'mil pies cúbicos por día',             en: 'thousand cubic feet per day' },
  { abbr: 'Mm³/d',                  es: 'miles de metros cúbicos por día',      en: 'thousand cubic metres per day' },
  { abbr: 'MMbls / MMbbls / MMbl', es: 'millones de barriles',                 en: 'million barrels' },
  { abbr: 'mmcfgd',                 es: 'millones de pies cúbicos de gas por día', en: 'million cubic feet of gas per day' },
  { abbr: 'NGL / LGN',             es: 'líquidos de gas natural',              en: 'natural gas liquids' },
  { abbr: 'Q1',                     es: 'trimestre finalizado el 31 de marzo',   en: 'three months ended March 31' },
  { abbr: 'Q2',                     es: 'trimestre finalizado el 30 de junio',   en: 'three months ended June 30' },
  { abbr: 'Q3',                     es: 'trimestre finalizado el 30 de septiembre', en: 'three months ended September 30' },
  { abbr: 'Q4',                     es: 'trimestre finalizado el 31 de diciembre',  en: 'three months ended December 31' },
  { abbr: 'TDF',                    es: 'Tierra del Fuego',                     en: 'Tierra del Fuego' },
  { abbr: 'WI',                     es: 'participación de trabajo',             en: 'working interest' },
]

export default function AvisosPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <span><span className="lang-es">Avisos legales</span><span className="lang-en">Advisories</span></span>
          </div>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es">Avisos legales</span>
            <span className="lang-en">Advisories</span>
          </h1>
        </div>
      </section>

      <style>{`
        .legal-body h2 { font-size: 18px; font-weight: 700; margin: 2.4em 0 0.6em; color: var(--fg); }
        .legal-body p  { font-size: 14px; line-height: 1.75; color: var(--fg-soft); margin: 0 0 1em; }
        .abbrev-table  { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 1em; }
        .abbrev-table th { text-align: left; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--fg-muted); font-weight: 600; padding: 8px 12px; border-bottom: 1px solid var(--rule); }
        .abbrev-table td { padding: 7px 12px; border-bottom: 1px solid var(--rule); color: var(--fg-soft); vertical-align: top; }
        .abbrev-table td:first-child { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--fg); white-space: nowrap; }
        .abbrev-table tr:last-child td { border-bottom: none; }
      `}</style>

      <section className="section">
        <div className="container" style={{ maxWidth: 800 }}>

          {/* ── ESPAÑOL ── */}
          <div className="legal-body lang-es">

            <h2>Declaraciones Prospectivas</h2>
            <p>
              Este documento contiene información de carácter prospectivo. Esta información se refiere a eventos futuros y al desempeño futuro de Crown Point Energy Inc. (&quot;Crown Point&quot;, &quot;nosotros&quot; o &quot;la Compañía&quot;). Toda la información y las declaraciones contenidas en este documento que no sean claramente de naturaleza histórica constituyen información prospectiva, y las palabras &quot;puede&quot;, &quot;podrá&quot;, &quot;debería&quot;, &quot;podría&quot;, &quot;esperar&quot;, &quot;planear&quot;, &quot;pretender&quot;, &quot;anticipar&quot;, &quot;creer&quot;, &quot;estimar&quot;, &quot;proponer&quot;, &quot;predecir&quot;, &quot;potencial&quot;, &quot;continuar&quot;, &quot;apuntar&quot;, &quot;presupuestar&quot; o la negación de dichos términos u otra terminología similar, en general están destinadas a identificar información prospectiva. Dicha información representa nuestras proyecciones internas, estimaciones, expectativas, creencias, planes, objetivos, supuestos, intenciones o declaraciones sobre eventos o resultados futuros. Esta información implica riesgos, incertidumbres y otros factores conocidos y desconocidos que pueden hacer que los resultados o eventos reales difieran materialmente de los anticipados en dicha información prospectiva. Además, este documento puede contener información prospectiva atribuida a fuentes de la industria de terceros. Crown Point considera que las expectativas reflejadas en esta información prospectiva son razonables; sin embargo, no se debe depositar una confianza excesiva en esta información prospectiva, ya que no puede garantizarse que los planes, intenciones o expectativas en los que se basan ocurrirán.
            </p>
            <p>
              Este documento contiene declaraciones prospectivas conforme a las leyes de valores aplicables, incluyendo, entre otras: nuestra creencia de que Crown Point cuenta con una cartera de activos con potencial al alza en producción, desarrollo y exploración; nuestra creencia de que las concesiones en Tierra del Fuego tienen potencial al alza en gas; nuestra creencia de que nuestros activos de exploración ofrecen potencial al alza adicional; la posición y disposición de Crown Point para adquirir activos adicionales; y otras declaraciones con respecto a actividades operativas, comerciales y otras actividades esperadas. Tales declaraciones se consideran información prospectiva en la medida en que implican la evaluación, basada en ciertas estimaciones y supuestos, de que los recursos y reservas descritos pueden producirse económicamente en el futuro.
            </p>
            <p>
              Con respecto a la información prospectiva contenida en este documento, Crown Point ha formulado supuestos sobre, entre otras cosas: los precios vigentes de los commodities y los tipos de cambio (incluidos los vigentes en Argentina); los precios futuros de petróleo, gas natural y LGN; las tasas de regalías y leyes impositivas aplicables; las tasas futuras de producción de pozos y los volúmenes de recursos y reservas; el momento de obtención de aprobaciones regulatorias; el desempeño de los pozos existentes; el éxito obtenido en la perforación de nuevos pozos (incluidos pozos exploratorios); la capacidad del operador para operar el campo de manera segura, eficiente y efectiva; la suficiencia de los gastos de capital presupuestados; la consistencia de las leyes y regulaciones relativas a la industria del petróleo y el gas; la expectativa de que los programas de precios e incentivos actuales continuarán vigentes; el impacto del aumento de la competencia, los costos y la disponibilidad de mano de obra y servicios; la estabilidad general del entorno económico y político en el que opera Crown Point; y la capacidad de Crown Point de obtener financiamiento en condiciones aceptables cuando sea necesario.
            </p>
            <p>
              Dado que la información prospectiva aborda eventos y condiciones futuras, por su propia naturaleza conlleva riesgos e incertidumbres inherentes. Los resultados reales podrían diferir materialmente de los actualmente anticipados debido a varios factores y riesgos. Estos riesgos incluyen, sin limitación: riesgos asociados con la exploración, el desarrollo, la explotación, la producción, la comercialización y el transporte de petróleo y gas; riesgos de que los objetivos de exploración actuales resulten en pozos no exitosos; riesgos de que, aunque la perforación exploratoria resulte en pozos exitosos, cualquier producción no sea económica; pérdida de mercados; volatilidad de los precios de los commodities; riesgos ambientales; imposibilidad de obtener equipos de perforación u otros servicios; costos de gasto de capital; disminución inesperada de la producción en pozos; retrasos por conflictos laborales; retrasos por incapacidad de obtener aprobaciones regulatorias; riesgos de expropiación; impacto de las condiciones económicas generales en Canadá, Argentina, los Estados Unidos y en el exterior; cambios en las leyes y regulaciones; aumento de la competencia; falta de disponibilidad de personal calificado; fluctuaciones en los tipos de cambio o las tasas de interés; y volatilidad del mercado de valores. Se advierte a los lectores que la lista anterior no es exhaustiva.
            </p>
            <p>
              Las declaraciones prospectivas contenidas en este documento se realizan a la fecha del mismo y Crown Point no asume ninguna obligación de actualizar públicamente ni de revisar ninguna de las declaraciones prospectivas incluidas, ya sea como resultado de nueva información, eventos futuros o de cualquier otro modo, excepto según lo que pueda requerir la legislación de valores aplicable.
            </p>
            <p>
              La administración de Crown Point ha incluido el resumen anterior de supuestos y riesgos relacionados con la información prospectiva a fin de brindar a los inversores una perspectiva más completa sobre las operaciones futuras de la Compañía. Se advierte a los lectores que esta información puede no ser apropiada para otros fines. Los resultados reales de Crown Point podrían diferir materialmente de los expresados en, o implícitos por, estas declaraciones prospectivas. La información adicional está incluida en los informes archivados en los organismos de regulación canadienses de valores, accesibles a través del sitio web de SEDAR+ (<a href="https://www.sedarplus.ca" target="_blank" rel="noreferrer">www.sedarplus.ca</a>) o el sitio web de Crown Point (<a href="https://www.crownpointenergy.com">www.crownpointenergy.com</a>).
            </p>

            <h2>Barriles de Petróleo Equivalente</h2>
            <p>
              Los barriles de petróleo equivalente (&quot;boe&quot;) pueden ser un concepto engañoso, particularmente si se utilizan en forma aislada. Un factor de conversión de 6 mil pies cúbicos (&quot;Mcf&quot;) por barril (&quot;bbl&quot;) se basa en un método de conversión de equivalencia energética aplicable principalmente en el punto de combustión y no representa una equivalencia de valor en la cabeza del pozo. Además, dado que la relación de valor basada en el precio actual del petróleo crudo en Argentina en comparación con el precio actual del gas natural en Argentina es significativamente diferente a la equivalencia energética de 6:1, utilizar una conversión en base 6:1 puede ser engañoso como indicación de valor.
            </p>

            <h2>Medidas No-NIIF</h2>
            <p>
              Las medidas no-NIIF no tienen ningún significado estandarizado prescrito por las Normas Internacionales de Información Financiera (&quot;NIIF&quot;) y pueden no ser comparables con el cálculo de medidas similares utilizadas por otras entidades. Las medidas no-NIIF no deben considerarse alternativas a las medidas determinadas de acuerdo con las NIIF, ni más significativas que estas, como indicadores del desempeño de Crown Point. Este documento contiene los términos &quot;EBITDA&quot; (calculado como las ganancias antes de intereses, impuestos, depreciación y amortización) y &quot;margen operativo neto&quot; (calculado por unidad como los ingresos de petróleo, gas natural y LGN menos impuesto a la exportación, regalías y costos operativos), que no deben considerarse alternativas a la utilidad neta según lo determinado por las NIIF como indicadores del desempeño. La dirección considera que estas medidas son una herramienta suplementaria útil para evaluar la rentabilidad de la Compañía en relación con los precios de los commodities. Sin embargo, se advierte a los lectores que no deben interpretarse como una alternativa a la utilidad neta determinada conforme a las NIIF. El método de cálculo de la Compañía puede diferir del utilizado por otras compañías.
            </p>

            <h2>Medidas de Petróleo y Gas</h2>
            <p>
              Este documento también contiene otros parámetros y términos de la industria, incluido el &quot;margen operativo neto&quot;, que es una medida no-NIIF. El margen operativo neto se calcula por unidad como los ingresos de petróleo, gas natural y LGN menos impuesto a la exportación, regalías y costos operativos. La dirección considera que esta medida es una herramienta suplementaria útil para evaluar la rentabilidad de Crown Point en relación con los precios de los commodities. Sin embargo, se advierte que no debe interpretarse como una alternativa a la utilidad neta determinada conforme a las NIIF como medida de desempeño. El método de cálculo puede diferir del de otras compañías y, en consecuencia, puede no ser comparable con medidas similares utilizadas por otras compañías.
            </p>
            <p>
              Las estimaciones del valor presente neto de los ingresos netos futuros provenientes de nuestras reservas no representan el valor justo de mercado de nuestras reservas.
            </p>

            <h2>Abreviaciones</h2>
            <p>Las siguientes abreviaciones que pueden utilizarse en este documento tienen los significados que se indican a continuación:</p>
            <table className="abbrev-table">
              <thead>
                <tr>
                  <th>Abreviación</th>
                  <th>Significado</th>
                </tr>
              </thead>
              <tbody>
                {abbrevs.map(a => (
                  <tr key={a.abbr}>
                    <td>{a.abbr}</td>
                    <td>{a.es}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── ENGLISH ── */}
          <div className="legal-body lang-en">

            <h2>Forward-Looking Statements</h2>
            <p>
              This document contains forward-looking information. This information relates to future events and Crown Point Energy Inc.'s (&quot;Crown Point&quot;, &quot;our&quot; or &quot;we&quot;) future performance. All information and statements contained herein that are not clearly historical in nature constitute forward-looking information, and the words &quot;may&quot;, &quot;will&quot;, &quot;should&quot;, &quot;could&quot;, &quot;expect&quot;, &quot;plan&quot;, &quot;intend&quot;, &quot;anticipate&quot;, &quot;believe&quot;, &quot;estimate&quot;, &quot;propose&quot;, &quot;predict&quot;, &quot;potential&quot;, &quot;continue&quot;, &quot;aim&quot;, &quot;budget&quot; or the negative of these terms or other comparable terminology are generally intended to identify forward-looking information. Such information represents our internal projections, estimates, expectations, beliefs, plans, objectives, assumptions, intentions or statements about future events or performance. This information involves known or unknown risks, uncertainties and other factors that may cause actual results or events to differ materially from those anticipated in such forward-looking information. In addition, this document may contain forward-looking information attributed to third party industry sources. Crown Point believes that the expectations reflected in this forward-looking information are reasonable; however, undue reliance should not be placed on this forward-looking information, as there can be no assurance that the plans, intentions or expectations upon which they are based will occur.
            </p>
            <p>
              This document contains forward-looking statements under applicable securities laws, including, but not limited to, the following: our belief that Crown Point has a portfolio of assets with production, development and exploration upside; our belief that the Tierra del Fuego concessions have upside gas potential; our belief that our exploration assets provide additional upside; Crown Point&apos;s position and readiness to acquire additional assets; and other statements herein with respect to intended operational, business and other expected activities. Such statements are deemed to be forward-looking information, as they involve the implied assessment, based on certain estimates and assumptions, that the resources and reserves described can be economically produced in the future.
            </p>
            <p>
              With respect to forward-looking information contained in this document, Crown Point has made assumptions regarding, among other things: prevailing commodity prices and exchange rates (including those prevailing in Argentina); future oil, natural gas and NGL prices; applicable royalty rates and tax laws; future well production rates and resource and reserve volumes; the timing of receipt of regulatory approvals; the performance of existing wells; the success obtained in drilling new wells (including exploration wells); the ability of the operator of the projects in which Crown Point has an interest to operate the field in a safe, efficient and effective manner; the sufficiency of budgeted capital expenditures in carrying out planned activities; assumptions of costs associated with drilling and development plans; consistency of laws and regulation relating to the oil and gas industry; expectation that current pricing and incentive programs will continue to be in force as expected; the impact of increasing competition, the costs and availability of labour and services; the general stability of the economic and political environment in which Crown Point operates; and the ability of Crown Point to obtain financing on acceptable terms when and if needed.
            </p>
            <p>
              Since forward-looking information addresses future events and conditions, by its very nature it involves inherent risks and uncertainties. Actual results could differ materially from those currently anticipated due to a number of factors and risks. These risks include, without limitation: risks associated with oil and gas exploration, development, exploitation, production, marketing and transportation; risks that current exploration targets will result in unsuccessful wells; risks that although exploration drilling may result in successful wells, any production from such wells is uneconomic; loss of markets; volatility of commodity prices; environmental risks; inability to obtain drilling rigs or other services; capital expenditure costs; unexpected decline rates in wells; delays resulting from labour unrest; delays resulting from inability to obtain required regulatory approvals; expropriation risks; the impact of general economic conditions in Canada, Argentina, the United States and overseas; changes in laws and regulations; increased competition; the lack of availability of qualified personnel; fluctuations in foreign exchange or interest rates; and stock market volatility. Readers are cautioned that the foregoing list of factors is not exhaustive.
            </p>
            <p>
              The forward-looking statements contained in this document are made as at the date of this document and Crown Point does not undertake any obligation to update publicly or to revise any of the included forward-looking statements, whether as a result of new information, future events or otherwise, except as may be required by applicable securities laws.
            </p>
            <p>
              Management of Crown Point has included the above summary of assumptions and risks related to forward-looking information included in this document in order to provide investors with a more complete perspective on Crown Point&apos;s future operations. Readers are cautioned that this information may not be appropriate for other purposes. Crown Point&apos;s actual results, performance or achievement could differ materially from those expressed in, or implied by, these forward-looking statements. Additional information on these and other factors that could affect Crown Point&apos;s operations and financial results are included in reports on file with Canadian securities regulatory authorities, which may be accessed through the SEDAR+ website (<a href="https://www.sedarplus.ca" target="_blank" rel="noreferrer">www.sedarplus.ca</a>) or Crown Point&apos;s website (<a href="https://www.crownpointenergy.com">www.crownpointenergy.com</a>).
            </p>

            <h2>Barrels of Oil Equivalent</h2>
            <p>
              Barrels of oil equivalent (&quot;boes&quot;) may be misleading, particularly if used in isolation. A boe conversion ratio of 6 thousand cubic feet (&quot;Mcf&quot;): 1 barrel (&quot;bbl&quot;) is based on an energy equivalency conversion method primarily applicable at the burner tip and does not represent a value equivalency at the wellhead. In addition, given that the value ratio based on the current price of crude oil in Argentina as compared to the current price of natural gas in Argentina is significantly different from the energy equivalency of 6:1, utilizing a conversion on a 6:1 basis may be misleading as an indication of value.
            </p>

            <h2>Non-IFRS Measures</h2>
            <p>
              Non-IFRS measures do not have any standardized meanings prescribed by International Financial Reporting Standards (&quot;IFRS&quot;) and may not be comparable with the calculation of similar measures used by other entities. Non-IFRS measures should not be considered alternatives to, or more meaningful than, measures determined in accordance with IFRS as indicators of Crown Point&apos;s performance. This document contains the terms &quot;EBITDA&quot; (calculated as earnings before interest, tax, depreciation and amortization) and &quot;operating netback&quot; (calculated on a per unit basis as oil, natural gas and natural gas liquids revenues less export tax, royalties and operating costs), which should not be considered alternatives to, or more meaningful than, net income as determined in accordance with IFRS as an indicator of Crown Point&apos;s performance. Management believes these measures are a useful supplemental measure of the Company&apos;s profitability relative to commodity prices. Readers are cautioned, however, that these measures should not be construed as an alternative to other terms such as net income as determined in accordance with IFRS as measures of performance.
            </p>

            <h2>Oil and Gas Measures</h2>
            <p>
              This document also contains other industry benchmarks and terms, including &quot;operating netback&quot; which is a non-IFRS measure. Operating netback is calculated on a per unit basis as oil, natural gas and NGL revenues less export tax, royalties and operating costs. Management believes this measure is a useful supplemental measure of Crown Point&apos;s profitability relative to commodity prices. Readers are cautioned, however, that operating netback should not be construed as an alternative to other terms such as net income as determined in accordance with IFRS as measures of performance. Crown Point&apos;s method of calculating this measure may differ from other companies, and accordingly, may not be comparable to similar measures used by other companies.
            </p>
            <p>
              Estimates of the net present values of the future net revenues from our reserves do not represent the fair market value of our reserves.
            </p>

            <h2>Abbreviations</h2>
            <p>The following abbreviations that may be used in this document have the meanings set forth below:</p>
            <table className="abbrev-table">
              <thead>
                <tr>
                  <th>Abbreviation</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {abbrevs.map(a => (
                  <tr key={a.abbr}>
                    <td>{a.abbr}</td>
                    <td>{a.en}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </section>
    </>
  )
}
