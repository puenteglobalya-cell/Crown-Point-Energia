// ─── Pegar filas desde Excel ─────────────────────────────────────────────
// Cargar precios mensuales de 3 referencias por 20 años son 720 formularios de
// a uno. Esto acepta lo que se copia de una planilla (celdas separadas por
// tabulaciones) o un CSV, lo valida fila por fila y muestra qué entra y qué no
// antes de escribir nada.
//
// Dos comodidades que evitan la mayor parte de los errores de carga:
//
// · Si la primera fila parece un encabezado, se usa para mapear columnas, así
//   no importa el orden en que estén en la planilla.
// · En los campos que son una referencia a otra tabla se acepta el NOMBRE
//   además del id. Nadie tiene a mano que "El Tordillo" es el yacimiento 3.

export type CampoDestino = {
  name: string
  label: string
  type: string
  required?: boolean
  /** Opciones fijas (value/label), para campos de lista. */
  staticOptions?: { value: string; label: string }[]
  /** Tabla de la que salen las opciones, para resolver por nombre. */
  optionsFrom?: string
}

export type FilaParseada = {
  linea: number
  valores: Record<string, unknown>
  errores: string[]
}

export type ResultadoParseo = {
  columnas: (string | null)[]
  usoEncabezado: boolean
  filas: FilaParseada[]
  validas: number
  invalidas: number
}

const normalizar = (s: string) =>
  s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

// Orden de preferencia: tabulador (lo que produce copiar de Excel), punto y
// coma (el separador que usa el CSV en configuración regional española,
// justamente porque la coma es el decimal) y recién al final la coma. Si se
// partiera por coma antes que por punto y coma, "1.234,56" se rompería en dos
// celdas y el número entraría mal sin que nadie lo note.
function separarCeldas(linea: string): string[] {
  if (linea.includes('\t')) return linea.split('\t')
  if (linea.includes(';')) return linea.split(';')
  return linea.split(',')
}

// ¿La primera fila son encabezados? Lo es si al menos la mitad de sus celdas
// matchean algún campo. El match no puede ser exacto contra la etiqueta
// completa: nadie escribe "Fecha de corte del reserve report" en la planilla,
// escribe "Fecha de corte". Así que se acepta también que el título sea un
// prefijo de la etiqueta, o al revés.
function detectarEncabezado(celdas: string[], campos: CampoDestino[]): (string | null)[] | null {
  // La etiqueta suele traer aclaraciones entre paréntesis o después de un
  // guión; para comparar se usa la parte previa.
  const base = (c: CampoDestino) => normalizar(c.label.split(/[(—–-]/)[0])

  function mejorCampo(celda: string, yaUsados: Set<string>): { campo: string; puntaje: number } | null {
    const h = normalizar(celda)
    if (h === '') return null
    let mejor: { campo: string; puntaje: number } | null = null
    for (const c of campos) {
      if (yaUsados.has(c.name)) continue
      const n = normalizar(c.name), l = normalizar(c.label), b = base(c)
      let puntaje = 0
      if (h === n) puntaje = 4
      else if (h === l || h === b) puntaje = 3
      // Prefijo en cualquier dirección, con un mínimo de largo para que
      // "año" no matchee cualquier cosa que empiece igual.
      else if (h.length >= 4 && (b.startsWith(h) || h.startsWith(b) || l.startsWith(h))) puntaje = 2
      if (puntaje > (mejor?.puntaje ?? 0)) mejor = { campo: c.name, puntaje }
    }
    return mejor
  }

  // Dos pasadas: primero se asignan los matches fuertes, para que un título
  // ambiguo no se quede con el campo que le corresponde a otro exacto.
  const usados = new Set<string>()
  const mapeo: (string | null)[] = new Array(celdas.length).fill(null)
  for (const minimo of [4, 3, 2]) {
    celdas.forEach((celda, i) => {
      if (mapeo[i]) return
      const m = mejorCampo(celda, usados)
      if (m && m.puntaje === minimo) { mapeo[i] = m.campo; usados.add(m.campo) }
    })
  }

  const aciertos = mapeo.filter(Boolean).length
  return aciertos >= Math.max(1, Math.ceil(celdas.length / 2)) ? mapeo : null
}

function convertir(
  campo: CampoDestino,
  crudo: string,
  opciones: Record<string, { id: unknown; nombre?: unknown }[]>,
): { valor: unknown } | { error: string } {
  const txt = crudo.trim()

  if (txt === '') {
    if (campo.required) return { error: `falta "${campo.label}"` }
    return { valor: campo.type === 'checkbox' ? false : null }
  }

  if (campo.type === 'checkbox') {
    return { valor: ['si', 'sí', 'true', '1', 'x', 'yes'].includes(txt.toLowerCase()) }
  }

  if (campo.type === 'number') {
    const limpio = txt.replace(/\s/g, '').replace(/[^\d.,\-]/g, '')
    // Sin ningún dígito no hay número. Sin este chequeo "dos mil" quedaba en
    // string vacío y Number('') devuelve 0, así que entraba un cero silencioso.
    if (!/\d/.test(limpio)) return { error: `"${txt}" no es un número (${campo.label})` }

    const negativo = limpio.startsWith('-')
    const cuerpo = negativo ? limpio.slice(1) : limpio
    const tieneComa = cuerpo.includes(','), tienePunto = cuerpo.includes('.')
    let normal: string

    if (tieneComa && tienePunto) {
      // Con los dos separadores no hay ambigüedad: el último es el decimal.
      const decimal = cuerpo.lastIndexOf('.') > cuerpo.lastIndexOf(',') ? '.' : ','
      const miles = decimal === '.' ? ',' : '.'
      normal = cuerpo.split(miles).join('').replace(decimal, '.')
    } else if (tieneComa || tienePunto) {
      const sep = tieneComa ? ',' : '.'
      const partes = cuerpo.split(sep)
      const dec = partes[partes.length - 1]
      if (partes.length > 2) {
        normal = partes.join('') // 1.234.567 — sólo puede ser separador de miles
      } else if (dec.length === 3 && partes[0] !== '0' && partes[0] !== '') {
        // "5.000" puede ser 5000 (formato argentino) o 5,0 (inglés). Adivinar
        // en un precio es un error que no se nota, así que se rechaza y se
        // pide desambiguar. Con "0,205" no hay duda: es decimal.
        return {
          error: `"${txt}" es ambiguo en ${campo.label}: no se sabe si "${sep}" separa miles o decimales. `
            + `Escribilo como ${partes.join('')} o como ${partes[0]}.${dec}`,
        }
      } else {
        normal = `${partes[0]}.${dec}`
      }
    } else {
      normal = cuerpo
    }

    const n = Number((negativo ? '-' : '') + normal)
    if (!Number.isFinite(n)) return { error: `"${txt}" no es un número (${campo.label})` }
    return { valor: n }
  }

  if (campo.type === 'date') {
    // Se valida que la fecha EXISTA, no sólo que tenga la forma: un 31/13 o un
    // 31/02 matchean el patrón y después revientan en la base o, peor, entran
    // corridos de mes.
    const real = (iso: string) => {
      const [a, m, d] = iso.split('-').map(Number)
      const dt = new Date(Date.UTC(a, m - 1, d))
      return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
    }
    const invalida = { error: `"${txt}" no es una fecha válida (${campo.label}) — usá aaaa-mm-dd o dd/mm/aaaa` }

    if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) return real(txt) ? { valor: txt } : invalida

    const m = txt.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
    if (m) {
      const [, d, mes, a] = m
      const anio = a.length === 2 ? `20${a}` : a
      const iso = `${anio}-${mes.padStart(2, '0')}-${d.padStart(2, '0')}`
      return real(iso) ? { valor: iso } : invalida
    }
    return invalida
  }

  if (campo.type === 'select') {
    if (campo.staticOptions) {
      const op = campo.staticOptions.find(o =>
        o.value === txt || normalizar(o.label) === normalizar(txt) || normalizar(o.value) === normalizar(txt))
      if (!op) return { error: `"${txt}" no es una opción válida de ${campo.label}` }
      return { valor: op.value }
    }
    if (campo.optionsFrom) {
      const lista = opciones[campo.optionsFrom] ?? []
      // Primero por id, después por nombre: cargar "El Tordillo" tiene que
      // funcionar igual que cargar el 3.
      const porId = lista.find(o => String(o.id) === txt)
      if (porId) return { valor: Number(porId.id) }
      const porNombre = lista.find(o => normalizar(String(o.nombre ?? '')) === normalizar(txt))
      if (porNombre) return { valor: Number(porNombre.id) }
      return { error: `no existe "${txt}" en ${campo.label}` }
    }
  }

  return { valor: txt }
}

export function parsearPegado(
  texto: string,
  campos: CampoDestino[],
  opciones: Record<string, { id: unknown; nombre?: unknown }[]>,
): ResultadoParseo {
  const lineas = texto.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lineas.length === 0) {
    return { columnas: [], usoEncabezado: false, filas: [], validas: 0, invalidas: 0 }
  }

  const primera = separarCeldas(lineas[0])
  const encabezado = detectarEncabezado(primera, campos)
  const columnas: (string | null)[] = encabezado ?? campos.map(c => c.name)
  const cuerpo = encabezado ? lineas.slice(1) : lineas

  const filas: FilaParseada[] = cuerpo.map((linea, i) => {
    const celdas = separarCeldas(linea)
    const valores: Record<string, unknown> = {}
    const errores: string[] = []

    columnas.forEach((nombreCampo, col) => {
      if (!nombreCampo) return // columna que no matcheó ningún campo: se ignora
      const campo = campos.find(c => c.name === nombreCampo)
      if (!campo) return
      const r = convertir(campo, celdas[col] ?? '', opciones)
      if ('error' in r) errores.push(r.error)
      else valores[campo.name] = r.valor
    })

    // Los requeridos que no vinieron en ninguna columna también son error.
    for (const c of campos) {
      if (c.required && !(c.name in valores) && !errores.some(e => e.includes(c.label))) {
        errores.push(`falta la columna "${c.label}"`)
      }
    }

    return { linea: i + 1 + (encabezado ? 1 : 0), valores, errores }
  })

  return {
    columnas,
    usoEncabezado: encabezado !== null,
    filas,
    validas: filas.filter(f => f.errores.length === 0).length,
    invalidas: filas.filter(f => f.errores.length > 0).length,
  }
}
