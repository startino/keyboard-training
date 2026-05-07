import { describe, it, expect } from 'bun:test'
import { sparklineValues, toPolylinePoints } from './sparklineHelpers'
import type { SessionStats } from '../stats'

function makeSession(overrides: Partial<SessionStats> = {}): SessionStats {
  return {
    timestamp: Date.now(),
    wpm: 50,
    accuracy: 95,
    duration: 60,
    errorCount: 2,
    drillId: 'chat',
    ...overrides,
  }
}

describe('sparklineValues', () => {
  it('returns wpm for non-flashcard drills', () => {
    const sessions = [makeSession({ wpm: 60 }), makeSession({ wpm: 40 })]
    // sessions stored newest-first → reversed to oldest-first
    const values = sparklineValues(sessions, 'chat')
    expect(values).toEqual([40, 60])
  })

  it('returns accuracy for flashcard drill', () => {
    const sessions = [
      makeSession({ drillId: 'flashcards', wpm: 0, accuracy: 90 }),
      makeSession({ drillId: 'flashcards', wpm: 0, accuracy: 80 }),
    ]
    const values = sparklineValues(sessions, 'flashcards')
    expect(values).toEqual([80, 90])
  })

  it('returns accuracy when wpm is 0 even on non-flashcard drills', () => {
    const sessions = [makeSession({ wpm: 0, accuracy: 85 })]
    const values = sparklineValues(sessions, 'chat')
    expect(values).toEqual([85])
  })

  it('returns empty array for empty sessions', () => {
    expect(sparklineValues([], 'chat')).toEqual([])
  })
})

describe('toPolylinePoints', () => {
  it('returns null for fewer than 2 data points', () => {
    expect(toPolylinePoints([], 80, 24)).toBeNull()
    expect(toPolylinePoints([50], 80, 24)).toBeNull()
  })

  it('returns a string for 2+ data points', () => {
    const result = toPolylinePoints([40, 60], 80, 24)
    expect(typeof result).toBe('string')
  })

  it('first point x is 0, last point x equals width', () => {
    const result = toPolylinePoints([30, 50, 70], 80, 24)
    expect(result).not.toBeNull()
    const points = result!.trim().split(' ')
    const firstX = parseFloat(points[0].split(',')[0])
    const lastX = parseFloat(points[points.length - 1].split(',')[0])
    expect(firstX).toBe(0)
    expect(lastX).toBe(80)
  })

  it('higher value maps to lower y (SVG top = 0)', () => {
    const result = toPolylinePoints([10, 90], 80, 24)
    expect(result).not.toBeNull()
    const [first, last] = result!.trim().split(' ').map((p) => {
      const [x, y] = p.split(',').map(Number)
      return { x, y }
    })
    // first value (10) should have higher y than last value (90)
    expect(first.y).toBeGreaterThan(last.y)
  })

  it('all-equal values produce flat line (no NaN)', () => {
    const result = toPolylinePoints([50, 50, 50], 80, 24)
    expect(result).not.toBeNull()
    expect(result).not.toContain('NaN')
  })
})
