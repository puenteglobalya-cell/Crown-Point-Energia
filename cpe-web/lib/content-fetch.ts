import { createSupabaseServerAdminClient } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────

export type IrEvent = {
  id: string; fecha: string; tipo: string
  titulo_es: string; titulo_en: string; nota_es: string; nota_en: string
  activo: boolean; orden: number
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

// ── Fetch functions ────────────────────────────────────────────────────────

export async function fetchIrEvents(): Promise<IrEvent[]> {
  const { data } = await createSupabaseServerAdminClient()
    .from('ir_events').select('*').eq('activo', true).order('orden')
  return (data ?? []) as IrEvent[]
}

export async function fetchIrAnalysts(): Promise<IrAnalyst[]> {
  const { data } = await createSupabaseServerAdminClient()
    .from('ir_analysts').select('*').eq('activo', true).order('orden')
  return (data ?? []) as IrAnalyst[]
}

export async function fetchObligaciones(): Promise<ObligacionNegociable[]> {
  const { data } = await createSupabaseServerAdminClient()
    .from('obligaciones_negociables').select('*').eq('activo', true).order('orden')
  return (data ?? []) as ObligacionNegociable[]
}

export async function fetchOperationsBlocks(): Promise<OperationsBlock[]> {
  const { data } = await createSupabaseServerAdminClient()
    .from('operations_blocks').select('*').eq('activo', true).order('orden')
  return (data ?? []) as OperationsBlock[]
}

export async function fetchTeamMembers(tipo?: 'management' | 'board'): Promise<TeamMember[]> {
  let q = createSupabaseServerAdminClient()
    .from('team_members').select('*').eq('activo', true).order('orden')
  if (tipo) q = q.eq('tipo', tipo)
  const { data } = await q
  return (data ?? []) as TeamMember[]
}

export async function fetchStrategyCards(): Promise<StrategyCard[]> {
  const { data } = await createSupabaseServerAdminClient()
    .from('strategy_cards').select('*').order('orden')
  return (data ?? []) as StrategyCard[]
}

export async function fetchOpenPositions(): Promise<OpenPosition[]> {
  const { data } = await createSupabaseServerAdminClient()
    .from('open_positions').select('*').eq('activo', true).order('orden')
  return (data ?? []) as OpenPosition[]
}

export async function fetchCultureCards(): Promise<CultureCard[]> {
  const { data } = await createSupabaseServerAdminClient()
    .from('culture_cards').select('*').order('orden')
  return (data ?? []) as CultureCard[]
}

export async function fetchEsgPillars(): Promise<EsgPillarData[]> {
  const { data } = await createSupabaseServerAdminClient()
    .from('esg_pillar_data').select('*').order('pilar')
  if (!data) return []
  return data.map(p => ({
    ...p,
    metrics: p.metrics as EsgPillarData['metrics'],
  })) as EsgPillarData[]
}
