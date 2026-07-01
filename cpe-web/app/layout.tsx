import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import {
  Montserrat,
  Inter,
  JetBrains_Mono,
  Playfair_Display,
  Fraunces,
  Manrope,
} from 'next/font/google'
import { getCmsState } from '@/lib/cms'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BackToTop from '@/components/BackToTop'
import CpeAdapter from '@/components/CpeAdapter'
import RevealObserver from '@/components/RevealObserver'
import CookieBanner from '@/components/CookieBanner'
import './globals.css'

const fontMontserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-nf-montserrat',
  display: 'swap',
})
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
  fontMontserrat.variable,
  fontPlayfair.variable,
  fontInter.variable,
  fontMono.variable,
  fontFraunces.variable,
  fontManrope.variable,
].join(' ')

export const metadata: Metadata = {
  metadataBase: new URL('https://crownpointenergy.com'),
  title: 'Crown Point Energy — TSXV: CWV',
  description: 'Empresa argentina de petróleo y gas. Operamos en cuatro cuencas con producción propia, listada en TSXV: CWV.',
  alternates: {
    canonical: 'https://crownpointenergy.com',
  },
  openGraph: {
    type: 'website',
    siteName: 'Crown Point Energy',
    title: 'Crown Point Energy — TSXV: CWV',
    description: 'Empresa argentina de petróleo y gas. Producción propia en cuatro cuencas, listada en TSXV: CWV.',
    url: 'https://crownpointenergy.com',
    locale: 'es_AR',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'Crown Point Energy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crown Point Energy — TSXV: CWV',
    description: 'Empresa argentina de petróleo y gas. Producción propia en cuatro cuencas, listada en TSXV: CWV.',
    images: ['/logo.png'],
  },
  manifest: '/manifest.json',
  themeColor: '#1F2566',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CPE Portal',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Crown Point Energy Inc.',
  alternateName: 'Crown Point Energía S.A.',
  url: 'https://crownpointenergy.com',
  tickerSymbol: 'CWV',
  exchange: 'TSXV',
  logo: 'https://crownpointenergy.com/logo.png',
  sameAs: ['https://www.sedarplus.ca'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'investor relations',
    email: 'ir@crownpointenergy.com',
    name: 'María Teresa Zappino',
  },
}

export const revalidate = 60

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const state = await getCmsState()

  const cookieStore = cookies()
  const langCookie  = cookieStore.get('cpe_lang')?.value
  const themeCookie = cookieStore.get('cpe_theme')?.value
  const theme = (themeCookie === 'dark' || themeCookie === 'light') ? themeCookie : state.theme

  const headersList = headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // Language: cookie → Accept-Language header → CMS default
  let lang: 'es' | 'en'
  if (langCookie === 'en' || langCookie === 'es') {
    lang = langCookie
  } else {
    const acceptLang = headersList.get('accept-language') ?? ''
    const primary = acceptLang.split(',')[0].split(';')[0].trim().toLowerCase()
    lang = primary.startsWith('en') ? 'en' : (state.lang as 'es' | 'en')
  }
  const nonce = headersList.get('x-nonce') ?? undefined
  const showSiteChrome = !pathname.startsWith('/portal') && !pathname.startsWith('/admin')

  return (
    <html
      lang={lang}
      data-direction={state.direction}
      data-theme={theme}
      data-lang={lang}
      className={fontClasses}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/icon.svg" />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body>
        {showSiteChrome && (
          <a className="skip-nav" href="#main-content">
            <span className="lang-es">Saltar al contenido</span>
            <span className="lang-en">Skip to content</span>
          </a>
        )}
        {showSiteChrome && <Header fields={state.fields} show={state.show} lang={lang} theme={theme} />}
        <main id="main-content">{children}</main>
        {showSiteChrome && <Footer />}
        <CpeAdapter state={{ ...state, lang }} />
        <RevealObserver />
        {showSiteChrome && <BackToTop />}
        {showSiteChrome && <CookieBanner />}
      </body>
    </html>
  )
}
