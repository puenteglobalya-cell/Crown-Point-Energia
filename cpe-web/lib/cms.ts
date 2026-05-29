import { createSupabaseServerAdminClient } from './supabase'

export type CMSState = {
  direction: 'corporativo' | 'editorial' | 'industrial'
  theme: 'light' | 'dark'
  lang: 'es' | 'en'
  show: Record<string, boolean>
  fields: Record<string, string>
  fieldsEn: Record<string, string>
  maintenance: boolean
}

const HARD_DEFAULTS: CMSState = {
  direction: 'corporativo',
  theme: 'light',
  lang: 'es',
  show: {},
  fields: {},
  fieldsEn: {},
  maintenance: false,
}

export async function getCmsState(): Promise<CMSState> {
  try {
    const supabase = createSupabaseServerAdminClient()

    const [settingsRes, sectionsRes, fieldsRes] = await Promise.all([
      supabase.from('cms_settings').select('direction,theme,lang,maintenance').eq('id', 1).single(),
      supabase.from('cms_sections').select('key,visible'),
      supabase.from('cms_fields').select('key,value_es,value_en'),
    ])

    const settings = settingsRes.data
    const sections = sectionsRes.data ?? []
    const fields = fieldsRes.data ?? []

    const show: Record<string, boolean> = {}
    for (const s of sections) show[s.key] = s.visible

    const fieldMap: Record<string, string> = {}
    const fieldMapEn: Record<string, string> = {}
    for (const f of fields) {
      fieldMap[f.key] = f.value_es ?? ''
      fieldMapEn[f.key] = f.value_en ?? ''
    }

    return {
      direction: (settings?.direction as CMSState['direction']) ?? HARD_DEFAULTS.direction,
      theme: (settings?.theme as CMSState['theme']) ?? HARD_DEFAULTS.theme,
      lang: (settings?.lang as CMSState['lang']) ?? HARD_DEFAULTS.lang,
      show,
      fields: fieldMap,
      fieldsEn: fieldMapEn,
      maintenance: settings?.maintenance ?? false,
    }
  } catch {
    return HARD_DEFAULTS
  }
}

export async function patchCmsState(patch: Partial<CMSState>): Promise<void> {
  const supabase = createSupabaseServerAdminClient()

  const ops: PromiseLike<unknown>[] = []

  if (patch.direction || patch.theme || patch.lang || patch.maintenance !== undefined) {
    ops.push(
      supabase.from('cms_settings').update({
        ...(patch.direction && { direction: patch.direction }),
        ...(patch.theme && { theme: patch.theme }),
        ...(patch.lang && { lang: patch.lang }),
        ...(patch.maintenance !== undefined && { maintenance: patch.maintenance }),
        updated_at: new Date().toISOString(),
      }).eq('id', 1).then(r => r)
    )
  }

  if (patch.show) {
    const upserts = Object.entries(patch.show).map(([key, visible]) => ({
      key,
      visible,
      updated_at: new Date().toISOString(),
    }))
    if (upserts.length > 0) {
      ops.push(supabase.from('cms_sections').upsert(upserts, { onConflict: 'key' }).then(r => r))
    }
  }

  if (patch.fields || patch.fieldsEn) {
    const keys = new Set([
      ...Object.keys(patch.fields ?? {}),
      ...Object.keys(patch.fieldsEn ?? {}),
    ])
    const upserts = [...keys].map(key => ({
      key,
      ...(patch.fields?.[key] !== undefined ? { value_es: patch.fields[key] } : {}),
      ...(patch.fieldsEn?.[key] !== undefined ? { value_en: patch.fieldsEn[key] } : {}),
      updated_at: new Date().toISOString(),
    }))
    if (upserts.length > 0) {
      ops.push(supabase.from('cms_fields').upsert(upserts, { onConflict: 'key' }).then(r => r))
    }
  }

  await Promise.all(ops)
}
