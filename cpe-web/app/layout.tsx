import type { Metadata, Viewport } from 'next'
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
import { getEffectiveLang } from '@/lib/lang'
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
  preload: false,
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
  preload: false,
})
const fontManrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-nf-manrope',
  display: 'swap',
  preload: false,
})

// Only 'corporativo' (Montserrat/Inter/Mono) loads on every request — it's the
// default and by far the most common direction. 'editorial' (Fraunces+Playfair)
// and 'industrial' (Manrope) are a global CMS toggle, not per-visitor, so their
// font files are only fetched when that direction is actually the active one.
function fontClassesFor(direction: string) {
  const base = [fontMontserrat.variable, fontInter.variable, fontMono.variable]
  if (direction === 'editorial') base.push(fontFraunces.variable, fontPlayfair.variable)
  if (direction === 'industrial') base.push(fontManrope.variable)
  return base.join(' ')
}

export const metadata: Metadata = {
  metadataBase: new URL('https://crownpointenergy.com'),
  title: 'Crown Point Energy — TSXV: CWV',
  description: 'Empresa argentina de petróleo y gas. Operamos en tres cuencas con producción propia, listada en TSXV: CWV.',
  alternates: {
    canonical: 'https://crownpointenergy.com',
  },
  // Staging (Vercel domain) must not be indexed while crownpointenergy.com
  // is the canonical. Set NEXT_PUBLIC_SITE_LIVE=true in Vercel env vars the
  // day DNS migrates to the final domain to lift this.
  robots: process.env.NEXT_PUBLIC_SITE_LIVE === 'true'
    ? { index: true, follow: true }
    : { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'Crown Point Energy',
    title: 'Crown Point Energy — TSXV: CWV',
    description: 'Empresa argentina de petróleo y gas. Producción propia en tres cuencas, listada en TSXV: CWV.',
    url: 'https://crownpointenergy.com',
    locale: 'es_AR',
    images: [{ url: '/logo.png', width: 178, height: 103, alt: 'Crown Point Energy' }],
  },
  twitter: {
    card: 'summary',
    title: 'Crown Point Energy — TSXV: CWV',
    description: 'Empresa argentina de petróleo y gas. Producción propia en tres cuencas, listada en TSXV: CWV.',
    images: ['/logo.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CPE Portal',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#1F2566',
  width: 'device-width',
  initialScale: 1,
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

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Crown Point Energy',
  url: 'https://crownpointenergy.com',
  inLanguage: ['es-AR', 'en'],
  publisher: { '@type': 'Organization', name: 'Crown Point Energy Inc.' },
}

export const revalidate = 60

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const state = await getCmsState()

  const cookieStore = cookies()
  const themeCookie = cookieStore.get('cpe_theme')?.value
  const theme = (themeCookie === 'dark' || themeCookie === 'light') ? themeCookie : state.theme

  const headersList = headers()
  const pathname = headersList.get('x-pathname') ?? ''

  const lang = getEffectiveLang(state.lang as 'es' | 'en')
  const nonce = headersList.get('x-nonce') ?? undefined
  const showSiteChrome = !pathname.startsWith('/portal') && !pathname.startsWith('/admin')

  return (
    <html
      lang={lang}
      data-direction={state.direction}
      data-theme={theme}
      data-lang={lang}
      className={fontClassesFor(state.direction)}
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
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        {showSiteChrome && (
          <a className="skip-nav" href="#main-content">
            <span className="lang-es" aria-hidden={lang !== 'es'}>Saltar al contenido</span>
            <span className="lang-en" aria-hidden={lang !== 'en'}>Skip to content</span>
          </a>
        )}
        {showSiteChrome && <Header fields={state.fields} show={state.show} lang={lang} theme={theme} />}
        <main id="main-content">{children}</main>
        {showSiteChrome && <Footer lang={lang} />}
        <CpeAdapter state={{ ...state, lang }} />
        <RevealObserver />
        {showSiteChrome && <BackToTop />}
        {showSiteChrome && <CookieBanner lang={lang} />}
      </body>
    </html>
  )
}
