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
    fields: [
      { name: 'concesion_id', label: 'Concesión', type: 'select', optionsFrom: 'concesiones', required: true },
      { name: 'fecha_desde', label: 'Vigente desde', type: 'date', required: true },
      { name: 'porcentaje', label: '% participación (0 a 1)', type: 'number', step: '0.0001', min: 0, max: 1, required: true },
      { name: 'motivo', label: 'Motivo', type: 'text' },
    ],
    displayCols: (r, d) => [{ label: 'Concesión', value: nombreDe(d, 'concesiones', r.concesion_id) }, { label: 'Desde', value: String(r.fecha_desde) }, { label: '%', value: String(r.porcentaje) }],
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
    ],
    displayCols: (r, d) => [{ label: 'Nombre', value: String(r.nombre) }, { label: 'Concesión', value: nombreDe(d, 'concesiones', r.concesion_id) }, { label: 'Alta', value: String(r.fecha_alta) }],
  },
  {
    tabla: 'pozos_tipo',
    title: '6. Pozo tipo (curva de referencia)',
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
    title: '10. OPEX variable (por yacimiento, USD/BOE)',
    fields: [
      { name: 'yacimiento_id', label: 'Yacimiento', type: 'select', optionsFrom: 'yacimientos', required: true },
      { name: 'fecha_desde', label: 'Vigente desde', type: 'date', required: true },
      { name: 'usd_por_boe', label: 'USD/BOE', type: 'number', step: '0.0001', required: true },
    ],
    displayCols: (r, d) => [{ label: 'Yacimiento', value: nombreDe(d, 'yacimientos', r.yacimiento_id) }, { label: 'USD/BOE', value: String(r.usd_por_boe) }],
  },
  {
    tabla: 'formulas_precio',
    title: '11. Fórmula de precio',
    helpText: 'precio = referencia × (1 − DDE%) / divisor − descuento adicional',
    fields: [
      { name: 'yacimiento_id', label: 'Yacimiento', type: 'select', optionsFrom: 'yacimientos', required: true },
      { name: 'producto', label: 'Producto', type: 'select', staticOptions: [{ value: 'petroleo', label: 'Petróleo' }, { value: 'gas', label: 'Gas' }] },
      { name: 'fecha_desde', label: 'Vigente desde', type: 'date', required: true },
      { name: 'referencia', label: 'Referencia (brent, wti…)', type: 'text', defaultValue: 'brent' },
      { name: 'dde_pct', label: 'DDE %', type: 'number', step: '0.01' },
      { name: 'divisor', label: 'Divisor (ej. 0.97)', type: 'number', step: '0.0001', defaultValue: 1 },
      { name: 'descuento_adicional_usd', label: 'Descuento adicional USD', type: 'number', step: '0.01' },
    ],
    displayCols: (r, d) => [{ label: 'Yacimiento', value: nombreDe(d, 'yacimientos', r.yacimiento_id) }, { label: 'Producto', value: String(r.producto) }, { label: 'Ref', value: String(r.referencia) }],
  },
  {
    tabla: 'precios_referencia',
    title: '12. Precio de referencia (ej. Brent mensual)',
    fields: [
      { name: 'referencia', label: 'Referencia', type: 'text', defaultValue: 'brent', required: true },
      { name: 'fecha', label: 'Mes', type: 'date', required: true },
      { name: 'precio_usd', label: 'Precio USD', type: 'number', step: '0.0001', required: true },
    ],
    displayCols: r => [{ label: 'Ref', value: String(r.referencia) }, { label: 'Fecha', value: String(r.fecha) }, { label: 'USD', value: String(r.precio_usd) }],
  },
  {
    tabla: 'escenarios',
    title: '13. Escenario',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'descripcion', label: 'Descripción', type: 'text' },
      { name: 'es_base', label: 'Es el escenario base', type: 'checkbox' },
    ],
    displayCols: r => [{ label: 'Nombre', value: String(r.nombre) }, { label: 'Base', value: r.es_base ? 'Sí' : 'No' }],
  },
  {
    tabla: 'intervenciones',
    title: '14. Intervención (drilling / workover / pulling / facilities)',
    fields: [
      { name: 'pozo_id', label: 'Pozo (vacío si es drilling nuevo)', type: 'select', optionsFrom: 'pozos' },
      { name: 'concesion_id', label: 'Concesión', type: 'select', optionsFrom: 'concesiones', required: true },
      { name: 'tipo', label: 'Tipo', type: 'select', staticOptions: [
        { value: 'perforacion', label: 'Perforación' }, { value: 'workover', label: 'Workover' },
        { value: 'pulling', label: 'Pulling' }, { value: 'facilities', label: 'Facilities' },
      ] },
      { name: 'fecha', label: 'Fecha', type: 'date', required: true },
      { name: 'capex_usd', label: 'CAPEX USD', type: 'number', step: '0.01', required: true },
      { name: 'vida_util_meses', label: 'Vida útil (meses)', type: 'number' },
      { name: 'pozo_tipo_id', label: 'Curva que activa (pozo tipo)', type: 'select', optionsFrom: 'pozos_tipo' },
      { name: 'escenario_id', label: 'Escenario (vacío = plan base)', type: 'select', optionsFrom: 'escenarios' },
    ],
    displayCols: (r, d) => [{ label: 'Tipo', value: String(r.tipo) }, { label: 'Fecha', value: String(r.fecha) }, { label: 'CAPEX', value: String(r.capex_usd) }, { label: 'Concesión', value: nombreDe(d, 'concesiones', r.concesion_id) }],
  },
]
