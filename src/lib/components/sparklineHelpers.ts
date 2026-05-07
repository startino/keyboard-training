import type { SessionStats } from '../stats'

/**
 * Extract the relevant metric per session.
 * Flashcards (wpm === 0 or drillId === 'flashcards') uses accuracy; others use wpm.
 * Sessions are expected newest-first (as stored); we reverse to oldest-first for display.
 */
export function sparklineValues(sessions: SessionStats[], drillId: string): number[] {
  const ordered = [...sessions].reverse()
  return ordered.map((s) => (drillId === 'flashcards' || s.wpm === 0 ? s.accuracy : s.wpm))
}

/**
 * Convert an array of values into an SVG polyline points string.
 * Returns null if fewer than 2 data points.
 */
export function toPolylinePoints(values: number[], w: number, h: number): string | null {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1 // avoid divide-by-zero when all values equal

  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      // Flip y: SVG top=0, high values should be at top
      const y = h - ((v - min) / range) * (h - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
