'use client'

import Image from 'next/image'
import { useState } from 'react'
import { AdminPageHeader } from '@/components/AdminPageHeader'

// ── Paleta completa de marca (de tokens.css) ──────────────────────────────────
const PRIMARY_COLORS = [
  { name: 'Navy',        token: '--cp-navy',         hex: '#1A2B4C', on: '#fff', usage: 'Color primario de marca. Header, footer, botones principales.' },
  { name: 'Navy Deep',   token: '--cp-navy-deep',    hex: '#0F1E38', on: '#fff', usage: 'Hover states, fondos de secciones oscuras.' },
  { name: 'Navy Darker', token: '--cp-navy-darker',  hex: '#031636', on: '#fff', usage: 'Footer, ticker, overlays sobre fotos.' },
  { name: 'Green CPE',   token: '--cp-green',        hex: '#82BC00', on: '#031636', usage: 'Acento principal. CTAs, highlights, live dot, selecciones activas.' },
  { name: 'Green Deep',  token: '--cp-green-deep',   hex: '#5C8700', on: '#fff', usage: 'Hover del verde. Texto verde sobre fondos claros.' },
  { name: 'Green Soft',  token: '--cp-green-soft',   hex: '#D4EE8A', on: '#031636', usage: 'Verde suave. Fondos de badges y chips sobre navy.' },
]

const ACCENT_COLORS = [
  { name: 'Gold',         token: '--cp-gold',         hex: '#C9A24A', on: '#031636', usage: 'Dirección Editorial. Títulos IR premium, ornamentos.' },
  { name: 'Gold Deep',    token: '--cp-gold-deep',    hex: '#A37F2C', on: '#fff',    usage: 'Hover del dorado sobre fondos claros.' },
  { name: 'Copper',       token: '--cp-copper',       hex: '#B05E2A', on: '#fff',    usage: 'Dirección Industrial. Elementos de energía y extractivas.' },
  { name: 'Copper Soft',  token: '--cp-copper-soft',  hex: '#E0B98E', on: '#031636', usage: 'Variante suave del cobre para dark mode.' },
  { name: 'Bordeaux',     token: '--cp-bordeaux',     hex: '#8B1A2A', on: '#fff',    usage: 'Alertas críticas, indicadores de riesgo alto.' },
  { name: 'Blue',         token: '--cp-blue',         hex: '#4E7EC4', on: '#fff',    usage: 'Banners informativos, links en tablas de datos.' },
]

const NEUTRAL_COLORS = [
  { name: 'Black CPE',   token: '--cp-black',       hex: '#0B0F12', on: '#fff',    usage: 'Negro de marca. Textos de impacto, texto editorial oscuro.' },
  { name: 'Ink',         token: '--cp-ink',         hex: '#14172E', on: '#fff',    usage: 'Color de texto principal en modo claro (--fg).' },
  { name: 'Graphite',    token: '--cp-graphite',    hex: '#2A2E50', on: '#fff',    usage: 'Texto neutro oscuro en superficies industriales.' },
  { name: 'Slate',       token: '--cp-slate',       hex: '#4F5478', on: '#fff',    usage: 'Texto secundario (--fg-soft). Subtítulos, meta.' },
  { name: 'Mid',         token: '--cp-mid',         hex: '#8488A8', on: '#fff',    usage: 'Texto muted. Etiquetas, fechas, metadatos.' },
  { name: 'Line',        token: '--cp-line',        hex: '#DCDAE6', on: '#031636', usage: 'Bordes y separadores en modo claro.' },
  { name: 'Paper',       token: '--cp-paper',       hex: '#FAFAF6', on: '#031636', usage: 'Fondo base Editorial. Cálido, contraste alto.' },
  { name: 'Cream',       token: '--cp-cream',       hex: '#F1ECDF', on: '#031636', usage: 'Fondo alternativo Editorial. Secciones, blockquotes.' },
  { name: 'White',       token: '--cp-white',       hex: '#FFFFFF', on: '#031636', usage: 'Superficies de cards, fondos de formularios.' },
]

const SEMANTIC_COLORS = [
  { name: 'Positive',    hex: '#2C7A5B', on: '#fff',    usage: 'Variaciones ▲, estados OK, confirmaciones.' },
  { name: 'Negative',    hex: '#B33B2E', on: '#fff',    usage: 'Variaciones ▼, alertas, errores.' },
  { name: 'Warning',     hex: '#B7680E', on: '#fff',    usage: 'Atención, vencimientos próximos, advertencias.' },
]

// ── Tipografía ────────────────────────────────────────────────────────────────
const TYPEFACES = [
  {
    family: 'Montserrat',
    cssVar: '--font-display',
    role: 'Display · Títulos',
    description: 'Todos los headings (h1–h4), valores de KPI, hero taglines. Dirección Corporativo e Industrial.',
    weights: [
      { weight: 400, label: 'Regular' },
      { weight: 600, label: 'SemiBold' },
      { weight: 700, label: 'Bold' },
    ],
    specimen: 'Crown Point Energy Inc.',
    subSpecimen: 'Crown Point Energía S.A. · Patagonia',
  },
  {
    family: 'Inter',
    cssVar: '--font-body',
    role: 'Body · UI',
    description: 'Párrafos, etiquetas, botones, navegación, formularios, chips. Cualquier dirección.',
    weights: [
      { weight: 400, label: 'Regular' },
      { weight: 500, label: 'Medium' },
      { weight: 600, label: 'SemiBold' },
    ],
    specimen: 'Cuencas productoras en Argentina',
    subSpecimen: 'Austral · GSJ · Neuquina · Cuyana',
  },
  {
    family: 'JetBrains Mono',
    cssVar: '--font-mono',
    role: 'Mono · Datos',
    description: 'Precios de acciones, porcentajes, tablas financieras, coordenadas GPS, código.',
    weights: [
      { weight: 400, label: 'Regular' },
      { weight: 500, label: 'Medium' },
    ],
    specimen: 'CA $0.205 +2.50%',
    subSpecimen: 'TSXV: CWV · 8,672 boe/d',
  },
]

const TYPE_SCALE = [
  { token: '--t-eyebrow', px: '11px', tracking: '0.16em', weight: 700, transform: 'uppercase', example: 'OPERACIONES · ARGENTINA', label: 'Eyebrow / Label' },
  { token: '--t-xs',  px: '12px', example: 'Nota legal · Metadatos de archivo', label: 'XS' },
  { token: '--t-sm',  px: '14px', example: 'Etiqueta de formulario · Nav link', label: 'SM / UI' },
  { token: '--t-base',px: '16px', example: 'Párrafo base · Cuerpo de texto', label: 'Base' },
  { token: '--t-md',  px: '18px', example: 'Lead de artículo · Subtítulo corto', label: 'MD' },
  { token: '--t-lg',  px: '22px', example: 'Subheading de sección', label: 'LG' },
  { token: '--t-xl',  px: '28px', example: 'Heading h3 · Card title', label: 'XL / h3' },
  { token: '--t-2xl', px: '38px', example: 'Heading h2 · Section title', label: '2XL / h2' },
  { token: '--t-3xl', px: '52px', example: 'Heading h1', label: '3XL / h1' },
  { token: '--t-4xl', px: '72px', example: 'Hero display', label: '4XL / Hero' },
]

// ── Direcciones visuales ──────────────────────────────────────────────────────
const DIRECTIONS = [
  {
    key: 'corporativo',
    name: 'Corporativo',
    description: 'Identidad principal de Crown Point. Navy + Green, Montserrat, superficies blancas. Para comunicaciones formales, website público, IR.',
    bg: '#1A2B4C', fg: '#ffffff', accent: '#82BC00', surface: '#ffffff', surfaceFg: '#14172E',
    fonts: 'Montserrat · Inter',
    when: 'Website público, Deck IR, Presentaciones corporativas, Papelería',
  },
  {
    key: 'editorial',
    name: 'Editorial',
    description: 'Estilo periodístico premium. Fondo cream, Fraunces serif, Gold como acento. Para informes anuales, comunicados de prensa y documentos de lectura larga.',
    bg: '#FAFAF6', fg: '#0B0F12', accent: '#C9A24A', surface: '#FFFCF5', surfaceFg: '#0B0F12',
    fonts: 'Fraunces · Inter',
    when: 'Informe anual, Memoria & Balance, Notas de prensa, VDR',
  },
  {
    key: 'industrial',
    name: 'Industrial',
    description: 'Dark navy profundo, Manrope bold, Green como acento. Para contenido operacional, dashboards técnicos y contextos de campo.',
    bg: '#0E1235', fg: '#ECEEFB', accent: '#82BC00', surface: '#1A1F58', surfaceFg: '#ECEEFB',
    fonts: 'Manrope · Manrope',
    when: 'Portal intranet, Dashboard operacional, Señalética digital',
  },
]

// ── Logo usage rules ──────────────────────────────────────────────────────────
const LOGO_RULES = {
  do: [
    'Usar el logotipo completo en fondos blancos o claro (modo light).',
    'Invertir a blanco (filter: brightness(0) invert(1)) sobre fondos navy o dark.',
    'Respetar el espacio de respiro mínimo: al menos la altura de la "C" del logo alrededor.',
    'Mínimo de uso recomendado: 120px de ancho en digital, 30mm en impresión.',
    'En impresión a 1 color, usar versión navy (#1A2B4C) o negro puro (#0B0F12).',
  ],
  dont: [
    'No cambiar los colores del logo (navy ni el verde CPE).',
    'No estirar, comprimir o rotar el logotipo.',
    'No colocar el logo sobre fondos con poco contraste (grises medios, colores saturados).',
    'No agregar sombras, contornos, degradados o efectos al logo.',
    'No usar el ícono solo sin la wordmark en contextos donde la marca no sea reconocida.',
  ],
}

function ColorChip({ name, hex, on, token, usage }: { name: string; hex: string; on: string; token?: string; usage: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(hex)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--rule)', cursor: 'pointer' }} onClick={copy} title={`Copiar ${hex}`}>
      <div style={{ height: 72, background: hex, display: 'flex', alignItems: 'flex-end', padding: '8px 12px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: on, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', opacity: 0.9 }}>
          {copied ? '✓ copiado' : hex.toUpperCase()}
        </span>
      </div>
      <div style={{ padding: '10px 12px', background: 'var(--surface)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{name}</div>
        {token && <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', marginBottom: 4 }}>{token}</div>}
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{usage}</div>
      </div>
    </div>
  )
}

export default function MarcaPage() {
  const [logoTheme, setLogoTheme] = useState<'light' | 'dark' | 'green'>('light')

  const logoBg: Record<string, string> = {
    light: '#ffffff',
    dark:  '#031636',
    green: '#82BC00',
  }
  const logoFilter: Record<string, string> = {
    light: 'none',
    dark:  'brightness(0) invert(1)',
    green: 'brightness(0) invert(1)',
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <AdminPageHeader
          title="Manual de Marca"
          subtitle="Referencia de identidad visual de Crown Point Energía S.A. — paleta de colores, tipografía, logo y pautas de uso para garantizar coherencia en todas las comunicaciones."
        />
      </div>

      {/* ── 1. LOGO ─────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <SectionTitle n="01" title="Logotipo" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

          {/* Logo preview */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 8 }}>
              {(['light', 'dark', 'green'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setLogoTheme(t)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 12px',
                    borderRadius: 'var(--r-pill)', border: '1px solid var(--rule)',
                    background: logoTheme === t ? 'var(--accent)' : 'transparent',
                    color: logoTheme === t ? 'var(--on-accent)' : 'var(--fg-soft)',
                    cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >
                  {t === 'light' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Verde'}
                </button>
              ))}
            </div>
            <div style={{
              background: logoBg[logoTheme],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '48px 32px', minHeight: 180,
              transition: 'background 0.2s',
            }}>
              <Image
                src="/logo.png"
                alt="Crown Point Energy"
                width={220}
                height={100}
                style={{ objectFit: 'contain', filter: logoFilter[logoTheme], transition: 'filter 0.2s' }}
              />
            </div>
            <div style={{ padding: '12px 16px', fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
              /public/logo.png · PNG con fondo transparente
            </div>
          </div>

          {/* Clearspace & sizing */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 16 }}>Especificaciones</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  ['Tamaño mínimo digital', '120px de ancho'],
                  ['Tamaño mínimo impresión', '30mm de ancho'],
                  ['Espacio de respiro', 'Altura de la "C" del logo'],
                  ['Fondo recomendado', 'Blanco · Navy (#1A2B4C) · Verde CPE (#82BC00)'],
                  ['Formato digital', 'PNG (transparente) · SVG'],
                  ['Formato impresión', 'PDF vectorial · EPS'],
                  ['1 color claro', 'Blanco puro #FFFFFF'],
                  ['1 color oscuro', 'Navy #1A2B4C o Negro #0B0F12'],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--fg-muted)', fontWeight: 500, width: '40%' }}>{k}</td>
                    <td style={{ padding: '8px 0', color: 'var(--fg)', fontFamily: typeof v === 'string' && v.includes('#') ? 'var(--font-mono)' : 'inherit' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Do / Don't */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <RulesCard title="✓  Uso correcto" color="var(--cp-positive)" items={LOGO_RULES.do} />
          <RulesCard title="✗  Evitar"       color="var(--cp-negative)" items={LOGO_RULES.dont} />
        </div>
      </section>

      {/* ── 2. COLORES PRIMARIOS ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <SectionTitle n="02" title="Paleta de colores" />

        <ColorGroup label="Colores primarios" colors={PRIMARY_COLORS} />
        <ColorGroup label="Acentos" colors={ACCENT_COLORS} />
        <ColorGroup label="Neutros" colors={NEUTRAL_COLORS} />

        {/* Semánticos */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 12 }}>Semánticos · Estado</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {SEMANTIC_COLORS.map(c => (
              <ColorChip key={c.name} name={c.name} hex={c.hex} on={c.on} usage={c.usage} />
            ))}
          </div>
        </div>

        {/* Combinaciones recomendadas */}
        <div style={{ marginTop: 28, background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 16 }}>Combinaciones aprobadas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {[
              { bg: '#1A2B4C', fg: '#ffffff',  label: 'Navy + Blanco' },
              { bg: '#031636', fg: '#82BC00',  label: 'Navy Darker + Green' },
              { bg: '#82BC00', fg: '#031636',  label: 'Green + Navy' },
              { bg: '#ffffff', fg: '#1A2B4C',  label: 'Blanco + Navy' },
              { bg: '#FAFAF6', fg: '#0B0F12',  label: 'Paper + Black' },
              { bg: '#0E1235', fg: '#ECEEFB',  label: 'Industrial + Light' },
              { bg: '#C9A24A', fg: '#031636',  label: 'Gold + Navy' },
              { bg: '#031636', fg: '#C9A24A',  label: 'Navy + Gold' },
            ].map(c => (
              <div
                key={c.label}
                style={{
                  background: c.bg, color: c.fg,
                  padding: '10px 18px', borderRadius: 'var(--r-lg)',
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
                  border: c.bg === '#ffffff' || c.bg === '#FAFAF6' ? '1px solid var(--rule)' : 'none',
                }}
              >
                {c.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. TIPOGRAFÍA ──────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <SectionTitle n="03" title="Tipografía" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
          {TYPEFACES.map(tf => (
            <div key={tf.family} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {/* Especimen */}
                <div style={{ padding: '28px 32px', borderRight: '1px solid var(--rule)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 16 }}>
                    {tf.role} · <span style={{ fontFamily: 'var(--font-mono)' }}>{tf.cssVar}</span>
                  </div>
                  <div style={{ fontFamily: getFontFamily(tf.family), fontSize: 36, fontWeight: 700, lineHeight: 1.1, color: 'var(--fg)', marginBottom: 6, letterSpacing: '-0.02em' }}>
                    {tf.specimen}
                  </div>
                  <div style={{ fontFamily: getFontFamily(tf.family), fontSize: 16, color: 'var(--fg-soft)', letterSpacing: '0.1em' }}>
                    {tf.subSpecimen}
                  </div>
                  {/* Alphabet */}
                  <div style={{ fontFamily: getFontFamily(tf.family), fontSize: 13, color: 'var(--fg-muted)', marginTop: 20, letterSpacing: '0.04em', lineHeight: 1.6 }}>
                    A B C D E F G H I J K L M N O P Q R S T U V W X Y Z<br />
                    a b c d e f g h i j k l m n o p q r s t u v w x y z<br />
                    0 1 2 3 4 5 6 7 8 9 · % $ / + − . ,
                  </div>
                </div>
                {/* Info */}
                <div style={{ padding: '28px 32px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Familia</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: getFontFamily(tf.family), color: 'var(--fg)', marginBottom: 16 }}>{tf.family}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6 }}>Uso</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.6, marginBottom: 20 }}>{tf.description}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Pesos disponibles</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {tf.weights.map(w => (
                      <div key={w.weight} style={{ fontFamily: getFontFamily(tf.family), fontWeight: w.weight, fontSize: 14, color: 'var(--fg)', background: 'var(--bg-alt)', padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1px solid var(--rule)' }}>
                        {w.weight} · {w.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Escala tipográfica */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
            Escala tipográfica
          </div>
          {TYPE_SCALE.map(s => (
            <div key={s.token} style={{
              display: 'grid',
              gridTemplateColumns: '100px 60px 1fr',
              alignItems: 'center',
              gap: 16,
              padding: '10px 20px',
              borderBottom: '1px solid var(--rule)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{s.token}</div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{s.px}</div>
              <div style={{
                fontSize: s.px,
                fontWeight: s.weight ?? 400,
                letterSpacing: s.tracking ?? 'normal',
                textTransform: (s.transform as React.CSSProperties['textTransform']) ?? 'none',
                color: 'var(--fg)',
                lineHeight: 1.2,
                fontFamily: s.token === '--t-eyebrow' ? 'var(--font-body)' : 'var(--font-display)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {s.example}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. DIRECCIONES VISUALES ─────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <SectionTitle n="04" title="Direcciones visuales" />
        <p style={{ fontSize: 14, color: 'var(--fg-soft)', marginBottom: 24, lineHeight: 1.6 }}>
          El sistema de diseño contempla tres direcciones que pueden seleccionarse desde el CMS Admin. Cada una mantiene la identidad CPE pero adapta el tono visual al contexto.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {DIRECTIONS.map(d => (
            <div key={d.key} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              {/* Preview */}
              <div style={{ background: d.bg, padding: '24px 20px', minHeight: 140 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: d.accent, fontWeight: 700, marginBottom: 10, opacity: 0.9 }}>
                  TSXV: CWV · ENERGÍA
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: d.fg, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 8 }}>
                  Crown Point
                </div>
                <div style={{ fontSize: 12, color: d.fg, opacity: 0.6 }}>
                  {d.fonts}
                </div>
                <div style={{ marginTop: 16, display: 'inline-flex', padding: '7px 16px', background: d.accent, color: d.bg, fontSize: 11, fontWeight: 700, borderRadius: 999, letterSpacing: '0.04em' }}>
                  VER MÁS
                </div>
              </div>
              {/* Info */}
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6, marginBottom: 12 }}>{d.description}</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4 }}>Usar en</div>
                <div style={{ fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.5 }}>{d.when}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. VOZ Y TONO ──────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <SectionTitle n="05" title="Voz y tono" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {[
            {
              title: 'Preciso',
              desc: 'Los datos van primero. Cifras exactas, sin redondeos innecesarios. "8.672 boe/d" en lugar de "casi 9.000 boe/d".',
              color: '#1A2B4C',
            },
            {
              title: 'Directo',
              desc: 'Oraciones cortas. Sin jerga interna ni siglas sin definir. El lector puede ser un inversor canadiense o un proveedor local.',
              color: '#5C8700',
            },
            {
              title: 'Profesional',
              desc: 'Tono corporativo sin ser frío. Evitar superlativos ("el mejor", "líder indiscutido"). Dejar que los hechos hablen.',
              color: '#4E7EC4',
            },
            {
              title: 'Bilingüe',
              desc: 'Todo contenido público existe en ES y EN. El español es la lengua operacional; el inglés es necesario para el mercado de capitales (TSXV/CNV).',
              color: '#C9A24A',
            },
          ].map(v => (
            <div key={v.title} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '20px 24px', display: 'flex', gap: 16 }}>
              <div style={{ width: 4, borderRadius: 2, background: v.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>{v.title}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.65 }}>{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. ELEMENTOS UI ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <SectionTitle n="06" title="Elementos UI" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Botones */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 16 }}>Botones</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <button className="btn btn-primary" style={{ pointerEvents: 'none' }}>Primario (--accent + --on-accent)</button>
              <button className="btn btn-secondary" style={{ pointerEvents: 'none' }}>Secundario (borde --rule)</button>
              <button style={{ background: 'none', border: 'none', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--fg)', padding: 0, cursor: 'default' }}>
                Ghost (text + arrow) →
              </button>
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
              Radio de borde: <span style={{ fontFamily: 'var(--font-mono)' }}>var(--r-pill)</span> (999px).<br />
              Font-weight: 600 · Font-size: 14px · Letter-spacing: 0.02em.
            </div>
          </div>

          {/* Radii y Sombras */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 16 }}>Radios de borde</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
              {[
                { token: '--r-xs', px: '2px' },
                { token: '--r-sm', px: '4px' },
                { token: '--r-md', px: '6px' },
                { token: '--r-lg', px: '12px' },
                { token: '--r-xl', px: '20px' },
                { token: '--r-pill', px: '999px' },
              ].map(r => (
                <div key={r.token} style={{ textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: r.px, marginBottom: 4 }} />
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{r.px}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 12 }}>Sombras</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { token: '--sh-sm', label: 'SM' },
                { token: '--sh-md', label: 'MD' },
                { token: '--sh-lg', label: 'LG' },
              ].map(s => (
                <div key={s.token} style={{ textAlign: 'center' }}>
                  <div style={{ width: 56, height: 40, background: 'var(--surface)', borderRadius: 'var(--r-md)', boxShadow: `var(${s.token})`, marginBottom: 4, border: '1px solid var(--rule)' }} />
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{s.token}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. ARCHIVOS DE MARCA ────────────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <SectionTitle n="07" title="Archivos de marca" />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {[
            { name: 'logo.png',          path: '/logo.png',          type: 'PNG', desc: 'Logotipo principal · fondo transparente · uso digital' },
            { name: 'icon.svg',           path: '/icon.svg',          type: 'SVG', desc: 'Ícono de la app (favicon / PWA)' },
            { name: 'argentina-map.svg',  path: '/argentina-map.svg', type: 'SVG', desc: 'Mapa de Argentina con bloques operacionales CPE' },
          ].map((f, i, arr) => (
            <div
              key={f.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 60px 1fr auto',
                alignItems: 'center',
                gap: 16, padding: '14px 20px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--rule)' : 'none',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg)', fontWeight: 600 }}>{f.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)', background: 'var(--bg-alt)', color: 'var(--fg-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{f.type}</span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{f.desc}</span>
              <a
                href={f.path}
                download
                style={{
                  fontSize: 12, fontWeight: 600, padding: '6px 14px',
                  borderRadius: 'var(--r-pill)', border: '1px solid var(--rule)',
                  color: 'var(--fg)', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                ↓ Descargar
              </a>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 12, lineHeight: 1.6 }}>
          Para versiones vectoriales de alta resolución (AI, EPS, PDF) o el kit completo de marca, contactar al área de Comunicaciones.
        </p>
      </section>

    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 24, paddingBottom: 14, borderBottom: '1px solid var(--rule)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500 }}>{n}</span>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
    </div>
  )
}

function ColorGroup({ label, colors }: { label: string; colors: typeof PRIMARY_COLORS }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 12 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
        {colors.map(c => (
          <ColorChip key={c.token ?? c.name} name={c.name} hex={c.hex} on={c.on} token={c.token} usage={c.usage} />
        ))}
      </div>
    </div>
  )
}

function RulesCard({ title, color, items }: { title: string; color: string; items: string[] }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.04em', marginBottom: 14 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => (
          <li key={item} style={{ fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.55 }}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function getFontFamily(family: string): string {
  if (family === 'Montserrat') return 'var(--font-display)'
  if (family === 'Inter')       return 'var(--font-body)'
  return 'var(--font-mono)'
}
