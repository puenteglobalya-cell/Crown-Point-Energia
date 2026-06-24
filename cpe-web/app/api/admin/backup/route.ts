import { NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { BACKUP_TABLES } from '@/lib/backup-tables'

export const dynamic = 'force-dynamic'

export async function GET() {
  const adminUser = await requireAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()

  const includedTables = BACKUP_TABLES.filter(t => t.included && t.table !== 'storage')

  const results = await Promise.all(
    includedTables.map(async t => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (db as any).from(t.table).select(t.select ?? '*')
      if (error) console.warn(`[backup] ${t.table}:`, error.message)
      return [t.key, data ?? []] as [string, unknown[]]
    })
  )

  const payload: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    exported_by: adminUser.email,
    version: 2,
    tables_included: includedTables.length,
  }

  for (const [key, data] of results) {
    payload[key] = data
  }

  const json = JSON.stringify(payload, null, 2)
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="cpe-backup-${date}.json"`,
    },
  })
}
