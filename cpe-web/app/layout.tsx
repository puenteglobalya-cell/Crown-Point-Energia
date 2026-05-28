import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { getCmsState } from '@/lib/cms'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CpeAdapter from '@/components/CpeAdapter'
import RevealObserver from '@/components/RevealObserver'
import CookieBanner from '@/components/CookieBanner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Crown Point Energy — TSXV: CWV',
  description: 'Empresa argentina de petróleo y gas. Operamos en cuatro cuencas con producción propia, listada en TSXV: CWV.',
}

export const revalidate = 60

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const state = await getCmsState()

  // Language can be overridden by cookie (set by the lang toggle button)
  const cookieStore = cookies()
  const langCookie = cookieStore.get('cpe_lang')?.value
  const lang = (langCookie === 'en' || langCookie === 'es') ? langCookie : state.lang

  // Hide site chrome (Header/Footer/CookieBanner) for portal and admin routes
  const headersList = headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const showSiteChrome = !pathname.startsWith('/portal') && !pathname.startsWith('/admin')

  return (
    <html
      lang={lang}
      data-direction={state.direction}
      data-theme={state.theme}
      data-lang={lang}
    >
      <body>
        {showSiteChrome && <Header fields={state.fields} show={state.show} lang={lang} />}
        <main>{children}</main>
        {showSiteChrome && <Footer />}
        {/* Exposes window.CPE for the admin panel and any inline scripts */}
        <CpeAdapter state={{ ...state, lang }} />
        <RevealObserver />
        {showSiteChrome && <CookieBanner />}
      </body>
    </html>
  )
}
