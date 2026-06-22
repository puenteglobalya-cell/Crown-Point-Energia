import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireHrUser } from '@/lib/admin-auth'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const user = await requireHrUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = createSupabaseServerAdminClient()

  // Fetch the application
  const { data: app, error: appErr } = await db
    .from('job_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (appErr || !app) return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 })

  // Fetch open positions for context
  const { data: positions } = await db
    .from('open_positions')
    .select('area, location, tipo')
    .eq('activo', true)

  const openPositions = (positions ?? [])
    .map(p => `• ${p.area} — ${p.location} (${p.tipo})`)
    .join('\n') || 'No hay posiciones abiertas en este momento.'

  const datos = app.datos ?? {}

  const candidateProfile = `
Nombre: ${app.nombre}
Email: ${app.email}
Área de interés: ${app.area}
Nivel de estudios: ${datos.nivel_estudios ?? 'No especificado'}
Carrera/especialización: ${datos.carrera ?? 'No especificado'}
Años de experiencia total: ${datos.anios_experiencia ?? 'No especificado'}
Años en sector O&G/Energía: ${datos.anios_sector ?? 'No especificado'}
Disponibilidad para empezar: ${datos.disponibilidad ?? 'No especificado'}
Disponibilidad para relocarse: ${datos.relocacion ?? 'No especificado'}
Nivel de inglés: ${datos.ingles_nivel ?? 'No especificado'}
Otros idiomas: ${datos.otros_idiomas ?? 'Ninguno'}
Pretensión salarial: ${datos.pretension ?? 'No especificada'}
Adjunta CV: ${app.cv_path ? 'Sí' : 'No'}
Mensaje del postulante: ${app.mensaje || '(Sin mensaje)'}
`.trim()

  const systemPrompt = `Sos un asistente especializado en RRHH para Crown Point Energía S.A., empresa argentina de petróleo y gas que opera en cuatro cuencas (Neuquina, San Jorge, Austral, Cuyana). Analizás perfiles de candidatos de manera objetiva y profesional. Respondés siempre en español argentino, de forma concisa.`

  const userPrompt = `Analizá el siguiente perfil de candidato para Crown Point Energía y asignale un score de 0 a 100 según su potencial fit con la empresa.

POSICIONES ABIERTAS:
${openPositions}

PERFIL DEL CANDIDATO:
${candidateProfile}

Considerá para el score:
- Relevancia del área de interés con las posiciones abiertas (40%)
- Nivel de experiencia y estudios para una empresa de O&G (30%)
- Disponibilidad y flexibilidad (relocation, inicio inmediato) (20%)
- Idiomas y perfil global (10%)

Respondé EXACTAMENTE en este formato JSON (sin markdown, sin explicaciones extra):
{
  "score": <número entre 0 y 100>,
  "resumen": "<2-3 oraciones en español argentino describiendo el perfil, sus fortalezas y fit con Crown Point>"
}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()

    let score: number
    let resumen: string

    try {
      const parsed = JSON.parse(raw)
      score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))))
      resumen = String(parsed.resumen ?? '').trim()
    } catch {
      // Fallback: extract score from text
      const match = raw.match(/"score"\s*:\s*(\d+)/)
      score = match ? Math.min(100, parseInt(match[1])) : 50
      resumen = raw.replace(/\{[\s\S]*\}/g, '').trim() || raw
    }

    // Persist result
    await db.from('job_applications').update({
      score,
      ai_summary: resumen,
      ai_analyzed_at: new Date().toISOString(),
    }).eq('id', id)

    return NextResponse.json({ score, resumen })
  } catch (err) {
    console.error('ATS analysis error:', err)
    return NextResponse.json({ error: 'Error al analizar con IA' }, { status: 500 })
  }
}
