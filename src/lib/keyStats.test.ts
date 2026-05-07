/**
 * Unit tests for keyStats pure module.
 * Run with: bun test
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import {
  loadKeyStats,
  saveKeyStats,
  recordKeystroke,
  weakestKeys,
  weaknessScore,
  clearKeyStats,
  type KeyStatsStore,
  type KeyStat,
} from './keyStats'

// ---------------------------------------------------------------------------
// localStorage stub (bun/jsdom does not provide localStorage in non-browser env)
// ---------------------------------------------------------------------------
const localStorageMap = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => localStorageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { localStorageMap.set(key, value) },
  removeItem: (key: string) => { localStorageMap.delete(key) },
  clear: () => { localStorageMap.clear() },
}

// @ts-ignore
global.localStorage = localStorageMock

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function emptyStore(): KeyStatsStore {
  return { byChar: {}, totalAttempts: 0, updatedMs: Date.now() }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loadKeyStats', () => {
  beforeEach(() => localStorageMap.clear())

  it('returns empty store when nothing stored', () => {
    const s = loadKeyStats()
    expect(s.byChar).toEqual({})
    expect(s.totalAttempts).toBe(0)
  })

  it('returns empty store on corrupt JSON', () => {
    localStorageMap.set('kbd-training:keystats', 'not-json{{{')
    const s = loadKeyStats()
    expect(s.byChar).toEqual({})
  })

  it('returns stored data on valid JSON', () => {
    const store: KeyStatsStore = { byChar: {}, totalAttempts: 5, updatedMs: 0 }
    localStorageMap.set('kbd-training:keystats', JSON.stringify(store))
    const s = loadKeyStats()
    expect(s.totalAttempts).toBe(5)
  })
})

describe('saveKeyStats', () => {
  beforeEach(() => localStorageMap.clear())

  it('persists to localStorage', () => {
    const store: KeyStatsStore = { byChar: {}, totalAttempts: 3, updatedMs: 0 }
    saveKeyStats(store)
    const raw = localStorageMap.get('kbd-training:keystats')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.totalAttempts).toBe(3)
  })
})

describe('recordKeystroke', () => {
  it('is immutable — original store unchanged', () => {
    const original = emptyStore()
    const next = recordKeystroke(original, 'a', true, 150)
    expect(original.totalAttempts).toBe(0)
    expect(Object.keys(original.byChar)).toHaveLength(0)
    expect(next.totalAttempts).toBe(1)
  })

  it('increments totalAttempts', () => {
    let s = emptyStore()
    s = recordKeystroke(s, 'a', true, 200)
    s = recordKeystroke(s, 'a', false)
    expect(s.totalAttempts).toBe(2)
  })

  it('increments errors only on wrong', () => {
    let s = emptyStore()
    s = recordKeystroke(s, 'b', true, 200)
    s = recordKeystroke(s, 'b', false)
    expect(s.byChar['b'].errors).toBe(1)
    expect(s.byChar['b'].attempts).toBe(2)
  })

  it('EWMA error rate converges upward on repeated errors', () => {
    let s = emptyStore()
    // 20 wrong strokes — errorRateEwma should be close to 1
    for (let i = 0; i < 30; i++) {
      s = recordKeystroke(s, 'x', false)
    }
    expect(s.byChar['x'].errorRateEwma).toBeGreaterThan(0.9)
  })

  it('EWMA error rate converges toward 0 on repeated correct strokes', () => {
    let s = emptyStore()
    // Seed with some errors first
    for (let i = 0; i < 5; i++) s = recordKeystroke(s, 'y', false)
    // Then many correct strokes
    for (let i = 0; i < 50; i++) s = recordKeystroke(s, 'y', true, 150)
    expect(s.byChar['y'].errorRateEwma).toBeLessThan(0.1)
  })

  it('only updates latencyEwma on correct strokes', () => {
    let s = emptyStore()
    // Correct stroke sets initial latency
    s = recordKeystroke(s, 'z', true, 100)
    const latencyAfterCorrect = s.byChar['z'].latencyEwmaMs
    // Wrong stroke should not change latency
    s = recordKeystroke(s, 'z', false, 999)
    expect(s.byChar['z'].latencyEwmaMs).toBe(latencyAfterCorrect)
  })

  it('EWMA latency converges toward fast times', () => {
    let s = emptyStore()
    // Start slow
    for (let i = 0; i < 5; i++) s = recordKeystroke(s, 'q', true, 800)
    // Then many fast strokes
    for (let i = 0; i < 50; i++) s = recordKeystroke(s, 'q', true, 100)
    expect(s.byChar['q'].latencyEwmaMs).toBeLessThan(200)
  })
})

describe('weakestKeys', () => {
  function makeStore(entries: Array<Partial<KeyStat> & { char: string }>): KeyStatsStore {
    const byChar: Record<string, KeyStat> = {}
    for (const e of entries) {
      byChar[e.char] = {
        char: e.char,
        attempts: e.attempts ?? 10,
        errors: e.errors ?? 0,
        errorRateEwma: e.errorRateEwma ?? 0,
        latencyEwmaMs: e.latencyEwmaMs ?? 200,
        lastAttemptMs: e.lastAttemptMs ?? Date.now(),
      }
    }
    return { byChar, totalAttempts: 0, updatedMs: Date.now() }
  }

  it('filters keys below minAttempts', () => {
    const store = makeStore([
      { char: 'a', attempts: 5, errorRateEwma: 0.9 },  // below threshold
      { char: 'b', attempts: 10, errorRateEwma: 0.1 },
    ])
    const result = weakestKeys(store, 5, 10)
    expect(result.map(k => k.char)).not.toContain('a')
    expect(result.map(k => k.char)).toContain('b')
  })

  it('returns keys ranked by weakness (highest first)', () => {
    const store = makeStore([
      { char: 'a', errorRateEwma: 0.05 },
      { char: 'b', errorRateEwma: 0.5 },
      { char: 'c', errorRateEwma: 0.2 },
    ])
    const result = weakestKeys(store, 5, 10)
    expect(result[0].char).toBe('b')
    expect(result[1].char).toBe('c')
    expect(result[2].char).toBe('a')
  })

  it('limits to requested count', () => {
    const store = makeStore([
      { char: 'a', errorRateEwma: 0.1 },
      { char: 'b', errorRateEwma: 0.2 },
      { char: 'c', errorRateEwma: 0.3 },
      { char: 'd', errorRateEwma: 0.4 },
      { char: 'e', errorRateEwma: 0.5 },
      { char: 'f', errorRateEwma: 0.6 },
    ])
    const result = weakestKeys(store, 3, 10)
    expect(result).toHaveLength(3)
  })

  it('returns empty array when no key meets minAttempts', () => {
    const store = makeStore([{ char: 'a', attempts: 2 }])
    expect(weakestKeys(store, 5, 10)).toHaveLength(0)
  })
})

describe('clearKeyStats', () => {
  beforeEach(() => localStorageMap.clear())

  it('returns an empty store', () => {
    const store = clearKeyStats()
    expect(store.byChar).toEqual({})
    expect(store.totalAttempts).toBe(0)
  })

  it('removes the localStorage key', () => {
    const store: KeyStatsStore = { byChar: {}, totalAttempts: 7, updatedMs: 0 }
    saveKeyStats(store)
    expect(localStorageMap.has('kbd-training:keystats')).toBe(true)
    clearKeyStats()
    expect(localStorageMap.has('kbd-training:keystats')).toBe(false)
  })

  it('subsequent loadKeyStats returns empty store after clearKeyStats', () => {
    let s: KeyStatsStore = { byChar: {}, totalAttempts: 0, updatedMs: 0 }
    s = recordKeystroke(s, 'a', true, 100)
    saveKeyStats(s)
    clearKeyStats()
    const reloaded = loadKeyStats()
    expect(reloaded.totalAttempts).toBe(0)
    expect(reloaded.byChar).toEqual({})
  })
})

describe('weaknessScore', () => {
  function makeStat(errorRateEwma: number, latencyEwmaMs: number): KeyStat {
    return {
      char: 'x',
      attempts: 10,
      errors: 0,
      errorRateEwma,
      latencyEwmaMs,
      lastAttemptMs: Date.now(),
    }
  }

  it('higher error rate → higher score (monotone)', () => {
    const low = weaknessScore(makeStat(0.1, 200))
    const high = weaknessScore(makeStat(0.5, 200))
    expect(high).toBeGreaterThan(low)
  })

  it('higher latency → higher score (monotone)', () => {
    const fast = weaknessScore(makeStat(0.1, 150))
    const slow = weaknessScore(makeStat(0.1, 600))
    expect(slow).toBeGreaterThan(fast)
  })

  it('latency below baseline does not penalize', () => {
    const atBaseline = weaknessScore(makeStat(0.1, 200))
    const belowBaseline = weaknessScore(makeStat(0.1, 50))
    expect(belowBaseline).toBe(atBaseline)
  })

  it('zero error rate and fast latency → near-zero score', () => {
    expect(weaknessScore(makeStat(0, 100))).toBe(0)
  })
})
