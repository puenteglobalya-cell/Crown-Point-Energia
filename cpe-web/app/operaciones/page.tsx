import Link from 'next/link'
import ArgentinaMapInteractive, { type MapBlockData } from '@/components/ArgentinaMapInteractive'

export const revalidate = 60

const BLOCKS = [
  {
    id: 'ppc', eyebrow: '01 · Cuenca Neuquina Norte',
    title: 'Puesto Pozo Cercado Oriental',
    ledeEs: 'Bloque exploratorio en el norte de la provincia de Mendoza, sobre el flanco norte de la Cuenca Neuquina. Joint venture con foco en prospectos convencionales y oportunidades sobre Vaca Muerta.',
    ledeEn: 'Exploration block in northern Mendoza, on the northern flank of the Neuquén Basin. JV targeting conventional prospects and Vaca Muerta opportunities.',
    cardTitle: { es: 'Bloque exploratorio', en: 'Exploration block' },
    chips: ['50% WI', { es: 'Exploratorio', en: 'Exploration' }],
    bodyEs: ['El bloque cubre aproximadamente 95 km² en el norte de la Cuenca Neuquina. La estructura geológica presenta dos targets principales: prospectos convencionales en formaciones Quintuco y Mulichinco, y oportunidades no convencionales sobre Vaca Muerta.',
      'La adquisición sísmica 3D realizada en 2024 confirmó la presencia de hidrocarburos en tres estructuras. El plan exploratorio 2026–2027 contempla la perforación del primer pozo de evaluación.'],
    bodyEn: ['The block covers approximately 95 km² in the northern Neuquén Basin. Two main targets: conventional prospects in the Quintuco and Mulichinco formations, and Vaca Muerta unconventional opportunities.',
      '3D seismic acquired in 2024 confirmed hydrocarbon presence in three structures. The 2026–2027 exploration plan covers the first evaluation well.'],
    stats: [
      [{ es: 'Participación', en: 'Working interest' }, '50% WI'],
      [{ es: 'Superficie', en: 'Acreage' }, '9,500 ha'],
      [{ es: 'Formaciones objetivo', en: 'Target formations' }, 'Vaca Muerta · Quintuco · Mulichinco'],
      [{ es: 'Producción actual', en: 'Current production' }, '—'],
      [{ es: 'Próximo hito', en: 'Next milestone' }, { es: 'Pozo evaluación · Q4 2026', en: 'Evaluation well · Q4 2026' }],
      [{ es: 'Provincia', en: 'Province' }, 'Mendoza'],
    ]
  },
  {
    id: 'chanares', eyebrow: '02 · Cuenca Cuyana',
    title: 'Chañares Herrados',
    ledeEs: 'Concesión productiva en el centro de Mendoza, con crudo liviano (38° API) e infraestructura propia conectada al oleoducto Allanito–Luján de Cuyo.',
    ledeEn: 'Producing concession in central Mendoza, light crude (38° API) with proprietary infrastructure connected to the Allanito–Luján de Cuyo oil pipeline.',
    cardTitle: { es: 'Crudo liviano premium', en: 'Premium light crude' },
    chips: ['50% WI', { es: 'Operador', en: 'Operator' }, '38° API'],
    bodyEs: ['Crown Point opera el bloque desde 2014 con una participación del 75,8%. El bloque ha mantenido una producción promedio de 380 boe/d con un declino natural anual menor al 8%.',
      'El programa de workover 2026 contempla la intervención de 6 pozos productores y la perforación de 2 pozos infill, con un objetivo de incremento de 180 boe/d.'],
    bodyEn: ['Crown Point has operated the block since 2014 with a 75.8% interest. Average production of 380 boe/d with an annual natural decline below 8%.',
      'The 2026 workover program plans 6 well interventions and 2 infill wells, with a 180 boe/d uplift target.'],
    stats: [
      [{ es: 'Pozos productores', en: 'Producing wells' }, '14'],
      [{ es: 'Producción neta', en: 'Net production' }, '288 boe/d'],
      [{ es: 'Calidad de crudo', en: 'Crude quality' }, '38° API'],
      [{ es: 'Punto de equilibrio', en: 'Breakeven' }, 'US$32/bbl'],
      [{ es: 'Vencimiento', en: 'Expiry' }, '2037'],
    ]
  },
  {
    id: 'cerro', eyebrow: '03 · Cuenca Neuquina',
    title: 'Cerro de Los Leones',
    ledeEs: 'Bloque exploratorio de 101.208 hectáreas en el norte de la Cuenca Neuquina, provincia de Mendoza, con potencial convencional y no convencional.',
    ledeEn: '101,208-hectare exploration block in the northern Neuquén Basin, Mendoza province, with conventional and unconventional potential.',
    cardTitle: { es: 'Estructura del bloque', en: 'Block structure' },
    chips: [{ es: 'Operador 100%', en: '100% operator' }, { es: 'Exploratorio', en: 'Exploration' }],
    bodyEs: ['El área se encuentra en la parte norte del play Vaca Muerta, con prospectos convencionales en formaciones Tordillo, Quintuco y Mulichinco. Los estudios sísmicos 3D adquiridos en 2023 confirmaron presencia de hidrocarburos en cuatro estructuras independientes.',
      'El plan de desarrollo 2026–2027 contempla la perforación de 4 pozos exploratorios y 2 pozos de delineación, con un capex estimado de USD 18M.'],
    bodyEn: ['The area sits in the northern Vaca Muerta play, with conventional prospects in the Tordillo, Quintuco and Mulichinco formations. 3D seismic acquired in 2023 confirmed hydrocarbon presence across four independent structures.',
      'The 2026–2027 development plan covers 4 exploration wells and 2 delineation wells, with estimated capex of USD 18M.'],
    stats: [
      [{ es: 'Superficie', en: 'Acreage' }, '101,208 ha'],
      [{ es: 'Profundidad objetivo', en: 'Target depth' }, '2,800–3,600 m'],
      [{ es: 'Producción actual', en: 'Current production' }, '—'],
      [{ es: 'Próximo hito', en: 'Next milestone' }, 'Pozo CdLL.x-1 · Q3 2026'],
      [{ es: 'Provincia', en: 'Province' }, 'Mendoza'],
    ]
  },
  {
    id: 'tordillo', eyebrow: '04 · Golfo San Jorge · Chubut',
    title: 'El Tordillo · La Tapera · Puesto Quiroga',
    ledeEs: 'Tres concesiones contiguas en el flanco norte de la Cuenca del Golfo San Jorge, provincia de Chubut. El bloque productivo más grande de Crown Point por volumen.',
    ledeEn: 'Three contiguous concessions on the northern flank of the San Jorge Gulf Basin, Chubut province. Crown Point\'s largest producing block by volume.',
    cardTitle: { es: 'Producción consolidada con waterflood', en: 'Consolidated production with waterflood' },
    chips: ['95% WI', { es: 'Operador', en: 'Operator' }, { es: 'Crudo & gas', en: 'Oil & gas' }],
    bodyEs: ['Tres áreas operadas conjuntamente — El Tordillo, La Tapera y Puesto Quiroga — que totalizan 453 km² en la provincia de Chubut. Crown Point mantiene una participación del 22,5% del net working interest.',
      'El bloque produce 4.557 bbl/d de petróleo y 6.843 Mcf/d de gas natural (5.698 boe/d brutos). Cuenta con un programa de recuperación secundaria con 83 pozos inyectores activos.'],
    bodyEn: ['Three jointly-operated areas — El Tordillo, La Tapera and Puesto Quiroga — totaling 453 km² in Chubut province. Crown Point holds a 22.5% net working interest.',
      'The block produces 4,557 bbl/d of oil and 6,843 Mcf/d of natural gas (5,698 boe/d gross) with a secondary recovery program running 83 active injectors.'],
    stats: [
      [{ es: 'Producción petróleo', en: 'Oil production' }, '4,557 Bbl/d'],
      [{ es: 'Producción gas', en: 'Gas production' }, '6,843 Mcf/d'],
      [{ es: 'Pozos activos', en: 'Active wells' }, '269'],
      [{ es: 'Pozos inyectores', en: 'Injector wells' }, '83'],
      [{ es: 'Superficie', en: 'Acreage' }, '113,325 acres · 453 km²'],
      [{ es: 'Vencimiento', en: 'Expiry' }, '14/11/2027 (+ext.)'],
    ]
  },
  {
    id: 'piedra', eyebrow: '05 · Golfo San Jorge · Santa Cruz',
    title: 'Piedra Clavada – Koluel Kaike',
    ledeEs: 'Bloque adquirido en 2024 en la provincia de Santa Cruz, parte del prolífico play Golfo San Jorge, con foco en crudo pesado y oportunidades de EOR.',
    ledeEn: 'Block acquired in 2024 in Santa Cruz province, part of the prolific San Jorge Gulf play, focused on heavy crude and EOR opportunities.',
    cardTitle: { es: 'Activo de crecimiento', en: 'Growth asset' },
    chips: ['100% WI', { es: 'Operador', en: 'Operator' }, { es: 'Crudo pesado', en: 'Heavy crude' }],
    bodyEs: ['La concesión cubre 8.840 hectáreas con 22 pozos productores existentes. El plan de desarrollo 2026 incluye la conversión de 8 pozos a inyección con waterflood y la perforación de 4 pozos nuevos.',
      'El crudo se entrega por camión a la refinería de Caleta Olivia con descuento típico de US$8/bbl sobre Medanito.'],
    bodyEn: ['The 8,840-hectare concession includes 22 existing producing wells. The 2026 development plan adds 8 waterflood injectors plus 4 new producers.',
      'Crude is trucked to the Caleta Olivia refinery with a typical US$8/bbl discount to Medanito.'],
    stats: [
      [{ es: 'Superficie', en: 'Acreage' }, '8,840 ha'],
      [{ es: 'Pozos productores', en: 'Producing wells' }, '22'],
      [{ es: 'Producción neta', en: 'Net production' }, '342 boe/d'],
      [{ es: 'Calidad de crudo', en: 'Crude quality' }, '21° API'],
      [{ es: 'Vencimiento', en: 'Expiry' }, '2049'],
    ]
  },
  {
    id: 'tdf', eyebrow: '06 · Cuenca Austral · Tierra del Fuego',
    title: 'Río Cullen · Las Violetas · La Angostura',
    ledeEs: 'Tres concesiones contiguas — Las Violetas, Río Cullen y La Angostura — con producción estable de gas natural y líquidos asociados desde 1986.',
    ledeEn: 'Three contiguous concessions — Las Violetas, Río Cullen and La Angostura — producing stable natural gas and associated liquids since 1986.',
    cardTitle: { es: 'Operación productiva', en: 'Producing operation' },
    chips: ['48,3275% WI', { es: 'Participación', en: 'Working interest' }],
    bodyEs: ['Las concesiones operan en conjunto con Apco Oil & Gas Argentina. La producción promedio histórica ha sido de 8.500 boe/d brutos, con un 78% gas natural.',
      'Las plantas de tratamiento Cañadón Alfa y Río Chico están conectadas al sistema TGS para entrega de gas, y al oleoducto regional para crudo y condensado.'],
    bodyEn: ['The concessions are operated jointly with Apco Oil & Gas Argentina. Historical average production has been 8,500 boe/d gross, 78% natural gas.',
      'The Cañadón Alfa and Río Chico processing plants are connected to the TGS gas pipeline system and to the regional crude and condensate pipeline.'],
    stats: [
      [{ es: 'Concesiones', en: 'Concessions' }, '3'],
      [{ es: 'Pozos activos', en: 'Active wells' }, '52'],
      [{ es: 'Producción neta', en: 'Net production' }, '1,210 boe/d'],
      [{ es: 'Mix', en: 'Mix' }, '78% gas · 22% líquidos'],
      [{ es: 'Vencimiento', en: 'Expiry' }, '2041'],
    ]
  },
]

const MAP_BLOCKS: MapBlockData[] = [
  { id: 'ppc',      title: 'Puesto Pozo Cercado Oriental', eyebrow: '01 · Cuenca Neuquina Norte', commodity: 'oil',   stats: [['WI', '50%'], [{ es: 'Superficie', en: 'Acreage' }, '9,500 ha'], [{ es: 'Target', en: 'Target' }, 'Vaca Muerta'], [{ es: 'Estado', en: 'Status' }, { es: 'Exploratorio', en: 'Exploration' }]] },
  { id: 'chanares', title: 'Chañares Herrados',            eyebrow: '02 · Cuenca Cuyana',         commodity: 'oil',   stats: [['WI', '75.8%'], [{ es: 'Producción neta', en: 'Net production' }, '288 boe/d'], [{ es: 'Calidad', en: 'Quality' }, '38° API'], [{ es: 'Vencimiento', en: 'Expiry' }, '2037']] },
  { id: 'cerro',    title: 'Cerro de Los Leones',          eyebrow: '03 · Cuenca Neuquina',       commodity: 'oil',   stats: [['WI', '100%'], [{ es: 'Superficie', en: 'Acreage' }, '101,208 ha'], [{ es: 'Estado', en: 'Status' }, { es: 'Exploratorio', en: 'Exploration' }], [{ es: 'Próximo hito', en: 'Next milestone' }, 'CdLL.x-1 · Q3 2026']] },
  { id: 'tordillo', title: 'El Tordillo · La Tapera',      eyebrow: '04 · Golfo San Jorge · Chubut', commodity: 'mixed', stats: [['WI', '22.5%'], [{ es: 'Producción petróleo', en: 'Oil prod.' }, '4,557 Bbl/d'], [{ es: 'Producción gas', en: 'Gas prod.' }, '6,843 Mcf/d'], [{ es: 'Pozos activos', en: 'Active wells' }, '269']] },
  { id: 'piedra',   title: 'Piedra Clavada – Koluel Kaike', eyebrow: '05 · Golfo San Jorge · Santa Cruz', commodity: 'oil',   stats: [['WI', '100%'], [{ es: 'Producción neta', en: 'Net production' }, '342 boe/d'], [{ es: 'Calidad', en: 'Quality' }, '21° API'], [{ es: 'Vencimiento', en: 'Expiry' }, '2049']] },
  { id: 'tdf',      title: 'Río Cullen · Las Violetas',     eyebrow: '06 · Cuenca Austral · Tierra del Fuego', commodity: 'gas',   stats: [['WI', '48.3%'], [{ es: 'Producción neta', en: 'Net production' }, '1,210 boe/d'], [{ es: 'Mix', en: 'Mix' }, '78% gas · 22% líquidos'], [{ es: 'Vencimiento', en: 'Expiry' }, '2041']] },
]

export default function OperacionesPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <span><span className="lang-es">Operaciones</span><span className="lang-en">Operations</span></span>
          </div>
          <span className="eyebrow"><span className="lang-es">Operaciones</span><span className="lang-en">Operations</span></span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es">Seis bloques.<br/>Cuatro cuencas.<br/>Un país.</span>
            <span className="lang-en">Six blocks.<br/>Four basins.<br/>One country.</span>
          </h1>
          <p>
            <span className="lang-es">Una cartera diversificada de áreas productivas y exploratorias, distribuidas estratégicamente entre el norte y el sur de Argentina.</span>
            <span className="lang-en">A diversified portfolio of producing and exploration areas, strategically distributed across northern and southern Argentina.</span>
          </p>
        </div>
      </section>

      <section className="section-tight" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="container">
          <div className="kpi-grid">
            {[
              { labelEs: 'Hectáreas operadas', labelEn: 'Operated acreage', val: '372k', unit: 'ha', metaEs: '6 bloques', metaEn: '6 blocks' },
              { labelEs: 'Pozos productores', labelEn: 'Producing wells', val: '357', unitEs: 'activos', unitEn: 'active', metaEs: '+83 inyectores en operación', metaEn: '+83 injectors in operation' },
              { labelEs: 'Producción promedio', labelEn: 'Average production', val: '3,090', unit: 'boe/d', meta: 'Q1 2026 · neto' },
              { labelEs: 'Mix producción', labelEn: 'Production mix', val: '54/46', unitEs: 'gas / líquidos', unitEn: 'gas / liquids', metaEs: 'Balance gas/oil', metaEn: 'Gas/oil balance' },
            ].map((k, i) => (
              <div className="kpi" key={i}>
                <span className="kpi-label"><span className="lang-es">{k.labelEs}</span><span className="lang-en">{k.labelEn}</span></span>
                <div>
                  <span className="kpi-value num">{k.val}</span>
                  {k.unit && <span className="kpi-unit">{k.unit}</span>}
                  {k.unitEs && <span className="kpi-unit"><span className="lang-es">{k.unitEs}</span><span className="lang-en">{k.unitEn}</span></span>}
                </div>
                <span className="kpi-meta">
                  {k.meta && k.meta}
                  {k.metaEs && <><span className="lang-es">{k.metaEs}</span><span className="lang-en">{k.metaEn}</span></>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="two-col">
            <aside className="left-rail">
              <h4><span className="lang-es">Bloques</span><span className="lang-en">Blocks</span></h4>
              <nav>
                <a href="#mapa" className="active"><span className="lang-es">Mapa general</span><span className="lang-en">Map overview</span></a>
                {BLOCKS.map(b => <a href={`#${b.id}`} key={b.id}>{b.title}</a>)}
              </nav>
            </aside>
            <main>
              <div className="section-block" id="mapa">
                <span className="eyebrow"><span className="lang-es">Mapa de operaciones</span><span className="lang-en">Operations map</span></span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Dónde operamos.</span><span className="lang-en">Where we operate.</span></h2>
                <p className="lede">
                  <span className="lang-es">Nuestros seis bloques se distribuyen entre Mendoza, Chubut, Santa Cruz y Tierra del Fuego, en cuatro cuencas históricamente productoras.</span>
                  <span className="lang-en">Our six blocks span Mendoza, Chubut, Santa Cruz and Tierra del Fuego across four historically producing basins.</span>
                </p>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: 'var(--s-6) var(--s-4)', marginTop: 'var(--s-6)', overflow: 'hidden' }}>
                  <ArgentinaMapInteractive blocks={MAP_BLOCKS} style={{ maxHeight: 760, margin: '0 auto' }} />
                </div>
              </div>

              {BLOCKS.map(b => (
                <div className="section-block" id={b.id} key={b.id}>
                  <span className="eyebrow">{b.eyebrow}</span>
                  <h2 style={{ marginTop: 8 }}>{b.title}</h2>
                  <p className="lede">
                    <span className="lang-es">{b.ledeEs}</span>
                    <span className="lang-en">{b.ledeEn}</span>
                  </p>
                  <div className="block-card">
                    <header className="block-card-hd">
                      <h3><span className="lang-es">{b.cardTitle.es}</span><span className="lang-en">{b.cardTitle.en}</span></h3>
                      <div className="chips">
                        {b.chips.map((c, ci) => (
                          <span className="chip" key={ci}>
                            {typeof c === 'string' ? c : <><span className="lang-es">{c.es}</span><span className="lang-en">{c.en}</span></>}
                          </span>
                        ))}
                      </div>
                    </header>
                    <div className="block-card-body">
                      <div>
                        {b.bodyEs.map((p, pi) => (
                          <p key={pi}>
                            <span className="lang-es">{p}</span>
                            <span className="lang-en">{b.bodyEn[pi]}</span>
                          </p>
                        ))}
                      </div>
                      <div className="block-stats">
                        {b.stats.map(([label, val], si) => (
                          <div key={si}>
                            <span>
                              {typeof label === 'string' ? label : <><span className="lang-es">{label.es}</span><span className="lang-en">{label.en}</span></>}
                            </span>
                            <span>
                              {typeof val === 'string' ? val : <><span className="lang-es">{val.es}</span><span className="lang-en">{val.en}</span></>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </main>
          </div>
        </div>
      </section>
    </>
  )
}
