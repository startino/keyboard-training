export interface LatencyEntry {
  char: string
  layerName: string
  ms: number
}

export interface FlashcardStats {
  accuracy: number
  duration: number
  errorCount: number
  /** Flat list for StatsPanel: label + formatted value */
  extraStatsList: { label: string; value: string }[]
  /** Record form for saveSession's extraStats */
  extraStatsRecord: Record<string, string | number>
}

export function computeFlashcardStats(opts: {
  latencies: LatencyEntry[]
  totalCards: number
  errorCount: number
  startTime: number
}): FlashcardStats {
  const { latencies, totalCards, errorCount, startTime } = opts
  const duration = (Date.now() - startTime) / 1000
  const rawAccuracy = totalCards > 0 ? ((totalCards - errorCount) / totalCards) * 100 : 100
  const accuracy = Math.max(0, Math.min(100, rawAccuracy))

  const layerLatencies = new Map<string, number[]>()
  const charLatencies = new Map<string, number[]>()

  for (const l of latencies) {
    const layerArr = layerLatencies.get(l.layerName) ?? []
    layerArr.push(l.ms)
    layerLatencies.set(l.layerName, layerArr)

    const charArr = charLatencies.get(l.char) ?? []
    charArr.push(l.ms)
    charLatencies.set(l.char, charArr)
  }

  const extraStatsRecord: Record<string, string | number> = {}
  const extraStatsList: { label: string; value: string }[] = []

  // Median latency per layer
  for (const [layer, times] of layerLatencies) {
    times.sort((a, b) => a - b)
    const median = times[Math.floor(times.length / 2)]
    const formatted = `${Math.round(median)}ms`
    extraStatsRecord[`${layer} median`] = formatted
    extraStatsList.push({ label: `${layer} median`, value: formatted })
  }

  // Error count
  extraStatsRecord['errors'] = errorCount
  extraStatsList.push({ label: 'errors', value: String(errorCount) })

  // Slowest 3 characters
  const avgByChar: { char: string; avg: number }[] = []
  for (const [char, times] of charLatencies) {
    const avg = times.reduce((s, t) => s + t, 0) / times.length
    avgByChar.push({ char, avg })
  }
  avgByChar.sort((a, b) => b.avg - a.avg)
  const slowest3 = avgByChar.slice(0, 3)
  extraStatsRecord['slowest chars'] = slowest3.map((c) => `${c.char} (${Math.round(c.avg)}ms)`).join(', ')
  for (const s of slowest3) {
    extraStatsList.push({ label: `slowest: ${s.char}`, value: `${Math.round(s.avg)}ms` })
  }

  return { accuracy, duration, errorCount, extraStatsList, extraStatsRecord }
}
