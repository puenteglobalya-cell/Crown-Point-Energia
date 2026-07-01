import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { BACKUP_TABLES } from '@/lib/backup-tables'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'backups'
const RETENTION_DAYS = 30

// Daily automated database backup → private Supabase Storage bucket.
// Triggered by Vercel Cron with Bearer CRON_SECRET.
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseServerAdminClient()

  // Ensure the private bucket exists (idempotent)
  await db.storage.createBucket(BUCKET, { public: false }).catch(() => {})

  const includedTables = BACKUP_TABLES.filter(t => t.included && t.table !== 'storage')
  const payload: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    exported_by: 'cron',
    version: 2,
    tables_included: includedTables.length,
  }

  let failed = 0
  await Promise.all(
    includedTables.map(async t => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (db as any).from(t.table).select(t.select ?? '*')
      if (error) { failed++; console.warn(`[cron/backup] ${t.table}:`, error.message) }
      payload[t.key] = data ?? []
    })
  )

  const date = new Date().toISOString().slice(0, 10)
  const path = `daily/cpe-backup-${date}.json`
  const body = new Blob([JSON.stringify(payload)], { type: 'application/json' })

  const { error: upErr } = await db.storage.from(BUCKET).upload(path, body, {
    upsert: true, contentType: 'application/json',
  })
  if (upErr) {
    console.error('[cron/backup] upload failed:', upErr.message)
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  // Retention: delete backups older than RETENTION_DAYS
  const { data: files } = await db.storage.from(BUCKET).list('daily', { limit: 1000 })
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
  const stale = (files ?? [])
    .filter(f => /cpe-backup-(\d{4}-\d{2}-\d{2})\.json/.test(f.name))
    .filter(f => {
      const m = f.name.match(/(\d{4}-\d{2}-\d{2})/)
      return m ? new Date(m[1]) < cutoff : false
    })
    .map(f => `daily/${f.name}`)
  if (stale.length) await db.storage.from(BUCKET).remove(stale)

  console.log(`[cron/backup] saved ${path} (${includedTables.length - failed}/${includedTables.length} tables), pruned ${stale.length}`)
  return NextResponse.json({ ok: true, path, tables: includedTables.length, failed, pruned: stale.length })
}
