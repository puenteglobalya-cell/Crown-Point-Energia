import { createSupabaseServerAdminClient } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────

export type IrEvent = {
  id: string; fecha: string; tipo: string
  titulo_es: string; titulo_en: string; nota_es: string; nota_en: string
  activo: boolean; orden: number
}

export type ShareholderMeeting = {
  id: number
  tipo: 'agm' | 'egm'
  fecha: string
  hora_local: string | null
  zona_es: string | null
  zona_en: string | null
  formato: 'presencial' | 'virtual' | 'hibrida'
  lugar_es: string | null
  lugar_en: string | null
  titulo_es: string
  titulo_en: string
  nota_es: string | null
  nota_en: string | null
  record_date: string | null
  sedar_url: string | null
}

export type IrAnalyst = {
  id: string; analyst: string; firm: string
  rating_es: string; rating_en: string; target: string
  activo: boolean; orden: number
}

export type ObligacionNegociable = {
  id: string; serie: string; monto: string; vencimiento: string
  tasa: string; isin: string; bolsa: string; activo: boolean; orden: number
}

export type StatRow = { label_es: string; label_en: string; val: string }

export type OperationsBlock = {
  id: string; slug: string; orden: number; commodity: 'oil' | 'gas' | 'mixed'
  eyebrow: string; titulo: string; lede_es: string; lede_en: string
  card_title_es: string; card_title_en: string
  chips: string[]
  body_es: string[]; body_en: string[]
  stats: StatRow[]
  map_stats: StatRow[]
  activo: boolean
}

export type TeamMember = {
  id: string; name: string; role_es: string; role_en: string
  bio_es: string; bio_en: string; initials: string; bg: string
  tipo: 'management' | 'board'; cargo_board: string; independiente: boolean | null
  orden: number; activo: boolean
}

export type StrategyCard = {
  id: string; num: string; title_es: string; title_en: string
  body_es: string; body_en: string; orden: number
}

export type OpenPosition = {
  id: string; area: string; location: string; tipo: string
  activo: boolean; orden: number
}

export type CultureCard = {
  id: string; title_es: string; title_en: string; desc_es: string; desc_en: string
  color: string; icon_key: string; orden: number
}

export type EsgPillarData = {
  pilar: string; color: string; lede_es: string; lede_en: string
  metrics: { labelEs: string; labelEn: string; val: string }[]
  initiatives_es: string[]; initiatives_en: string[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function db() { return createSupabaseServerAdminClient() }

async function safeQuery<T>(fn: () => PromiseLike<{ data: T | null; error: unknown }>): Promise<T extends (infer U)[] ? U[] : T | null> {
  try {
    const { data } = await fn()
    return (data ?? []) as any
  } catch {
    return [] as any
  }
}

// ── Fetch functions ────────────────────────────────────────────────────────

export async function fetchIrEvents(): Promise<IrEvent[]> {
  return safeQuery(() => db().from('ir_events').select('*').eq('activo', true).order('orden'))
}

export async function fetchIrAnalysts(): Promise<IrAnalyst[]> {
  return safeQuery(() => db().from('ir_analysts').select('*').eq('activo', true).order('orden'))
}

export async function fetchObligaciones(): Promise<ObligacionNegociable[]> {
  return safeQuery(() => db().from('obligaciones_negociables').select('*').eq('activo', true).order('orden'))
}

export async function fetchOperationsBlocks(): Promise<OperationsBlock[]> {
  return safeQuery(() => db().from('operations_blocks').select('*').eq('activo', true).order('orden'))
}

export async function fetchShareholderMeetings(): Promise<ShareholderMeeting[]> {
  return safeQuery(() =>
    db().from('shareholder_meetings')
      .select('*')
      .eq('activo', true)
      .order('fecha', { ascending: true })
  )
}

export async function fetchTeamMembers(tipo?: 'management' | 'board'): Promise<TeamMember[]> {
  return safeQuery(() => {
    let q = db().from('team_members').select('*').eq('activo', true).order('orden')
    if (tipo) q = q.eq('tipo', tipo)
    return q
  })
}

export async function fetchStrategyCards(): Promise<StrategyCard[]> {
  const rows = await safeQuery(() => db().from('strategy_cards').select('*').order('orden'))
  const seen = new Set<string>()
  return (rows as StrategyCard[]).filter(c => {
    if (seen.has(c.num)) return false
    seen.add(c.num)
    return true
  })
}

export async function fetchOpenPositions(): Promise<OpenPosition[]> {
  return safeQuery(() => db().from('open_positions').select('*').eq('activo', true).order('orden'))
}

export async function fetchCultureCards(): Promise<CultureCard[]> {
  return safeQuery(() => db().from('culture_cards').select('*').order('orden'))
}

export async function fetchEsgPillars(): Promise<EsgPillarData[]> {
  try {
    const { data } = await db().from('esg_pillar_data').select('*').order('pilar')
    if (!data) return []
    return data.map(p => ({
      ...p,
      metrics: p.metrics as EsgPillarData['metrics'],
    })) as EsgPillarData[]
  } catch {
    return []
  }
}
