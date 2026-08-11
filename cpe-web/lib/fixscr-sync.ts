import { parse, type HTMLElement } from 'node-html-parser'
import { createClient } from '@supabase/supabase-js'

const FIXSCR_EMISOR_ID = '4052'
const FIXSCR_URL = `https://www.fixscr.com/emisor/view?type=emisor&id=${FIXSCR_EMISOR_ID}`

export type CalificacionLocal = {
  plazo: string; fecha: string; rating: string; perspectiva: string; accion: string
}
export type OnVigente = {
  isin: string; concepto: string; fecha: string; rating: string; perspectiva: string; accion: string
}

// ── Date parsing ─────────────────────────────────────────────────────────────
// FIX SCR usa "10-ago-26" (Calificación Nacional) y "10-ago-2026" (Emisiones
// Vigentes) -- mismo formato, año de 2 o 4 dígitos.
const MONTH: Record<string, string> = {
  'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
}

function parseDate(raw: string): string {
  const m = raw.trim().toLowerCase().match(/(\d{1,2})-([a-z]{3})\.?-(\d{2,4})/)
  if (!m) return raw
  const [, d, mon, yRaw] = m
  const y = yRaw.length === 2 ? `20${yRaw}` : yRaw
  return `${y}-${MONTH[mon] ?? '01'}-${d.padStart(2, '0')}`
}

// ── HTML scraper ──────────────────────────────────────────────────────────────

async function fetchFixscrHtml(): Promise<string> {
  const res = await fetch(FIXSCR_URL, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      'Cache-Control':   'no-cache',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`FIX SCR HTTP ${res.status}`)
  return res.text()
}

function textOf(el: HTMLElement | null): string {
  return el ? el.text.replace(/\s+/g, ' ').trim() : ''
}

// FIX SCR no usa <table> -- son divs con clases "Rtable-row"/"Rtable-cell",
// cada celda con un ".Rtable-cell--heading" (el nombre de columna, oculto por
// CSS en pantallas grandes) seguido de ".Rtable-cell--content" (el valor).
// Se busca por el texto del heading en vez de por posición porque el layout
// varía entre la tabla de calificación (5 columnas) y la de emisiones (6).
function cellByHeading(row: HTMLElement, heading: string): string {
  for (const cell of row.querySelectorAll('.Rtable-cell')) {
    const h = cell.querySelector('.Rtable-cell--heading')
    if (h && textOf(h).toLowerCase() === heading.toLowerCase()) {
      // El div de contenido repite la palabra del heading (ej. "Perspectiva
      // Positiva" dentro de la celda "Perspectiva") -- se pela ese prefijo
      // para no mostrarlo duplicado en la UI.
      const content = textOf(cell.querySelector('.Rtable-cell--content'))
      const re = new RegExp(`^${heading}\\s+`, 'i')
      return content.replace(re, '')
    }
  }
  return ''
}

// La fila de "Calificación Nacional" es la única con una celda de heading
// "Plazo" -- ni la tabla-leyenda (CLAVE/PERSPECTIVA/WATCH) de arriba de la
// página ni las filas de "Emisiones Vigentes" (ISIN en vez de Plazo) la tienen.
export function parseCalificacionLocal(html: string): CalificacionLocal[] {
  const root = parse(html)
  const rows = root.querySelectorAll('.Rtable-row').filter(r => cellByHeading(r, 'Plazo'))
  return rows.map(r => ({
    plazo:       cellByHeading(r, 'Plazo'),
    fecha:       parseDate(cellByHeading(r, 'Fecha')),
    rating:      cellByHeading(r, 'Rating'),
    perspectiva: cellByHeading(r, 'Perspectiva'),
    accion:      cellByHeading(r, 'Accion Rating'),
  })).filter(c => c.plazo && c.rating)
}

// Las filas de "Emisiones Vigentes" son las únicas con celda ".isin-cell-table".
export function parseOnVigentes(html: string): OnVigente[] {
  const root = parse(html)
  const rows = root.querySelectorAll('.Rtable-row').filter(r => r.querySelector('.isin-cell-table'))
  return rows.map(r => ({
    isin:        cellByHeading(r, 'ISIN'),
    concepto:    textOf(r.querySelector('.topic-cell .title-content') ?? r.querySelector('.topic-cell')),
    fecha:       parseDate(cellByHeading(r, 'Fecha')),
    rating:      cellByHeading(r, 'Rating'),
    perspectiva: cellByHeading(r, 'Perspectiva'),
    accion:      cellByHeading(r, 'Accion Rating'),
  })).filter(o => o.isin && o.rating)
}

// ── Supabase upsert ───────────────────────────────────────────────────────────

export async function syncFixscrToSupabase(): Promise<{ calificaciones: number; on: number; errors: string[] }> {
  const html = await fetchFixscrHtml()
  const calificaciones = parseCalificacionLocal(html)
  const on = parseOnVigentes(html)

  if (calificaciones.length === 0 && on.length === 0) {
    return { calificaciones: 0, on: 0, errors: ['No se pudo parsear ninguna fila -- la página puede haber cambiado de estructura o requerir JS'] }
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const errors: string[] = []

  if (calificaciones.length > 0) {
    const { error } = await db.from('fix_calificacion_local')
      .upsert(calificaciones.map(c => ({ ...c, synced_at: new Date().toISOString() })), { onConflict: 'plazo' })
    if (error) errors.push(`fix_calificacion_local: ${error.message}`)
  }

  if (on.length > 0) {
    const { error } = await db.from('fix_on_vigentes')
      .upsert(on.map((o, i) => ({ ...o, orden: i, synced_at: new Date().toISOString() })), { onConflict: 'isin' })
    if (error) errors.push(`fix_on_vigentes: ${error.message}`)
  }

  return { calificaciones: calificaciones.length, on: on.length, errors }
}
