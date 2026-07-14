const CCL_URL = 'https://api.matbarofex.com.ar/v2/symbol/I.CCL'

export type CclData = {
  indexValue: number
  closeIndexValue: number
  mdEntryDateTime: string
}

export async function fetchCclRate(): Promise<CclData | null> {
  try {
    const res = await fetch(CCL_URL, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      indexValue: data.indexValue,
      closeIndexValue: data.closeIndexValue ?? data.indexValue,
      mdEntryDateTime: data.mdEntryDateTime ?? '',
    }
  } catch {
    return null
  }
}
