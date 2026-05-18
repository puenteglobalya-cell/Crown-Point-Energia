'use client'

import Link from 'next/link'
import styles from './ReporteShell.module.css'

interface Props {
  titulo: string
  periodo: string
  children: React.ReactNode
}

export default function ReporteShell({ titulo, periodo, children }: Props) {
  return (
    <div className={styles.wrap}>

      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← Reportes
        </Link>
        <div className={styles.headerCenter}>
          <span className={styles.headerTitulo}>{titulo}</span>
          <span className={styles.headerPeriodo}>{periodo}</span>
        </div>
        <div className={styles.headerRight} />
      </header>

      <main className={styles.main}>
        {children}
      </main>

    </div>
  )
}
