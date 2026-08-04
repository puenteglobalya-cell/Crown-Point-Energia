// Pegado directo de una corrida de futuros (ej. ICE Brent copiado de una
// pantalla de mercado): "Contract  Last  Time(GMT)  % Change  Volume", con
// filas irregulares (la fecha y la hora quedan en líneas separadas) y meses
// ilíquidos donde "Last" viene vacío. Se identifica cada contrato por su
// código (Oct26, Nov26...) y se toma como precio el primer número que
// aparece ANTES de la primera fecha (dd/mm/aaaa) del bloque — después de la
// fecha vienen % Change y Volumen, que no son precio. Si no hay fecha en el
// bloque, ese mes no cotizó: se rellena con el último precio conocido hacia
// atrás, marcado como relleno para que se pueda revisar antes de confirmar.

export type PuntoFuturo = { anio: number; mes: number; precio: number; relleno: boolean; contrato: string }

const MESES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

// Segundo formato: pantallas tipo CME/NYMEX, con el contrato en su propia
// línea ("SEP 2026", mes en letras + año de 4 dígitos) seguido de varias
// líneas más (código, "Opt", Last, cambio, settle, high, low, volumen, hora,
// fecha). Cuando no hubo operaciones esa sesión "Last" viene como "-" y hay
// que usar el precio de ajuste/settle que sigue — se toma la primera línea
// que sea un número puro (sin "-" solo, sin "(%)"), que es Last si cotizó o
// el settle si no.
function parseBloquesConHeader(texto: string): PuntoFuturo[] {
  const regexHeader = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})\s*$/gim
  const matches: { mes: number; anio: number; index: number; largo: number }[] = []
  let m: RegExpExecArray | null
  while ((m = regexHeader.exec(texto))) {
    matches.push({ mes: MESES[m[1].toLowerCase()], anio: Number(m[2]), index: m.index, largo: m[0].length })
  }
  if (matches.length === 0) return []

  const puntos: PuntoFuturo[] = []
  for (let i = 0; i < matches.length; i++) {
    const desde = matches[i].index + matches[i].largo
    const hasta = i + 1 < matches.length ? matches[i + 1].index : texto.length
    const lineas = texto.slice(desde, hasta).split('\n').map(l => l.trim()).filter(Boolean)
    const precioLinea = lineas.find(l => /^-?\d+(\.\d+)?$/.test(l))
    const precio = precioLinea ? Number(precioLinea) : NaN
    puntos.push({ anio: matches[i].anio, mes: matches[i].mes, precio, relleno: Number.isNaN(precio), contrato: `${matches[i].mes}/${matches[i].anio}` })
  }
  return puntos
}

export function parsePreciosFuturos(texto: string): PuntoFuturo[] {
  const regexContrato = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s-]?(\d{2})\b/gi
  const matches: { contrato: string; mes: number; anio: number; index: number; largo: number }[] = []
  let m: RegExpExecArray | null
  while ((m = regexContrato.exec(texto))) {
    matches.push({
      contrato: m[0].trim(), mes: MESES[m[1].toLowerCase()], anio: 2000 + Number(m[2]),
      index: m.index, largo: m[0].length,
    })
  }

  let puntos: PuntoFuturo[]
  if (matches.length > 0) {
    puntos = matches.map(({ contrato, mes, anio, index, largo }, i) => {
      const desde = index + largo
      const hasta = i + 1 < matches.length ? matches[i + 1].index : texto.length
      const bloque = texto.slice(desde, hasta)
      const posFecha = bloque.search(/\d{1,2}\/\d{1,2}\/\d{2,4}/)
      let precio = NaN
      if (posFecha !== -1) {
        const num = bloque.slice(0, posFecha).match(/-?\d+(\.\d+)?/)
        if (num) precio = Number(num[0])
      }
      return { anio, mes, precio, relleno: Number.isNaN(precio), contrato }
    })
  } else {
    puntos = parseBloquesConHeader(texto)
  }
  if (puntos.length === 0) return []

  puntos.sort((a, b) => (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes))
  let ultimo: number | null = null
  for (const p of puntos) {
    if (Number.isNaN(p.precio)) {
      if (ultimo != null) { p.precio = ultimo; p.relleno = true }
    } else {
      ultimo = p.precio
    }
  }
  // Los primeros contratos de la corrida (los más ilíquidos, típicamente)
  // pueden no tener ningún precio previo del cual rellenar hacia atrás — el
  // filter de abajo los descartaba en silencio, sin ningún aviso de que
  // faltaban esos meses. Se rellenan hacia ADELANTE con el primer precio
  // real que aparezca más tarde en la corrida, marcados como relleno igual
  // que los demás — nunca se pierde un mes de la corrida sin que se note.
  let primero: number | null = null
  for (let i = puntos.length - 1; i >= 0; i--) {
    const p = puntos[i]
    if (Number.isNaN(p.precio)) {
      if (primero != null) { p.precio = primero; p.relleno = true }
    } else {
      primero = p.precio
    }
  }
  return puntos.filter(p => !Number.isNaN(p.precio))
}
