import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { parseKpiExcel } from '@/lib/parsers/kpi-excel'

export const dynamic = 'force-dynamic'

// POST /api/admin/kpi  — upload Excel, return preview of extracted fields
export async function POST(req: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })

  const MAX = 50 * 1024 * 1024 // 50 MB
  if (file.size > MAX) return NextResponse.json({ error: 'Archivo demasiado grande (máx 50 MB)' }, { status: 400 })

  try {
    const buffer = await file.arrayBuffer()
    const result = await parseKpiExcel(buffer)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 })
  }
}
