import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './home.module.css'

const reportes = [
  {
    id: 'mayo-2026',
    titulo: 'Mayo 2026',
    subtitulo: 'Ingresos Estimados · Petróleo & Gas',
    fecha: '31/05/2026',
    monto: 'us$ 24,04 MM',
    estado: 'estimado',
    href: '/reportes/mayo-2026',
  },
  {
    id: 'abril-2026',
    titulo: 'Abril 2026',
    subtitulo: 'Ingresos Estimados · Petróleo & Gas',
    fecha: '30/04/2026',
    monto: 'us$ 26,04 MM',
    estado: 'estimado',
    href: '/reportes/abril-2026',
  },
  // → Agregar nuevos reportes acá cada mes
]

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className={styles.wrap}>

      <header className={styles.header}>
        <div>
          <span className={styles.logoText}>Crown Point Energía</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.userEmail}>{user.email}</span>
          <form action="/auth/signout" method="post">
            <button className={styles.signout}>Salir</button>
          </form>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.pageTitle}>
          <h1>Reportes</h1>
          <p>Seleccioná el período que querés ver</p>
        </div>

        <div className={styles.grid}>
          {reportes.map(r => (
            <Link key={r.id} href={r.href} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.badge}>{r.estado}</span>
                <span className={styles.cardFecha}>{r.fecha}</span>
              </div>
              <h2 className={styles.cardTitulo}>{r.titulo}</h2>
              <p className={styles.cardSub}>{r.subtitulo}</p>
              <div className={styles.cardMonto}>{r.monto}</div>
              <div className={styles.cardArrow}>Ver reporte →</div>
            </Link>
          ))}
        </div>
      </main>

    </div>
  )
}
