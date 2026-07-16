import { cookies, headers } from 'next/headers'

// Resolves the effective language for the current request the same way
// app/layout.tsx does: cookie → Accept-Language header → CMS default.
// Any page rendering language-sensitive content outside the lang-es/lang-en
// CSS toggle pattern (e.g. a single-string ternary) must use this instead of
// the raw CMS state's `lang` field, or it can disagree with what <html
// data-lang> and the rest of the page show.
export function getEffectiveLang(cmsLang: 'es' | 'en'): 'es' | 'en' {
  const cookieStore = cookies()
  const langCookie = cookieStore.get('cpe_lang')?.value
  if (langCookie === 'en' || langCookie === 'es') return langCookie

  const acceptLang = headers().get('accept-language') ?? ''
  const primary = acceptLang.split(',')[0].split(';')[0].trim().toLowerCase()
  return primary.startsWith('en') ? 'en' : cmsLang
}
