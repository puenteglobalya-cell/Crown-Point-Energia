import ExcelJS from 'exceljs'

// ─── Export a Excel con fórmulas vivas ───────────────────────────────────
// El objetivo no es sacar una foto de los números: es poder **validar el
// motor**. Por eso las columnas derivadas van como fórmulas de Excel y no como
// valores, así se puede abrir una celda y ver de dónde sale, cambiar un
// supuesto y ver el efecto, o cruzar contra el Excel de referencia.
//
// Convención de la planilla:
//   - Las hojas de detalle traen las líneas al 100% del proyecto, más la
//     participación del mes en su propia columna.
//   - Las columnas netas a CPE se calculan con fórmula (= línea × participación),
//     que es exactamente lo que hace el motor.
//   - El resumen anual y el VAN se calculan con fórmulas contra el detalle.

const AZUL = 'FF1F2566'
const GRIS = 'FFF2F2F5'

type Fila = Record<string, unknown>

function encabezar(ws: ExcelJS.Worksheet, columnas: { header: string; key: string; width: number; fmt?: string }[]) {
  ws.columns = columnas.map(c => ({ header: c.header, key: c.key, width: c.width }))
  const head = ws.getRow(1)
  head.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
  head.alignment = { vertical: 'middle', wrapText: true }
  head.height = 28
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  for (const c of columnas) {
    if (c.fmt) ws.getColumn(c.key).numFmt = c.fmt
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } }
}

const USD = '#,##0'
const USD2 = '#,##0.00'
const PCT = '0.00%'
const NUM = '#,##0'

export type DatosExport = {
  escenario: string
  generado: string
  tasaDescuento: number
  cashflow: Fila[]
  anual: Fila[]
  depletion: Fila[]
  npvPorTasa: { tasa: number; npv_antes_impuestos_usd: number; npv_despues_impuestos_usd: number }[]
  cuadre?: { capex_amortizable_usd: number; amortizacion_total_usd: number; abandono_usd: number; diferencia_usd: number; cuadra: boolean } | null
  nombrePozo: (id: unknown) => string
  nombreYacimiento: (id: unknown) => string
}

export async function construirExcel(d: DatosExport): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Crown Point Energía — Simulador de reservas'
  wb.created = new Date(d.generado)

  // ─── Portada ───────────────────────────────────────────────────────────
  const portada = wb.addWorksheet('Portada')
  portada.columns = [{ width: 38 }, { width: 46 }]
  portada.addRow(['Simulador de reservas — Crown Point Energía']).font = { bold: true, size: 14, color: { argb: AZUL } }
  portada.addRow([])
  const meta: [string, string][] = [
    ['Escenario', d.escenario],
    ['Generado', d.generado],
    ['Tasa de descuento', `${(d.tasaDescuento * 100).toFixed(1)}%`],
    ['Filas de cash flow mensual', String(d.cashflow.length)],
    ['Años en el resumen', String(d.anual.length)],
  ]
  for (const [k, v] of meta) {
    const r = portada.addRow([k, v])
    r.getCell(1).font = { bold: true, size: 10 }
    r.getCell(2).font = { size: 10 }
  }
  // Cuadre de amortización: el chequeo que cierra el método de unidades de
  // producción. Va en la portada porque es lo primero que se mira al validar.
  if (d.cuadre) {
    portada.addRow([])
    const t = portada.addRow(['Cuadre de amortización', d.cuadre.cuadra ? 'CUADRA' : 'NO CUADRA — revisar'])
    t.getCell(1).font = { bold: true, size: 11, color: { argb: AZUL } }
    t.getCell(2).font = { bold: true, size: 11, color: { argb: d.cuadre.cuadra ? 'FF2D7A4A' : 'FFB33B2E' } }
    for (const [k, v] of [
      ['CAPEX amortizable', d.cuadre.capex_amortizable_usd],
      ['Amortización total', d.cuadre.amortizacion_total_usd],
      ['Diferencia', d.cuadre.diferencia_usd],
      ['Costo de abandono (no amortizable)', d.cuadre.abandono_usd],
    ] as [string, number][]) {
      const r = portada.addRow([k, v])
      r.getCell(1).font = { size: 10 }
      r.getCell(2).numFmt = USD
    }
  }

  portada.addRow([])
  const nota = portada.addRow(['Cómo leer esta planilla', ''])
  nota.getCell(1).font = { bold: true, size: 11, color: { argb: AZUL } }
  for (const linea of [
    'Los inputs del simulador se cargan al 100% del proyecto (curvas, CAPEX, OPEX, precios).',
    'La hoja "Cash flow mensual" muestra esas líneas al 100%, más la participación de cada mes.',
    'Las columnas netas a CPE son FÓRMULAS: = línea x participación del mes. Se pueden auditar celda por celda.',
    'El resumen anual y el VAN también son fórmulas contra el detalle mensual, no valores pegados.',
    'Cambiar un número del detalle recalcula el resto de la planilla.',
    'Reservas y depleción están en volumen físico al 100%: son barriles en el subsuelo, no participación.',
    'La amortización es por unidades de producción: cuota = valor residual x (producción del mes / reservas remanentes).',
    'La hoja de depleción es la reconciliación de NI 51-101: apertura + movimientos - producción = cierre.',
  ]) {
    const r = portada.addRow(['', linea])
    r.getCell(2).font = { size: 10, italic: true }
    r.getCell(2).alignment = { wrapText: true }
  }

  // ─── Cash flow mensual ─────────────────────────────────────────────────
  const cf = wb.addWorksheet('Cash flow mensual')
  encabezar(cf, [
    { header: 'Pozo', key: 'pozo', width: 22 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Petróleo (bbl)\n100%', key: 'bbl', width: 14, fmt: NUM },
    { header: 'Gas (Mcf)\n100%', key: 'mcf', width: 14, fmt: NUM },
    { header: 'Precio petróleo\nUSD/bbl', key: 'poil', width: 13, fmt: USD2 },
    { header: 'Precio gas\nUSD/Mcf', key: 'pgas', width: 12, fmt: USD2 },
    { header: 'Ingreso bruto\n100%', key: 'ing', width: 15, fmt: USD },
    { header: 'Regalías\n100%', key: 'reg', width: 13, fmt: USD },
    { header: 'IIBB\n100%', key: 'iibb', width: 12, fmt: USD },
    { header: 'Imp. Déb. y Créd.\n100%', key: 'dyc', width: 14, fmt: USD },
    { header: 'OPEX total\n100%', key: 'opex', width: 14, fmt: USD },
    { header: 'CAPEX\n100%', key: 'capex', width: 14, fmt: USD },
    { header: 'Amortización\n100%', key: 'depre', width: 14, fmt: USD },
    { header: 'Result. antes gcias.\n100%', key: 'rag', width: 16, fmt: USD },
    { header: 'Imp. ganancias\n100%', key: 'gcias', width: 14, fmt: USD },
    { header: 'Participación', key: 'part', width: 12, fmt: PCT },
    { header: 'Cash flow neto CPE\n(fórmula)', key: 'cfneto', width: 18, fmt: USD },
    { header: 'BOE 100%\n(fórmula)', key: 'boe', width: 13, fmt: NUM },
    { header: 'Activo', key: 'activo', width: 8 },
  ])

  d.cashflow.forEach((r, i) => {
    const f = i + 2 // fila de Excel
    // pozo_id es null a propósito para facilities y para Intervenciones sin
    // pozo real (perforación/workover a probar) — nombrePozo(null) caía al
    // fallback `Pozo #${id}` con id literalmente "null", una etiqueta sin
    // sentido en un Excel pensado para auditarse fila por fila. Se usa la
    // categoría de la fila (que sí distingue facilities de un pozo nuevo a
    // perforar) en su lugar.
    const etiquetaPozo = r.pozo_id != null
      ? d.nombrePozo(r.pozo_id)
      : r.categoria === 'facilities' ? 'Facilities' : `${r.categoria ?? 'sin categoría'} (sin pozo real)`
    cf.addRow({
      pozo: etiquetaPozo,
      fecha: String(r.fecha),
      bbl: Number(r.bbl_petroleo), mcf: Number(r.mcf_gas),
      poil: Number(r.precio_petroleo), pgas: Number(r.precio_gas),
      ing: Number(r.ingreso_bruto_usd), reg: Number(r.regalias_usd),
      iibb: Number(r.iibb_usd), dyc: Number(r.debitos_creditos_usd),
      opex: Number(r.opex_fijo_usd) + Number(r.opex_variable_usd) + Number(r.opex_fijo_pozo_usd),
      capex: Number(r.capex_usd), depre: Number(r.depreciacion_usd),
      rag: Number(r.resultado_antes_ganancias_usd), gcias: Number(r.impuesto_ganancias_usd),
      part: Number(r.participacion_pct),
      // Fórmulas: así se ve exactamente cómo el motor llega al flujo neto.
      // (resultado antes de gcias − impuesto + amortización − CAPEX) × participación
      cfneto: { formula: `((N${f}-O${f})+M${f}-L${f})*P${f}` },
      boe: { formula: `C${f}+D${f}/6` },
      activo: r.economicamente_activo ? 'Sí' : 'No',
    })
  })

  // Totales al pie
  const ultima = d.cashflow.length + 1
  if (d.cashflow.length > 0) {
    const tot = cf.addRow({
      pozo: 'TOTAL',
      bbl: { formula: `SUM(C2:C${ultima})` },
      mcf: { formula: `SUM(D2:D${ultima})` },
      ing: { formula: `SUM(G2:G${ultima})` },
      reg: { formula: `SUM(H2:H${ultima})` },
      opex: { formula: `SUM(K2:K${ultima})` },
      capex: { formula: `SUM(L2:L${ultima})` },
      gcias: { formula: `SUM(O2:O${ultima})` },
      cfneto: { formula: `SUM(Q2:Q${ultima})` },
      boe: { formula: `SUM(R2:R${ultima})` },
    })
    tot.font = { bold: true }
    tot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } }
  }

  // ─── Resumen anual (neto a CPE) ────────────────────────────────────────
  const an = wb.addWorksheet('Resumen anual')
  encabezar(an, [
    { header: 'Yacimiento', key: 'yac', width: 24 },
    { header: 'Año', key: 'anio', width: 8 },
    { header: 'Petróleo (bbl)\nneto CPE', key: 'bbl', width: 15, fmt: NUM },
    { header: 'Gas (Mcf)\nneto CPE', key: 'mcf', width: 15, fmt: NUM },
    { header: 'BOE neto\n(fórmula)', key: 'boe', width: 14, fmt: NUM },
    { header: 'Ingresos\nneto CPE', key: 'ing', width: 16, fmt: USD },
    { header: 'Regalías', key: 'reg', width: 14, fmt: USD },
    { header: 'OPEX', key: 'opex', width: 14, fmt: USD },
    { header: 'EBITDA\n(fórmula)', key: 'ebitda', width: 16, fmt: USD },
    { header: 'D&A', key: 'da', width: 14, fmt: USD },
    { header: 'EBIT\n(fórmula)', key: 'ebit', width: 16, fmt: USD },
    { header: 'Imp. ganancias', key: 'gcias', width: 14, fmt: USD },
    { header: 'Resultado neto', key: 'neto', width: 16, fmt: USD },
    { header: 'Netback USD/BOE\n(fórmula)', key: 'netback', width: 16, fmt: USD2 },
  ])

  d.anual.forEach((r, i) => {
    const f = i + 2
    an.addRow({
      yac: r.yacimiento_id == null ? 'CONSOLIDADO' : d.nombreYacimiento(r.yacimiento_id),
      anio: Number(r.anio),
      bbl: Number(r.produccion_petroleo_bbl), mcf: Number(r.produccion_gas_mcf),
      boe: { formula: `C${f}+D${f}/6` },
      ing: Number(r.ingresos_usd), reg: Number(r.regalias_usd), opex: Number(r.opex_usd),
      ebitda: { formula: `F${f}-G${f}-H${f}` },
      da: Number(r.depreciacion_usd),
      ebit: { formula: `I${f}-J${f}` },
      gcias: Number(r.impuesto_ganancias_usd),
      neto: Number(r.resultado_neto_usd),
      netback: { formula: `IF(E${f}=0,"",I${f}/E${f})` },
    })
    if (r.yacimiento_id == null) {
      an.getRow(f).font = { bold: true }
      an.getRow(f).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } }
    }
  })

  // ─── VAN NI 51-101 ─────────────────────────────────────────────────────
  const van = wb.addWorksheet('VAN NI 51-101')
  van.columns = [{ width: 24 }, { width: 22 }, { width: 22 }]
  const t = van.addRow(['Valor presente del flujo neto futuro'])
  t.font = { bold: true, size: 12, color: { argb: AZUL } }
  van.addRow(['Form 51-101F1: sin descontar y a 5%, 10%, 15% y 20%, antes y después de impuesto a las ganancias.'])
    .getCell(1).font = { italic: true, size: 9 }
  van.addRow([])
  const h = van.addRow(['Tasa de descuento', 'Antes de impuestos (USD)', 'Después de impuestos (USD)'])
  h.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
  h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
  for (const r of d.npvPorTasa) {
    const row = van.addRow([
      r.tasa === 0 ? 'Sin descontar' : `${(r.tasa * 100).toFixed(0)}%`,
      r.npv_antes_impuestos_usd,
      r.npv_despues_impuestos_usd,
    ])
    row.getCell(2).numFmt = USD
    row.getCell(3).numFmt = USD
  }

  // ─── Depleción de reservas ─────────────────────────────────────────────
  if (d.depletion.length > 0) {
    const dep = wb.addWorksheet('Depleción reservas')
    encabezar(dep, [
      { header: 'Yacimiento', key: 'yac', width: 24 },
      { header: 'Categoría', key: 'cat', width: 11 },
      { header: 'Año', key: 'anio', width: 8 },
      { header: 'Apertura (BOE)', key: 'ap', width: 16, fmt: NUM },
      { header: 'Revisiones técnicas', key: 'rev', width: 14, fmt: NUM },
      { header: 'Extensiones y rec. mejorada', key: 'ext', width: 15, fmt: NUM },
      { header: 'Descubrimientos', key: 'desc', width: 14, fmt: NUM },
      { header: 'Adquisiciones', key: 'adq', width: 13, fmt: NUM },
      { header: 'Cesiones', key: 'ces', width: 13, fmt: NUM },
      { header: 'Factores económicos', key: 'fec', width: 14, fmt: NUM },
      { header: 'Producción', key: 'dep', width: 14, fmt: NUM },
      { header: 'Cierre (BOE)\n(fórmula)', key: 'cie', width: 16, fmt: NUM },
      { header: 'Factor certeza', key: 'fac', width: 13, fmt: PCT },
      { header: 'Cierre ponderado\n(fórmula)', key: 'cier', width: 17, fmt: NUM },
    ])
    d.depletion.forEach((r, i) => {
      const f = i + 2
      dep.addRow({
        yac: d.nombreYacimiento(r.yacimiento_id),
        cat: String(r.categoria), anio: Number(r.anio),
        ap: Number(r.apertura_boe),
        rev: Number(r.revision_tecnica_boe ?? 0), ext: Number(r.extension_boe ?? 0),
        desc: Number(r.descubrimiento_boe ?? 0), adq: Number(r.adquisicion_boe ?? 0),
        ces: Number(r.cesion_boe ?? 0), fec: Number(r.factores_economicos_boe ?? 0),
        dep: Number(r.depletion_boe),
        // apertura + los seis movimientos − producción
        cie: { formula: `D${f}+E${f}+F${f}+G${f}+H${f}+I${f}+J${f}-K${f}` },
        fac: r.factor_certeza != null ? Number(r.factor_certeza) : null,
        cier: r.factor_certeza != null ? { formula: `L${f}*M${f}` } : null,
      })
    })
    dep.addRow([])
    dep.addRow(['', '', '', 'P1/P2/P3 son Probadas / Probables / Posibles incrementales: la producción agota primero las probadas.'])
      .getCell(4).font = { italic: true, size: 9 }
    dep.addRow(['', '', '', 'Las seis columnas de movimiento son las categorías que exige NI 51-101 y salen del informe del evaluador.'])
      .getCell(4).font = { italic: true, size: 9 }
  }

  return wb.xlsx.writeBuffer()
}
