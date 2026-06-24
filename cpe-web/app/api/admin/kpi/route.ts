import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { parseKpiExcel } from '@/lib/parsers/kpi-excel'
import { parseKpiWord } from '@/lib/parsers/kpi-word'

export const dynamic = 'force-dynamic'

const MAX = 50 * 1024 * 1024 // 50 MB

// POST /api/admin/kpi — upload Excel + Word, return unified preview
export async function POST(req: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()

  const excel = formData.get('excel') as File | null
  const word  = formData.get('word')  as File | null

  if (!excel) return NextResponse.json({ error: 'Se requiere el archivo Excel de consolidación (.xlsx)' }, { status: 400 })
  if (!word)  return NextResponse.json({ error: 'Se requiere el archivo Word del MDA (.docx)' }, { status: 400 })

  if (excel.size > MAX) return NextResponse.json({ error: 'Excel demasiado grande (máx 50 MB)' }, { status: 400 })
  if (word.size  > MAX) return NextResponse.json({ error: 'Word demasiado grande (máx 50 MB)' }, { status: 400 })

  const excelExt = excel.name.split('.').pop()?.toLowerCase()
  const wordExt  = word.name.split('.').pop()?.toLowerCase()
  if (!['xlsx', 'xls'].includes(excelExt ?? ''))
    return NextResponse.json({ error: 'El archivo Excel debe ser .xlsx o .xls' }, { status: 400 })
  if (wordExt !== 'docx')
    return NextResponse.json({ error: 'El archivo Word debe ser .docx' }, { status: 400 })

  try {
    const [excelBuf, wordBuf] = await Promise.all([excel.arrayBuffer(), word.arrayBuffer()])
    const [excelData, wordData] = await Promise.all([
      parseKpiExcel(excelBuf),
      parseKpiWord(wordBuf),
    ])

    // Merge planned-wells fields into the CMS field payload
    const wellsTotal = wordData.wellsPlannedTotal
    if (wellsTotal > 0) {
      excelData.fields['inv.thesis.4.val']  = String(wellsTotal)
      excelData.fields['inv.thesis.4.unit'] = 'pozos'
      excelData.fields['inv.thesis.4.meta'] = `${excelData.period} · plan de perforación`
      excelData.fieldsEn['inv.thesis.4.meta'] = `${excelData.period} · drilling plan`
    }

    return NextResponse.json({ excel: excelData, word: wordData })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 })
  }
}
