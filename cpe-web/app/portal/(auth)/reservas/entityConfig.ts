export type Row = Record<string, unknown>
export type Data = Record<string, Row[]>

export type FieldConfig = {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox'
  step?: string
  min?: number
  max?: number
  defaultValue?: string | number | boolean
  required?: boolean
  optionsFrom?: keyof Data // otra tabla — usa id como value, nombre como label
  staticOptions?: { value: string; label: string }[]
  // El valor se guarda siempre en la unidad canónica (factor 1). Las demás
  // opciones se multiplican por su factor al guardar, para poder tipear en
  // otra unidad sin cambiar la columna de la base.
  unitToggle?: { defaultUnit: string; options: { value: string; label: string; factor: number }[] }
}

export type EntityConfig = {
  tabla: string
  title: string
  helpText?: string
  fields: FieldConfig[]
  // Cómo mostrar una fila ya cargada en la lista compacta
  displayCols: (row: Row, data: Data) => { label: string; value: string }[]
}

const nombreDe = (data: Data, tabla: string, id: unknown) =>
  String(data[tabla]?.find(r => r.id === id)?.nombre ?? id ?? '—')

// Factor de certeza vigente más reciente para una categoría (P1/P2/P3)
const factorCertezaDe = (data: Data, categoria: string): number => {
  const rows = (data.parametros_certeza_reservas ?? [])
    .filter(r => r.categoria === categoria)
    .sort((a, b) => String(b.fecha_desde).localeCompare(String(a.fecha_desde)))
  return rows[0] ? Number(rows[0].factor) : 1
}

export const ENTITIES: EntityConfig[] = [
  {
    tabla: 'provincias',
    title: '1. Provincia',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'alicuota_iibb', label: 'Alícuota IIBB (ej. 0.03 = 3%)', type: 'number', step: '0.0001', defaultValue: 0.03 },
    ],
    displayCols: r => [{ label: 'Nombre', value: String(r.nombre) }, { label: 'IIBB', value: String(r.alicuota_iibb) }],
  },
  {
    tabla: 'yacimientos',
    title: '2. Yacimiento',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'provincia_id', label: 'Provincia', type: 'select', optionsFrom: 'provincias', required: true },
      { name: 'tipo_recuperacion', label: 'Tipo de recuperación', type: 'select', staticOptions: [{ value: 'primaria', label: 'Primaria' }, { value: 'secundaria', label: 'Secundaria' }] },
    ],
    displayCols: (r, d) => [{ label: 'Nombre', value: String(r.nombre) }, { label: 'Provincia', value: nombreDe(d, 'provincias', r.provincia_id) }],
  },
  {
    tabla: 'concesiones',
    title: '3. Concesión',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'yacimiento_id', label: 'Yacimiento', type: 'select', optionsFrom: 'yacimientos', required: true },
      { name: 'fecha_inicio', label: 'Fecha inicio', type: 'date', required: true },
      { name: 'fecha_vencimiento', label: 'Fecha vencimiento', type: 'date', required: true },
    ],
    displayCols: (r, d) => [{ label: 'Nombre', value: String(r.nombre) }, { label: 'Yacimiento', value: nombreDe(d, 'yacimientos', r.yacimiento_id) }, { label: 'Vence', value: String(r.fecha_vencimiento) }],
  },
  {
    tabla: 'concesion_participacion',
    title: '4. Participación en la concesión',
    helpText: 'Dejá "Hasta" vacío si este porcentaje sigue vigente. Poné una fecha si en algún momento cambia a otro porcentaje (farm-out, reversión, etc.) — cargá ese siguiente tramo como un registro nuevo con su propio "Desde".',
    fields: [
      { name: 'concesion_id', label: 'Concesión', type: 'select', optionsFrom: 'concesiones', required: true },
      { name: 'fecha_desde', label: 'Desde', type: 'date', required: true },
      { name: 'fecha_hasta', label: 'Hasta (vacío = vigente)', type: 'date' },
      { name: 'porcentaje', label: '% participación (0 a 1)', type: 'number', step: '0.0001', min: 0, max: 1, required: true },
      { name: 'motivo', label: 'Motivo', type: 'text' },
    ],
    displayCols: (r, d) => [
      { label: 'Concesión', value: nombreDe(d, 'concesiones', r.concesion_id) },
      { label: 'Desde', value: String(r.fecha_desde) },
      { label: 'Hasta', value: r.fecha_hasta ? String(r.fecha_hasta) : 'vigente' },
      { label: '%', value: String(r.porcentaje) },
    ],
  },
  {
    tabla: 'pozos',
    title: '5. Pozo',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'concesion_id', label: 'Concesión', type: 'select', optionsFrom: 'concesiones', required: true },
      { name: 'tipo', label: 'Tipo', type: 'select', staticOptions: [
        { value: 'productor_petroleo', label: 'Productor petróleo' },
        { value: 'productor_gas', label: 'Productor gas' },
        { value: 'inyector_agua', label: 'Inyector agua' },
      ] },
      { name: 'fecha_alta', label: 'Fecha de alta', type: 'date', required: true },
      { name: 'costo_abandono_usd', label: 'Costo de abandono y remediación (USD) — se imputa al cerrar el pozo', type: 'number', step: '0.01', min: 0 },
    ],
    displayCols: (r, d) => [{ label: 'Nombre', value: String(r.nombre) }, { label: 'Concesión', value: nombreDe(d, 'concesiones', r.concesion_id) }, { label: 'Alta', value: String(r.fecha_alta) }],
  },
  {
    tabla: 'pozos_tipo',
    title: '6. Pozo tipo (curva compartida entre varios pozos)',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'yacimiento_id', label: 'Yacimiento', type: 'select', optionsFrom: 'yacimientos', required: true },
      { name: 'categoria', label: 'Categoría', type: 'select', staticOptions: [
        { value: 'basico', label: 'Básico' }, { value: 'drilling', label: 'Drilling' },
        { value: 'workover', label: 'Workover' }, { value: 'pulling', label: 'Pulling' },
      ] },
    ],
    displayCols: (r, d) => [{ label: 'Nombre', value: String(r.nombre) }, { label: 'Categoría', value: String(r.categoria) }, { label: 'Yacimiento', value: nombreDe(d, 'yacimientos', r.yacimiento_id) }],
  },
  {
    tabla: 'curvas_produccion',
    title: '7. Curva de producción (fila mensual)',
    helpText: 'Elegí pozo O pozo tipo, no ambos. mes_offset = 0 es el primer mes de la curva.',
    fields: [
      { name: 'pozo_id', label: 'Pozo (opcional)', type: 'select', optionsFrom: 'pozos' },
      { name: 'pozo_tipo_id', label: 'Pozo tipo (opcional)', type: 'select', optionsFrom: 'pozos_tipo' },
      { name: 'mes_offset', label: 'Mes offset', type: 'number', min: 0, required: true },
      { name: 'bbl_petroleo', label: 'bbl petróleo/mes', type: 'number', step: '0.001' },
      { name: 'mcf_gas', label: 'mcf gas/mes', type: 'number', step: '0.001' },
    ],
    displayCols: (r, d) => [
      { label: 'Pozo/tipo', value: r.pozo_id != null ? nombreDe(d, 'pozos', r.pozo_id) : nombreDe(d, 'pozos_tipo', r.pozo_tipo_id) },
      { label: 'Mes', value: String(r.mes_offset) }, { label: 'bbl', value: String(r.bbl_petroleo) }, { label: 'mcf', value: String(r.mcf_gas) },
    ],
  },
  {
    tabla: 'regalias',
    title: '8. Regalías',
    fields: [
      { name: 'concesion_id', label: 'Concesión', type: 'select', optionsFrom: 'concesiones', required: true },
      { name: 'fecha_desde', label: 'Vigente desde', type: 'date', required: true },
      { name: 'porcentaje', label: '% regalía (ej. 0.12)', type: 'number', step: '0.0001', required: true },
    ],
    displayCols: (r, d) => [{ label: 'Concesión', value: nombreDe(d, 'concesiones', r.concesion_id) }, { label: 'Desde', value: String(r.fecha_desde) }, { label: '%', value: String(r.porcentaje) }],
  },
  {
    tabla: 'opex_fijo',
    title: '9. OPEX fijo (por concesión, mensual)',
    fields: [
      { name: 'concesion_id', label: 'Concesión', type: 'select', optionsFrom: 'concesiones', required: true },
      { name: 'fecha_desde', label: 'Vigente desde', type: 'date', required: true },
      { name: 'monto_usd_mes', label: 'USD/mes', type: 'number', step: '0.01', required: true },
      { name: 'concepto', label: 'Concepto', type: 'text' },
    ],
    displayCols: (r, d) => [{ label: 'Concesión', value: nombreDe(d, 'concesiones', r.concesion_id) }, { label: 'USD/mes', value: String(r.monto_usd_mes) }, { label: 'Concepto', value: String(r.concepto ?? '—') }],
  },
  {
    tabla: 'opex_variable',
    title: '10. OPEX variable (por yacimiento)',
    helpText: 'Se guarda siempre en USD/BOE — si tenés el costo en USD/m3, elegí esa unidad al lado del monto y se convierte solo (1 m3 = 6.2898 bbl).',
    fields: [
      { name: 'yacimiento_id', label: 'Yacimiento', type: 'select', optionsFrom: 'yacimientos', required: true },
      { name: 'fecha_desde', label: 'Vigente desde', type: 'date', required: true },
      {
        name: 'usd_por_boe', label: 'Costo variable', type: 'number', step: '0.0001', required: true,
        unitToggle: {
          defaultUnit: 'boe',
          options: [
            { value: 'boe', label: 'USD/BOE', factor: 1 },
            { value: 'm3', label: 'USD/m3', factor: 1 / 6.2898 },
          ],
        },
      },
    ],
    displayCols: (r, d) => [{ label: 'Yacimiento', value: nombreDe(d, 'yacimientos', r.yacimiento_id) }, { label: 'USD/BOE', value: String(r.usd_por_boe) }],
  },
  {
    tabla: 'opex_fijo_pozo',
    title: '10b. OPEX fijo por pozo (por concesión, USD/mes por pozo activo)',
    helpText: 'A diferencia de "OPEX fijo" (por concesión), este monto se aplica una vez por cada pozo activo ese mes.',
    fields: [
      { name: 'concesion_id', label: 'Concesión', type: 'select', optionsFrom: 'concesiones', required: true },
      { name: 'fecha_desde', label: 'Vigente desde', type: 'date', required: true },
      { name: 'usd_mes_pozo', label: 'USD/mes por pozo', type: 'number', step: '0.01', required: true },
      { name: 'concepto', label: 'Concepto', type: 'text' },
    ],
    displayCols: (r, d) => [{ label: 'Concesión', value: nombreDe(d, 'concesiones', r.concesion_id) }, { label: 'USD/mes/pozo', value: String(r.usd_mes_pozo) }, { label: 'Concepto', value: String(r.concepto ?? '—') }],
  },
  {
    tabla: 'formulas_precio',
    title: '11. Fórmula de precio',
    helpText: 'precio = (referencia + descuento fijo) × (1 − DDE%) / divisor + extra − tarifa de almacenamiento (USD/m3/día × días, convertido a USD/bbl). El DDE% NO se tipea mes a mes: se calcula solo con el tramo por Brent (65→0%, 80→8%, lineal entre medio — ya viene precargado). "Aplicar DDE%" lo desactiva sin borrar el tramo, para un período en que no corresponda. El divisor suele ser 1 − alícuota IIBB (ej. 0.97 si IIBB es 3%).',
    fields: [
      { name: 'yacimiento_id', label: 'Yacimiento', type: 'select', optionsFrom: 'yacimientos', required: true },
      { name: 'producto', label: 'Producto', type: 'select', staticOptions: [{ value: 'petroleo', label: 'Petróleo' }, { value: 'gas', label: 'Gas' }] },
      { name: 'fecha_desde', label: 'Vigente desde', type: 'date', required: true },
      { name: 'referencia', label: 'Referencia (brent, wti…)', type: 'text', defaultValue: 'brent' },
      { name: 'descuento_fijo_usd', label: 'Descuento fijo USD (se suma ANTES del DDE%, normalmente negativo, ej. -3)', type: 'number', step: '0.01' },
      { name: 'aplicar_dde', label: 'Aplicar el descuento DDE% (destildar para no aplicarlo este período)', type: 'checkbox', defaultValue: true },
      { name: 'dde_brent_min', label: 'Tramo DDE%: Brent mínimo', type: 'number', step: '0.01', defaultValue: 65 },
      { name: 'dde_pct_min', label: 'Tramo DDE%: % en el mínimo', type: 'number', step: '0.01', defaultValue: 0 },
      { name: 'dde_brent_max', label: 'Tramo DDE%: Brent máximo', type: 'number', step: '0.01', defaultValue: 80 },
      { name: 'dde_pct_max', label: 'Tramo DDE%: % en el máximo', type: 'number', step: '0.01', defaultValue: 8 },
      { name: 'dde_pct', label: 'DDE % fijo (avanzado — sólo si NO querés el tramo por Brent de arriba)', type: 'number', step: '0.01' },
      { name: 'divisor', label: 'Divisor (ej. 0.97)', type: 'number', step: '0.0001', defaultValue: 1 },
      { name: 'descuento_adicional_usd', label: 'Extra USD (se suma DESPUÉS de dividir)', type: 'number', step: '0.01' },
      { name: 'tarifa_almacenamiento_usd_m3_dia', label: 'Tarifa de almacenamiento (USD/m3/día)', type: 'number', step: '0.000001' },
      { name: 'dias_almacenamiento', label: 'Días de almacenamiento', type: 'number', step: '0.01' },
      { name: 'factor_m3_a_bbl', label: 'Factor conversión m3→bbl', type: 'number', step: '0.000001', defaultValue: 6.2898 },
    ],
    displayCols: (r, d) => [{ label: 'Yacimiento', value: nombreDe(d, 'yacimientos', r.yacimiento_id) }, { label: 'Producto', value: String(r.producto) }, { label: 'Ref', value: String(r.referencia) }],
  },
  {
    tabla: 'price_decks',
    title: '11a. Curva de precios (price deck)',
    helpText: 'Evita cargar 240 cotizaciones a mano por referencia. Un deck son unos pocos puntos anuales más una escalación para los años siguientes: entre puntos se interpola. Un escenario apunta a un deck y cambiarlo recalcula todo. Para NI 51-101, que pide precios de pronóstico Y constantes, se arman dos decks y se corre el mismo escenario contra cada uno (un deck constante es uno con escalación 0).',
    fields: [
      { name: 'nombre', label: 'Nombre (ej. "Pronóstico Sproule 2026")', type: 'text', required: true },
      { name: 'tipo', label: 'Tipo', type: 'select', staticOptions: [
        { value: 'pronostico', label: 'Pronóstico' }, { value: 'constante', label: 'Constante' },
        { value: 'strip', label: 'Strip de mercado' }, { value: 'sensibilidad', label: 'Sensibilidad (Bull/Bear)' },
      ] },
      { name: 'escalacion_anual', label: 'Escalación anual después del último punto (0.02 = 2%)', type: 'number', step: '0.0001', defaultValue: 0 },
      { name: 'descripcion', label: 'Descripción', type: 'text' },
      { name: 'notas', label: 'Notas', type: 'text' },
    ],
    displayCols: r => [
      { label: 'Nombre', value: String(r.nombre) }, { label: 'Tipo', value: String(r.tipo) },
      { label: 'Escalación', value: `${(Number(r.escalacion_anual) * 100).toFixed(2)}%` },
    ],
  },
  {
    tabla: 'price_deck_puntos',
    title: '11b. Punto de la curva de precios',
    helpText: 'Un punto por referencia y por año (o por mes, si completás "Mes" — útil para una corrida real de futuros con un contrato por mes en el corto plazo, ej. ICE Brent). Entre puntos cargados se interpola linealmente; después del último se aplica la escalación del deck. La referencia tiene que coincidir con la que usa la fórmula de precio (ej. "brent").',
    fields: [
      { name: 'price_deck_id', label: 'Curva de precios', type: 'select', optionsFrom: 'price_decks', required: true },
      { name: 'referencia', label: 'Referencia (ej. brent)', type: 'text', required: true },
      { name: 'anio', label: 'Año', type: 'number', required: true },
      { name: 'mes', label: 'Mes (1-12, vacío = punto anual)', type: 'number', min: 1, max: 12 },
      { name: 'precio_usd', label: 'Precio USD', type: 'number', step: '0.0001', required: true },
    ],
    displayCols: (r, d) => [
      { label: 'Deck', value: nombreDe(d, 'price_decks', r.price_deck_id) },
      { label: 'Ref.', value: String(r.referencia) },
      { label: 'Año', value: String(r.anio) },
      { label: 'USD', value: String(r.precio_usd) },
    ],
  },
  {
    tabla: 'precios_referencia',
    title: '12. Cotización mensual a mano (camino viejo — usar la Curva de precios)',
    helpText: 'Camino viejo, cotización a mano mes por mes. Un escenario con price deck asignado (11a) ignora esta tabla por completo. Se mantiene solo por compatibilidad con escenarios existentes que todavía no migraron a un deck.',
    fields: [
      { name: 'referencia', label: 'Referencia', type: 'text', defaultValue: 'brent', required: true },
      { name: 'fecha', label: 'Mes', type: 'date', required: true },
      { name: 'precio_usd', label: 'Precio USD', type: 'number', step: '0.0001', required: true },
    ],
    displayCols: r => [{ label: 'Ref', value: String(r.referencia) }, { label: 'Fecha', value: String(r.fecha) }, { label: 'USD', value: String(r.precio_usd) }],
  },
  {
    tabla: 'proyectos',
    title: '12a. Proyecto',
    helpText: 'Nivel por encima del escenario. El consolidado de la empresa es la suma de los proyectos incluidos. Cada proyecto agrupa sus escenarios; el marcado como base es el que entra al consolidado.',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'tipo', label: 'Tipo', type: 'select', staticOptions: [
        { value: 'organico', label: 'Orgánico (desarrollo sobre activos propios)' },
        { value: 'adquisicion', label: 'Adquisición (compra de área)' },
        { value: 'farm_in', label: 'Farm-in' },
        { value: 'exploratorio', label: 'Exploratorio' },
      ] },
      { name: 'descripcion', label: 'Descripción', type: 'text' },
      { name: 'fecha_evaluacion', label: 'Fecha de evaluación', type: 'date' },
      { name: 'incluir_en_consolidado', label: 'Incluir en el consolidado', type: 'checkbox', defaultValue: true },
      { name: 'notas', label: 'Notas', type: 'text' },
    ],
    displayCols: r => [
      { label: 'Nombre', value: String(r.nombre) },
      { label: 'Tipo', value: String(r.tipo) },
      { label: 'Consolidado', value: r.incluir_en_consolidado ? 'incluido' : 'excluido' },
    ],
  },
  {
    tabla: 'costos_proyecto',
    title: '12b. Costo de proyecto (compra de área, bono de firma…)',
    helpText: 'Desembolsos que no cuelgan de ningún pozo. Es donde va el PRECIO DE COMPRA de un área, que es lo que define si una adquisición cierra. Dejá el escenario vacío para que aplique a todos los escenarios del proyecto, o elegí uno para probar dos precios de compra distintos sobre el mismo proyecto.',
    fields: [
      { name: 'proyecto_id', label: 'Proyecto', type: 'select', optionsFrom: 'proyectos', required: true },
      { name: 'escenario_id', label: 'Escenario (vacío = todos los del proyecto)', type: 'select', optionsFrom: 'escenarios' },
      { name: 'concepto', label: 'Concepto', type: 'text', required: true },
      { name: 'tipo', label: 'Tipo', type: 'select', staticOptions: [
        { value: 'compra_area', label: 'Precio de compra del área' },
        { value: 'bono_firma', label: 'Bono de firma' },
        { value: 'compromiso_exploratorio', label: 'Compromiso exploratorio' },
        { value: 'g_and_a', label: 'G&A del proyecto' },
        { value: 'abandono_asumido', label: 'Pasivo de abandono asumido' },
        { value: 'otro', label: 'Otro' },
      ] },
      { name: 'fecha', label: 'Fecha del desembolso', type: 'date', required: true },
      { name: 'monto_usd', label: 'Monto USD', type: 'number', step: '0.01', required: true },
      { name: 'aplicar_participacion', label: 'El monto está al 100% y hay que netearlo por la participación (destildado = ya es lo que paga CPE)', type: 'checkbox' },
      { name: 'amortizable_meses', label: 'Amortizable en (meses) — vacío = salida de caja pura', type: 'number', min: 1 },
      { name: 'notas', label: 'Notas', type: 'text' },
    ],
    displayCols: (r, d) => [
      { label: 'Proyecto', value: nombreDe(d, 'proyectos', r.proyecto_id) },
      { label: 'Concepto', value: String(r.concepto) },
      { label: 'Fecha', value: String(r.fecha) },
      { label: 'Monto', value: `US$ ${Number(r.monto_usd).toLocaleString('es-AR')}` },
    ],
  },
  {
    tabla: 'escenarios',
    title: '13. Escenario',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'proyecto_id', label: 'Proyecto', type: 'select', optionsFrom: 'proyectos' },
      { name: 'price_deck_id', label: 'Curva de precios (vacío = usa las cotizaciones cargadas mes a mes)', type: 'select', optionsFrom: 'price_decks' },
      { name: 'descripcion', label: 'Descripción', type: 'text' },
      { name: 'es_base', label: 'Es el escenario base', type: 'checkbox' },
    ],
    displayCols: r => [{ label: 'Nombre', value: String(r.nombre) }, { label: 'Base', value: r.es_base ? 'Sí' : 'No' }],
  },
  {
    tabla: 'campanas',
    title: '13b. Campaña de perforación (equipos y días por etapa)',
    helpText: 'Perforación vertical convencional, un pozo por locación: el equipo se muda entre pozo y pozo. El cronograma no se carga fecha por fecha: se deriva de la cantidad de equipos y los días de cada etapa. Los días que vienen por defecto son sólo un orden de magnitud — reemplazalos por los de la campaña real. Con 1 equipo de perforación las perforaciones quedan escalonadas; con 2 avanzan dos pozos en paralelo. Si además cargás equipos de terminación aparte, el equipo de perforación pasa al pozo siguiente mientras otro termina el anterior (solapamiento parcial). Después asigná las intervenciones a esta campaña con un orden, y programala desde la pestaña "Cronograma".',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'escenario_id', label: 'Escenario (vacío = plan base)', type: 'select', optionsFrom: 'escenarios' },
      { name: 'fecha_inicio', label: 'Fecha de inicio de la campaña', type: 'date', required: true },
      { name: 'equipos_perforacion', label: 'Equipos de perforación', type: 'number', min: 1, max: 20, defaultValue: 1, required: true },
      { name: 'equipos_terminacion', label: 'Equipos de terminación (vacío = el mismo equipo perfora y termina)', type: 'number', min: 1, max: 20 },
      { name: 'dias_perforacion', label: 'Días de perforación por pozo', type: 'number', min: 1, defaultValue: 12, required: true },
      { name: 'dias_terminacion', label: 'Días de terminación por pozo', type: 'number', min: 0, defaultValue: 5, required: true },
      { name: 'dias_movilizacion', label: 'Días de mudanza del equipo entre pozos (locaciones distintas)', type: 'number', min: 0, defaultValue: 3, required: true },
      { name: 'notas', label: 'Notas', type: 'text' },
    ],
    displayCols: (r, d) => [
      { label: 'Nombre', value: String(r.nombre) },
      { label: 'Inicio', value: String(r.fecha_inicio) },
      { label: 'Equipos', value: `${r.equipos_perforacion} perf.${r.equipos_terminacion ? ` + ${r.equipos_terminacion} term.` : ' (perfora y termina)'}` },
      { label: 'Días', value: `${r.dias_perforacion}p + ${r.dias_terminacion}t + ${r.dias_movilizacion}m` },
      { label: 'Escenario', value: r.escenario_id != null ? nombreDe(d, 'escenarios', r.escenario_id) : 'base' },
    ],
  },
  {
    tabla: 'intervenciones',
    title: '14. Pozos nuevos e intervenciones (perforación / workover / pulling / facilities)',
    helpText: 'Facilities es CAPEX que sostiene el yacimiento activo (líneas, baterías, tratamiento) pero NO agrega producción propia — dejá "Pozo" vacío y "Curva que activa" vacío. El motor lo amortiza contra la producción total del yacimiento igual que el CAPEX de cualquier pozo, repartiendo la cuota entre los pozos que producen ese mes; el desembolso de caja queda en el mes en que se hizo.',
    fields: [
      { name: 'pozo_id', label: 'Pozo (vacío si es drilling nuevo o facilities)', type: 'select', optionsFrom: 'pozos' },
      { name: 'concesion_id', label: 'Concesión', type: 'select', optionsFrom: 'concesiones', required: true },
      { name: 'tipo', label: 'Tipo', type: 'select', staticOptions: [
        { value: 'perforacion', label: 'Perforación' }, { value: 'workover', label: 'Workover' },
        { value: 'pulling', label: 'Pulling' }, { value: 'facilities', label: 'Facilities' },
      ] },
      { name: 'subtipo', label: 'Subtipo (opcional) — informativo, no afecta el cálculo', type: 'select', staticOptions: [
        { value: 'inyeccion', label: 'Inyección' }, { value: 'produccion', label: 'Producción' }, { value: 'conversion', label: 'Conversión' },
      ] },
      { name: 'campana_id', label: 'Campaña (opcional — si la elegís, la fecha la calcula el cronograma)', type: 'select', optionsFrom: 'campanas' },
      { name: 'orden', label: 'Orden dentro de la campaña', type: 'number', min: 1 },
      { name: 'fecha', label: 'Fecha de primera producción (la calcula el cronograma si hay campaña)', type: 'date', required: true },
      { name: 'dias_perforacion', label: 'Días de perforación (vacío = usa el de la campaña)', type: 'number', min: 1 },
      { name: 'dias_terminacion', label: 'Días de terminación (vacío = usa el de la campaña)', type: 'number', min: 0 },
      { name: 'capex_usd', label: 'CAPEX USD', type: 'number', step: '0.01', required: true },
      { name: 'vida_util_meses', label: 'Vida útil (meses)', type: 'number' },
      { name: 'pozo_tipo_id', label: 'Curva que activa (pozo tipo)', type: 'select', optionsFrom: 'pozos_tipo' },
      { name: 'escenario_id', label: 'Escenario (vacío = plan base)', type: 'select', optionsFrom: 'escenarios' },
    ],
    displayCols: (r, d) => [{ label: 'Tipo', value: String(r.tipo) }, { label: 'Fecha', value: String(r.fecha) }, { label: 'CAPEX', value: String(r.capex_usd) }, { label: 'Concesión', value: nombreDe(d, 'concesiones', r.concesion_id) }],
  },
  {
    tabla: 'reservas_anuales',
    title: '15. Reservas P1/P2/P3 por yacimiento',
    helpText: 'Se reporta por año, según el reserve report (ej. "al 31/12/24"), no mensual.',
    fields: [
      { name: 'yacimiento_id', label: 'Yacimiento', type: 'select', optionsFrom: 'yacimientos', required: true },
      { name: 'escenario_id', label: 'Escenario (vacío = reporte base/auditado)', type: 'select', optionsFrom: 'escenarios' },
      { name: 'anio', label: 'Año', type: 'number', required: true },
      { name: 'categoria', label: 'Categoría', type: 'select', staticOptions: [{ value: 'P1', label: 'P1 — Probadas' }, { value: 'P2', label: 'P2 — Probables' }, { value: 'P3', label: 'P3 — Posibles' }] },
      { name: 'reservas_bbl', label: 'Reservas (bbl) — informativo, el motor usa la columna BOE', type: 'number', step: '0.01' },
      { name: 'reservas_boe', label: 'Reservas (BOE)', type: 'number', step: '0.01' },
      { name: 'fecha_corte', label: 'Fecha de corte del reserve report', type: 'date', required: true },
      { name: 'factor_certeza_override', label: 'Factor de certeza puntual (vacío = usa el default de la categoría)', type: 'number', step: '0.0001', min: 0, max: 1 },
    ],
    displayCols: (r, d) => [
      { label: 'Yacimiento', value: nombreDe(d, 'yacimientos', r.yacimiento_id) }, { label: 'Año', value: String(r.anio) },
      { label: 'Cat.', value: String(r.categoria) }, { label: 'BOE bruto', value: String(r.reservas_boe) },
      { label: 'Factor', value: r.factor_certeza_override != null ? `${r.factor_certeza_override} (override)` : `${factorCertezaDe(d, String(r.categoria))} (default)` },
      { label: 'BOE ajustado', value: (Number(r.reservas_boe) * (r.factor_certeza_override != null ? Number(r.factor_certeza_override) : factorCertezaDe(d, String(r.categoria)))).toFixed(1) },
    ],
  },
  {
    tabla: 'reservas_movimientos',
    title: '15b. Movimiento de reservas (reconciliación NI 51-101)',
    helpText: 'NI 51-101 exige explicar el cambio de reservas año contra año en siete categorías. La producción la calcula el motor sola; estas seis se cargan del informe del evaluador. Van CON SIGNO: negativo para una revisión a la baja, una cesión o un factor económico desfavorable.',
    fields: [
      { name: 'yacimiento_id', label: 'Yacimiento', type: 'select', optionsFrom: 'yacimientos', required: true },
      { name: 'escenario_id', label: 'Escenario (vacío = reporte base)', type: 'select', optionsFrom: 'escenarios' },
      { name: 'categoria', label: 'Categoría', type: 'select', staticOptions: [
        { value: 'P1', label: 'P1 — Probadas' }, { value: 'P2', label: 'P2 — Probables' }, { value: 'P3', label: 'P3 — Posibles' },
      ], required: true },
      { name: 'anio', label: 'Año', type: 'number', required: true },
      { name: 'tipo', label: 'Categoría del movimiento', type: 'select', staticOptions: [
        { value: 'revision_tecnica', label: 'Revisiones técnicas' },
        { value: 'extension_recuperacion_mejorada', label: 'Extensiones y recuperación mejorada' },
        { value: 'descubrimiento', label: 'Descubrimientos' },
        { value: 'adquisicion', label: 'Adquisiciones' },
        { value: 'cesion', label: 'Cesiones' },
        { value: 'factores_economicos', label: 'Factores económicos' },
      ], required: true },
      { name: 'boe', label: 'BOE (con signo: negativo si resta reservas)', type: 'number', step: '0.01', required: true },
      { name: 'nota', label: 'Nota', type: 'text' },
    ],
    displayCols: (r, d) => [
      { label: 'Yacimiento', value: nombreDe(d, 'yacimientos', r.yacimiento_id) },
      { label: 'Cat.', value: String(r.categoria) },
      { label: 'Año', value: String(r.anio) },
      { label: 'Movimiento', value: String(r.tipo).replace(/_/g, ' ') },
      { label: 'BOE', value: Number(r.boe).toLocaleString('es-AR') },
    ],
  },
  {
    tabla: 'parametros_certeza_reservas',
    title: '15b. Factor de certeza por categoría (P1/P2/P3)',
    helpText: 'Pondera las reservas de cada categoría según el grado de certeza que defina la empresa. Se aplica por defecto a todas las filas de reservas_anuales de esa categoría, salvo que el registro tenga un override puntual.',
    fields: [
      { name: 'categoria', label: 'Categoría', type: 'select', staticOptions: [{ value: 'P1', label: 'P1 — Probadas' }, { value: 'P2', label: 'P2 — Probables' }, { value: 'P3', label: 'P3 — Posibles' }] },
      { name: 'factor', label: 'Factor (0 a 1, ej. 0.5 = 50%)', type: 'number', step: '0.0001', min: 0, max: 1, required: true },
      { name: 'fecha_desde', label: 'Vigente desde', type: 'date', required: true },
    ],
    displayCols: r => [{ label: 'Categoría', value: String(r.categoria) }, { label: 'Factor', value: String(r.factor) }, { label: 'Desde', value: String(r.fecha_desde) }],
  },
  {
    tabla: 'supuestos_generales',
    title: '16. Supuestos generales (valuación de empresa)',
    helpText: 'Ojo con el "working interest" de acá — NO es el que usa el motor. La participación que afecta el cálculo es la de "Participación en la concesión", que además admite tramos con fechas.',
    fields: [
      { name: 'escenario_id', label: 'Escenario', type: 'select', optionsFrom: 'escenarios', required: true },
      { name: 'yacimiento_id', label: 'Yacimiento', type: 'select', optionsFrom: 'yacimientos', required: true },
      { name: 'working_interest_pct', label: 'Working interest (0 a 1)', type: 'number', step: '0.0001', min: 0, max: 1, defaultValue: 1 },
    ],
    displayCols: (r, d) => [{ label: 'Escenario', value: nombreDe(d, 'escenarios', r.escenario_id) }, { label: 'Yacimiento', value: nombreDe(d, 'yacimientos', r.yacimiento_id) }, { label: 'WI%', value: String(r.working_interest_pct) }],
  },
  {
    tabla: 'costos_corporativos',
    title: '16b. Costo corporativo (G&A, estructura)',
    helpText: 'Costos que no pertenecen a ningún proyecto. El consolidado los resta para pasar de "suma de proyectos" a valor de empresa. El monto es MENSUAL: un G&A de 3,6 MM al año se carga como 300.000. Los intereses de deuda NO van acá — se derivan solos de la tabla de deuda corporativa.',
    fields: [
      { name: 'concepto', label: 'Concepto', type: 'text', required: true },
      { name: 'tipo', label: 'Tipo', type: 'select', staticOptions: [
        { value: 'g_and_a', label: 'G&A' }, { value: 'estructura', label: 'Estructura' },
        { value: 'honorarios', label: 'Honorarios' }, { value: 'seguros', label: 'Seguros' },
        { value: 'otro', label: 'Otro' },
      ] },
      { name: 'fecha_desde', label: 'Desde', type: 'date', required: true },
      { name: 'fecha_hasta', label: 'Hasta (vacío = todo el horizonte)', type: 'date' },
      { name: 'monto_usd_mes', label: 'Monto USD por MES', type: 'number', step: '0.01', required: true },
      { name: 'deducible', label: 'Deducible de ganancias (genera escudo fiscal)', type: 'checkbox', defaultValue: true },
      { name: 'notas', label: 'Notas', type: 'text' },
    ],
    displayCols: r => [
      { label: 'Concepto', value: String(r.concepto) },
      { label: 'USD/mes', value: Number(r.monto_usd_mes).toLocaleString('es-AR') },
      { label: 'Desde', value: String(r.fecha_desde) },
      { label: 'Deducible', value: r.deducible ? 'sí' : 'no' },
    ],
  },
  {
    tabla: 'deuda_notas',
    title: '17. Deuda corporativa (obligaciones negociables)',
    fields: [
      { name: 'serie', label: 'Serie (ej. Serie III)', type: 'text', required: true },
      { name: 'moneda', label: 'Moneda', type: 'text', defaultValue: 'USD' },
      { name: 'saldo_usd_mm', label: 'Saldo (USD MM)', type: 'number', step: '0.0001', required: true },
      { name: 'fecha_corte', label: 'Fecha de corte', type: 'date', required: true },
      { name: 'tasa_interes_pct', label: 'Tasa de interés %', type: 'number', step: '0.0001' },
      { name: 'garantia', label: 'Garantía', type: 'select', staticOptions: [{ value: 'secured', label: 'Secured' }, { value: 'unsecured', label: 'Unsecured' }] },
      { name: 'fecha_vencimiento', label: 'Fecha de vencimiento', type: 'date' },
    ],
    displayCols: r => [{ label: 'Serie', value: String(r.serie) }, { label: 'Saldo MM', value: String(r.saldo_usd_mm) }, { label: 'Corte', value: String(r.fecha_corte) }],
  },
  {
    tabla: 'comparables_mercado',
    helpText: 'Empresas comparables para valuar por múltiplos: EV/boe de reservas, EV por barril diario de producción y EV/NPV10. Es la otra mitad de la valuación — el DCF dice cuánto valen los flujos, los comparables a cuánto paga el mercado activos parecidos. Se usan en la pestaña "Comparables".',
    title: '18. Comparables de mercado (valuación por múltiplos)',
    fields: [
      { name: 'empresa', label: 'Empresa', type: 'text', required: true },
      { name: 'pais', label: 'País', type: 'text' },
      { name: 'fecha_corte', label: 'Fecha de corte', type: 'date', required: true },
      { name: 'market_cap_usd_mm', label: 'Market cap (USD MM)', type: 'number', step: '0.01' },
      { name: 'deuda_neta_usd_mm', label: 'Deuda neta (USD MM)', type: 'number', step: '0.01' },
      { name: 'ev_usd_mm', label: 'EV (USD MM)', type: 'number', step: '0.01' },
      { name: 'dividend_yield_pct', label: 'Dividend yield %', type: 'number', step: '0.0001' },
      { name: 'reservas_p1_mmboe', label: 'Reservas P1 (MMboe)', type: 'number', step: '0.01' },
      { name: 'reservas_p2_mmboe', label: 'Reservas P2 (MMboe)', type: 'number', step: '0.01' },
      { name: 'npv10_p1_usd_mm', label: 'NPV10 P1 (USD MM)', type: 'number', step: '0.01' },
      { name: 'npv10_p2_usd_mm', label: 'NPV10 P2 (USD MM)', type: 'number', step: '0.01' },
      { name: 'produccion_kboepd', label: 'Producción (kboe/d)', type: 'number', step: '0.01' },
    ],
    displayCols: r => [{ label: 'Empresa', value: String(r.empresa) }, { label: 'País', value: String(r.pais ?? '—') }, { label: 'EV MM', value: String(r.ev_usd_mm ?? '—') }],
  },
]
