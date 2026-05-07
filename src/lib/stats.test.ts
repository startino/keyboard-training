/**
 * Unit tests for stats module (session history persistence).
 * Run with: bun test
 */
import { describe, it, expect, beforeEach } from 'bun:test'
import {
  saveSession,
  getSessions,
  getLastSession,
  clearStats,
  resetSessions,
  type SessionStats,
} from './stats'

// ---------------------------------------------------------------------------
// localStorage stub
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
function makeSession(drillId: string, wpm = 50): SessionStats {
  return {
    timestamp: Date.now(),
    wpm,
    accuracy: 95,
    duration: 60,
    errorCount: 3,
    drillId,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('saveSession / getSessions', () => {
  beforeEach(() => localStorageMap.clear())

  it('returns empty array when nothing stored', () => {
    expect(getSessions('flashcards')).toEqual([])
  })

  it('stores and retrieves a session', () => {
    const s = makeSession('flashcards', 42)
    saveSession(s)
    const result = getSessions('flashcards')
    expect(result).toHaveLength(1)
    expect(result[0].wpm).toBe(42)
  })

  it('prepends new sessions (most recent first)', () => {
    saveSession(makeSession('flashcards', 30))
    saveSession(makeSession('flashcards', 60))
    const result = getSessions('flashcards')
    expect(result[0].wpm).toBe(60)
    expect(result[1].wpm).toBe(30)
  })

  it('isolates sessions by drillId', () => {
    saveSession(makeSession('flashcards', 50))
    saveSession(makeSession('thumbs', 40))
    expect(getSessions('flashcards')).toHaveLength(1)
    expect(getSessions('chat')).toHaveLength(0)
  })
})

describe('getLastSession', () => {
  beforeEach(() => localStorageMap.clear())

  it('returns null when no sessions stored', () => {
    expect(getLastSession('flashcards')).toBeNull()
  })

  it('returns the most recently saved session', () => {
    saveSession(makeSession('flashcards', 55))
    saveSession(makeSession('flashcards', 70))
    expect(getLastSession('flashcards')?.wpm).toBe(70)
  })
})

describe('resetSessions', () => {
  beforeEach(() => localStorageMap.clear())

  it('clears all drill session history from localStorage', () => {
    saveSession(makeSession('flashcards', 50))
    saveSession(makeSession('thumbs', 45))
    saveSession(makeSession('chat', 60))
    resetSessions()
    expect(getSessions('flashcards')).toEqual([])
    expect(getSessions('thumbs')).toEqual([])
    expect(getSessions('chat')).toEqual([])
  })

  it('getLastSession returns null after resetSessions', () => {
    saveSession(makeSession('flashcards', 50))
    resetSessions()
    expect(getLastSession('flashcards')).toBeNull()
  })

  it('new sessions can be saved after reset', () => {
    saveSession(makeSession('flashcards', 50))
    resetSessions()
    saveSession(makeSession('flashcards', 80))
    expect(getSessions('flashcards')).toHaveLength(1)
    expect(getSessions('flashcards')[0].wpm).toBe(80)
  })
})

describe('clearStats', () => {
  beforeEach(() => localStorageMap.clear())

  it('clears a specific drill when drillId provided', () => {
    saveSession(makeSession('flashcards', 50))
    saveSession(makeSession('thumbs', 40))
    clearStats('flashcards')
    expect(getSessions('flashcards')).toEqual([])
    expect(getSessions('thumbs')).toHaveLength(1)
  })

  it('clears all drills when called without argument', () => {
    saveSession(makeSession('flashcards', 50))
    saveSession(makeSession('thumbs', 40))
    saveSession(makeSession('chat', 60))
    clearStats()
    expect(getSessions('flashcards')).toEqual([])
    expect(getSessions('thumbs')).toEqual([])
    expect(getSessions('chat')).toEqual([])
  })
})
