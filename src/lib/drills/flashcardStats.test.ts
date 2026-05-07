import { describe, it, expect, vi } from 'vitest'
import { computeFlashcardStats } from './flashcardStats'

describe('computeFlashcardStats', () => {
  it('returns 100% accuracy when no errors', () => {
    const now = Date.now()
    const result = computeFlashcardStats({
      latencies: [{ char: 'a', layerName: 'home', ms: 400 }],
      totalCards: 10,
      errorCount: 0,
      startTime: now - 5000,
    })
    expect(result.accuracy).toBe(100)
    expect(result.errorCount).toBe(0)
  })

  it('computes accuracy proportional to errors', () => {
    const now = Date.now()
    const result = computeFlashcardStats({
      latencies: [],
      totalCards: 10,
      errorCount: 2,
      startTime: now - 5000,
    })
    expect(result.accuracy).toBeCloseTo(80)
  })

  it('computes median latency per layer', () => {
    const now = Date.now()
    const result = computeFlashcardStats({
      latencies: [
        { char: 'a', layerName: 'home', ms: 200 },
        { char: 'b', layerName: 'home', ms: 400 },
        { char: 'c', layerName: 'home', ms: 600 },
      ],
      totalCards: 3,
      errorCount: 0,
      startTime: now - 3000,
    })
    // median of [200, 400, 600] sorted = index 1 = 400
    expect(result.extraStatsRecord['home median']).toBe('400ms')
  })

  it('lists slowest 3 chars', () => {
    const now = Date.now()
    const result = computeFlashcardStats({
      latencies: [
        { char: 'a', layerName: 'home', ms: 100 },
        { char: 'b', layerName: 'home', ms: 900 },
        { char: 'c', layerName: 'home', ms: 500 },
        { char: 'd', layerName: 'home', ms: 300 },
      ],
      totalCards: 4,
      errorCount: 0,
      startTime: now - 4000,
    })
    const slow = result.extraStatsList.filter((s) => s.label.startsWith('slowest:'))
    expect(slow).toHaveLength(3)
    expect(slow[0].label).toBe('slowest: b')
  })

  it('extraStatsList and extraStatsRecord are consistent for errors', () => {
    const now = Date.now()
    const result = computeFlashcardStats({
      latencies: [],
      totalCards: 5,
      errorCount: 3,
      startTime: now - 2000,
    })
    expect(result.extraStatsRecord['errors']).toBe(3)
    const errItem = result.extraStatsList.find((s) => s.label === 'errors')
    expect(errItem?.value).toBe('3')
  })

  it('returns 100% accuracy when totalCards is 0', () => {
    const now = Date.now()
    const result = computeFlashcardStats({
      latencies: [],
      totalCards: 0,
      errorCount: 0,
      startTime: now - 1000,
    })
    expect(result.accuracy).toBe(100)
  })

  it('clamps accuracy to 0 when errorCount exceeds totalCards', () => {
    const now = Date.now()
    const result = computeFlashcardStats({
      latencies: [],
      totalCards: 10,
      errorCount: 23,
      startTime: now - 5000,
    })
    expect(result.accuracy).toBe(0)
  })

  it('produces exactly 100% accuracy for a perfect session', () => {
    const now = Date.now()
    const result = computeFlashcardStats({
      latencies: [
        { char: 'a', layerName: 'home', ms: 300 },
        { char: 'b', layerName: 'home', ms: 350 },
      ],
      totalCards: 2,
      errorCount: 0,
      startTime: now - 2000,
    })
    expect(result.accuracy).toBe(100)
  })

  it('never returns accuracy below 0', () => {
    const now = Date.now()
    const result = computeFlashcardStats({
      latencies: [],
      totalCards: 5,
      errorCount: 999,
      startTime: now - 1000,
    })
    expect(result.accuracy).toBeGreaterThanOrEqual(0)
  })
})
