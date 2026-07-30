// Locale-aware number formatting — ES uses '.' for thousands and ',' for
// decimals, EN is the reverse. Use this instead of hardcoding strings so a
// number always renders correctly in both languages from one source value.
const LOCALE: Record<'es' | 'en', string> = { es: 'es-AR', en: 'en-US' }

export function formatNumber(value: number, lang: 'es' | 'en', opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALE[lang], opts).format(value)
}

export function formatDecimal(value: number, lang: 'es' | 'en', fractionDigits: number): string {
  return formatNumber(value, lang, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
}
