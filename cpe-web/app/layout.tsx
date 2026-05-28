import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import {
  Playfair_Display,
  Inter,
  JetBrains_Mono,
  Fraunces,
  Manrope,
} from 'next/font/google'
import { getCmsState } from '@/lib/cms'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CpeAdapter from '@/components/CpeAdapter'
import RevealObserver from '@/components/RevealObserver'
import CookieBanner from '@/components/CookieBanner'
import './globals.css'

const fontPlayfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nf-playfair',
  display: 'swap',
})
const fontInter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-nf-inter',
  display: 'swap',
})
const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-nf-mono',
  display: 'swap',
})
const fontFraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-nf-fraunces',
  display: 'swap',
})
const fontManrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-nf-manrope',
  display: 'swap',
})

const fontClasses = [
  fontPlayfair.variable,
  fontInter.variable,
  fontMono.variable,
  fontFraunces.variable,
  fontManrope.variable,
].join(' ')

export const metadata: Metadata = {
  title: 'Crown Point Energy — TSXV: CWV',
  description: 'Empresa argentina de petróleo y gas. Operamos en cuatro cuencas con producción propia, listada en TSXV: CWV.',
}

export const revalidate = 60

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const state = await getCmsState()

  const cookieStore = cookies()
  const langCookie = cookieStore.get('cpe_lang')?.value
  const lang = (langCookie === 'en' || langCookie === 'es') ? langCookie : state.lang

  const headersList = headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const showSiteChrome = !pathname.startsWith('/portal') && !pathname.startsWith('/admin')

  return (
    <html
      lang={lang}
      data-direction={state.direction}
      data-theme={state.theme}
      data-lang={lang}
      className={fontClasses}
    >
      <body>
        {showSiteChrome && (
          <a className="skip-nav" href="#main-content">
            <span className="lang-es">Saltar al contenido</span>
            <span className="lang-en">Skip to content</span>
          </a>
        )}
        {showSiteChrome && <Header fields={state.fields} show={state.show} lang={lang} />}
        <main id="main-content">{children}</main>
        {showSiteChrome && <Footer />}
        <CpeAdapter state={{ ...state, lang }} />
        <RevealObserver />
        {showSiteChrome && <CookieBanner />}
      </body>
    </html>
  )
}
