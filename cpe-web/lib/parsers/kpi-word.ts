import mammoth from 'mammoth'

export interface KpiWordExtracted {
  // Drilling plan
  wellsPlannedTotal: number        // sum across all concessions
  wellsBreakdown: WellsArea[]      // per-area detail
  capitalBudgetUSD: number         // total fiscal year capex budget
  // Narrative period confirmation
  periodText: string               // e.g. "Q1 2026"
}

export interface WellsArea {
  area: string
  wells: number
  capexUSD: number
}

// ---------------------------------------------------------------------------

function extractNumber(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern)
  if (!m) return null
  const raw = m[1].replace(/,/g, '')
  const n = parseFloat(raw)
  return isFinite(n) ? n : null
}

// ---------------------------------------------------------------------------

export async function parseKpiWord(buffer: Buffer | ArrayBuffer): Promise<KpiWordExtracted> {
  const buf = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer

  const { value: text } = await mammoth.extractRawText({ buffer: buf })

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const full  = lines.join(' ')

  // --- Capital budget total ---
  // "capital spending on developed and producing assets for fiscal 2026 is budgeted at approximately $76.2 million"
  const budgetM = extractNumber(full, /budgeted at approximately \$?([\d,.]+)\s*million/i)
  const capitalBudgetUSD = budgetM ? budgetM * 1_000_000 : 0

  // --- Drilling wells by area ---
  // Pattern: "comprised of N wells" preceded by concession name context
  // We scan paragraph-level context from the raw text
  const wellsBreakdown: WellsArea[] = []

  for (const line of lines) {
    const ll = line.toLowerCase()
    // Match: "$X million in the <Area> Concessions ... drilling campaign comprised of N wells"
    // or spread across nearby lines — we work on the full text instead
    if (ll.includes('drilling campaign') || ll.includes('comprised of') && ll.includes('well')) {
      const wellCount = extractNumber(line, /comprised of (\d+)\s+wells?/i)
      if (wellCount === null) continue

      // Identify area from same sentence or nearby text
      let area = 'Other'
      if (/santa\s*cruz/i.test(line)) area = 'Santa Cruz'
      else if (/chubut/i.test(line)) area = 'Chubut'
      else if (/tdf|tierra\s*del\s*fuego/i.test(line)) area = 'TDF'
      else if (/mendoza/i.test(line)) area = 'Mendoza'
      else if (/neuqu[eé]n/i.test(line)) area = 'Neuquén'

      const capexM = extractNumber(line, /\$([\d,.]+)\s*million.*?drilling/i)
                  ?? extractNumber(line, /drilling.*?\$([\d,.]+)\s*million/i)
      const capexUSD = capexM ? capexM * 1_000_000 : 0

      wellsBreakdown.push({ area, wells: wellCount, capexUSD })
    }
  }

  // Also scan the full text for sentences with drilling info spanning multiple lines
  if (wellsBreakdown.length === 0) {
    const segments = full.split(/(?<=wells?\.)\s+/i)
    for (const seg of segments) {
      const wellCount = extractNumber(seg, /comprised of (\d+)\s+wells?/i)
      if (wellCount === null) continue
      let area = 'Other'
      if (/santa\s*cruz/i.test(seg)) area = 'Santa Cruz'
      else if (/chubut/i.test(seg)) area = 'Chubut'
      else if (/tdf|tierra\s*del\s*fuego/i.test(seg)) area = 'TDF'
      else if (/mendoza/i.test(seg)) area = 'Mendoza'
      const capexM = extractNumber(seg, /\$([\d,.]+)\s*million.*?drilling/i)
                  ?? extractNumber(seg, /drilling.*?\$([\d,.]+)\s*million/i)
      wellsBreakdown.push({ area, wells: wellCount, capexUSD: capexM ? capexM * 1_000_000 : 0 })
    }
  }

  const wellsPlannedTotal = wellsBreakdown.reduce((s, w) => s + w.wells, 0)

  // --- Period from document header ---
  // "For the three months ended March 31, 2026"
  const periodM = full.match(/three months ended\s+([\w]+\s+\d{1,2},?\s*\d{4})/i)
  const periodText = periodM ? periodM[1].trim() : ''

  return {
    wellsPlannedTotal,
    wellsBreakdown,
    capitalBudgetUSD,
    periodText,
  }
}
