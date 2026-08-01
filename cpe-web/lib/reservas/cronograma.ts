// ─── Programador de campañas de perforación ──────────────────────────────
// Deriva el cronograma de una campaña a partir de la cantidad de equipos y los
// días de cada etapa, en lugar de que cada fecha se cargue a mano.
//
// El objetivo de fondo: la participación de CPE en la concesión cambia de
// porcentaje en el tiempo, así que adelantar o atrasar un pozo cambia el cash
// flow. Para poder mover el cronograma primero hay que tenerlo derivado de
// algo, no escrito a mano pozo por pozo.
//
// Modelo de equipos:
//
//   equiposTerminacion = null  → el mismo equipo perfora y termina. Ocupa el
//                                equipo por perforación + terminación + mudanza.
//                                Con 1 equipo, la campaña queda escalonada.
//   equiposTerminacion = N     → el equipo de perforación se libera al terminar
//                                de perforar y pasa al pozo siguiente mientras
//                                un equipo de terminación cierra el anterior.
//                                Es el solapamiento parcial.

export type CampanaConfig = {
  fechaInicio: string // ISO yyyy-mm-dd
  equiposPerforacion: number
  equiposTerminacion: number | null
  diasPerforacion: number
  diasTerminacion: number
  diasMovilizacion: number
}

export type PozoAProgramar = {
  intervencionId: number
  etiqueta: string
  orden: number
  diasPerforacion?: number | null
  diasTerminacion?: number | null
}

export type PozoProgramado = {
  intervencionId: number
  etiqueta: string
  orden: number
  equipoPerforacion: number
  equipoTerminacion: number | null
  inicioPerforacion: string
  finPerforacion: string
  inicioTerminacion: string
  primeraProduccion: string
  diasPerforacion: number
  diasTerminacion: number
}

const DIA_MS = 86400000

const aDias = (iso: string) => Math.floor(new Date(iso + 'T00:00:00Z').getTime() / DIA_MS)
const aIso = (dias: number) => new Date(dias * DIA_MS).toISOString().slice(0, 10)

export function programarCampana(cfg: CampanaConfig, pozos: PozoAProgramar[]): PozoProgramado[] {
  if (!(cfg.equiposPerforacion >= 1)) throw new Error('La campaña necesita al menos un equipo de perforación')
  if (pozos.length === 0) return []

  const inicio = aDias(cfg.fechaInicio)
  // Momento en que se libera cada equipo, en días desde epoch.
  const libreDrill = Array.from({ length: cfg.equiposPerforacion }, () => inicio)
  const libreCompl = cfg.equiposTerminacion
    ? Array.from({ length: cfg.equiposTerminacion }, () => inicio)
    : null

  const ordenados = [...pozos].sort((a, b) => a.orden - b.orden || a.intervencionId - b.intervencionId)
  const out: PozoProgramado[] = []

  for (const p of ordenados) {
    const diasPerf = p.diasPerforacion ?? cfg.diasPerforacion
    const diasTerm = p.diasTerminacion ?? cfg.diasTerminacion
    if (!(diasPerf > 0)) throw new Error(`"${p.etiqueta}": los días de perforación tienen que ser mayores a 0`)
    if (diasTerm < 0) throw new Error(`"${p.etiqueta}": los días de terminación no pueden ser negativos`)

    // Primer equipo de perforación que se libera
    let iDrill = 0
    for (let i = 1; i < libreDrill.length; i++) if (libreDrill[i] < libreDrill[iDrill]) iDrill = i

    const inicioPerf = libreDrill[iDrill]
    const finPerf = inicioPerf + diasPerf

    let iCompl: number | null = null
    let inicioTerm: number
    if (libreCompl) {
      // Equipo de terminación aparte: arranca cuando termina la perforación o
      // cuando se libera el equipo de terminación, lo que ocurra después.
      iCompl = 0
      for (let i = 1; i < libreCompl.length; i++) if (libreCompl[i] < libreCompl[iCompl!]) iCompl = i
      inicioTerm = Math.max(finPerf, libreCompl[iCompl!])
      libreCompl[iCompl!] = inicioTerm + diasTerm
      // El equipo de perforación se va al pozo siguiente sin esperar la terminación
      libreDrill[iDrill] = finPerf + cfg.diasMovilizacion
    } else {
      // Mismo equipo: termina y sólo después se muda
      inicioTerm = finPerf
      libreDrill[iDrill] = inicioTerm + diasTerm + cfg.diasMovilizacion
    }

    const primeraProduccion = inicioTerm + diasTerm

    out.push({
      intervencionId: p.intervencionId,
      etiqueta: p.etiqueta,
      orden: p.orden,
      equipoPerforacion: iDrill + 1,
      equipoTerminacion: iCompl === null ? null : iCompl + 1,
      inicioPerforacion: aIso(inicioPerf),
      finPerforacion: aIso(finPerf),
      inicioTerminacion: aIso(inicioTerm),
      primeraProduccion: aIso(primeraProduccion),
      diasPerforacion: diasPerf,
      diasTerminacion: diasTerm,
    })
  }

  return out
}

// Resumen para mostrar arriba del cronograma.
export function resumenCampana(prog: PozoProgramado[]) {
  if (prog.length === 0) return null
  const inicio = prog.reduce((a, p) => (p.inicioPerforacion < a ? p.inicioPerforacion : a), prog[0].inicioPerforacion)
  const fin = prog.reduce((a, p) => (p.primeraProduccion > a ? p.primeraProduccion : a), prog[0].primeraProduccion)
  const dias = aDias(fin) - aDias(inicio)
  return {
    pozos: prog.length,
    inicio,
    fin,
    diasTotales: dias,
    mesesTotales: Math.round((dias / 30.4375) * 10) / 10,
  }
}
