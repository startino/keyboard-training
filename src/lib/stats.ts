export interface SessionStats {
  timestamp: number
  wpm: number
  accuracy: number
  duration: number
  errorCount: number
  drillId: string
  extraStats?: Record<string, string | number>
}

const MAX_PER_DRILL = 20

function storageKey(drillId: string): string {
  return `kbd-training:stats:${drillId}`
}

export function saveSession(stats: SessionStats): void {
  const key = storageKey(stats.drillId)
  const existing = getSessions(stats.drillId)
  existing.unshift(stats)
  const capped = existing.slice(0, MAX_PER_DRILL)
  try {
    localStorage.setItem(key, JSON.stringify(capped))
  } catch {
    // localStorage might be full or unavailable
  }
}

export function getSessions(drillId: string): SessionStats[] {
  const key = storageKey(drillId)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SessionStats[]
    return parsed.slice(0, MAX_PER_DRILL)
  } catch {
    return []
  }
}

export function clearStats(drillId?: string): void {
  try {
    if (drillId) {
      localStorage.removeItem(storageKey(drillId))
    } else {
      // Clear all drill stats
      const drillIds = ['flashcards', 'thumbs', 'chat']
      for (const id of drillIds) {
        localStorage.removeItem(storageKey(id))
      }
    }
  } catch {
    // ignore
  }
}

export function getLastSession(drillId: string): SessionStats | null {
  const sessions = getSessions(drillId)
  return sessions.length > 0 ? sessions[0] : null
}
