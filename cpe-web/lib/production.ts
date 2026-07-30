// Single source of truth for the production figures shown on home,
// inversores and operaciones. All three pages must read from here — do not
// hardcode these numbers again in a page component.
export const PRODUCTION_1Q2026 = {
  avgBoePerDay: '8,672',
  unit: 'boe/d',
  period: '1Q 2026',
  oilPct: 86,
  gasPct: 14,
} as const

export function productionMixLabel(lang: 'es' | 'en'): string {
  const { oilPct, gasPct } = PRODUCTION_1Q2026
  return lang === 'es'
    ? `${oilPct}% petróleo · ${gasPct}% gas`
    : `${oilPct}% oil · ${gasPct}% gas`
}
