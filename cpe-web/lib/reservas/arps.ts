// ─── Curvas de declinación de Arps ───────────────────────────────────────
// Genera una curva mensual a partir de tres parámetros en lugar de cargar
// 240 filas a mano o depender de un Excel. Es el método convencional de
// análisis de declinación y el estándar para reservas convencionales, que es
// el caso de los yacimientos de CPE (GSJ, Neuquina, Cuyana).
//
//   b = 0        exponencial
//   0 < b < 1    hiperbólica
//   b = 1        armónica
//
// Se parametriza con la declinación EFECTIVA anual (De), que es la que se
// lee en un reporte ("declina 25% por año"), y se convierte internamente a
// la declinación nominal que usan las fórmulas.

export type ParametrosArps = {
  qiPetroleoBblDia: number
  qiGasMcfDia: number
  declinacionEfectivaAnual: number // 0.25 = 25%/año
  b: number
  meses: number
  limiteAbandonoBblDia?: number // corta la curva cuando el caudal baja de acá
}

export type CurvaArpsMes = { mes_offset: number; bbl_petroleo: number; mcf_gas: number }

// Declinación efectiva anual → nominal anual
function nominal(De: number, b: number): number {
  if (De <= 0) return 0
  if (De >= 1) return Infinity
  if (b === 0) return -Math.log(1 - De)
  return (Math.pow(1 - De, -b) - 1) / b
}

// Caudal a t años desde el inicio
function caudal(qi: number, Dn: number, b: number, t: number): number {
  if (Dn === 0) return qi
  if (!Number.isFinite(Dn)) return 0
  if (b === 0) return qi * Math.exp(-Dn * t)
  return qi / Math.pow(1 + b * Dn * t, 1 / b)
}

function diasDelMes(offset: number): number {
  // Mes calendario genérico: la curva es relativa (mes_offset), no tiene
  // fecha propia todavía, así que se usa el promedio de días de un año.
  void offset
  return 365.25 / 12
}

export function generarCurvaArps(p: ParametrosArps): CurvaArpsMes[] {
  const { qiPetroleoBblDia, qiGasMcfDia, declinacionEfectivaAnual, b, meses } = p
  if (!(meses > 0)) throw new Error('La cantidad de meses tiene que ser mayor a 0')
  if (b < 0 || b > 2) throw new Error('El factor b tiene que estar entre 0 y 2 (0 = exponencial, 1 = armónica)')
  if (declinacionEfectivaAnual < 0 || declinacionEfectivaAnual >= 1) {
    throw new Error('La declinación efectiva anual tiene que estar entre 0 y 1 (ej. 0.25 = 25%/año)')
  }

  const Dn = nominal(declinacionEfectivaAnual, b)
  const filas: CurvaArpsMes[] = []

  for (let m = 0; m < meses; m++) {
    // Caudal a mitad de mes: aproxima el promedio del período mejor que el
    // caudal inicial o final.
    const t = (m + 0.5) / 12
    const qOil = caudal(qiPetroleoBblDia, Dn, b, t)
    const qGas = caudal(qiGasMcfDia, Dn, b, t)

    if (p.limiteAbandonoBblDia && qiPetroleoBblDia > 0 && qOil < p.limiteAbandonoBblDia) break

    const dias = diasDelMes(m)
    filas.push({
      mes_offset: m,
      bbl_petroleo: Math.round(qOil * dias * 1000) / 1000,
      mcf_gas: Math.round(qGas * dias * 1000) / 1000,
    })
  }

  if (filas.length === 0) throw new Error('La curva generada quedó vacía — revisá el caudal inicial y el límite de abandono')
  return filas
}

// Recuperación final estimada de la curva generada (EUR), en las unidades de
// cada producto y en BOE (6 Mcf = 1 BOE, la convención que usa la empresa).
export function eurDeCurva(filas: CurvaArpsMes[]) {
  const bbl = filas.reduce((s, f) => s + f.bbl_petroleo, 0)
  const mcf = filas.reduce((s, f) => s + f.mcf_gas, 0)
  return { bbl, mcf, boe: bbl + mcf / 6 }
}
