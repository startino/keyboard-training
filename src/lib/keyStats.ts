/**
 * Per-key EWMA stats — pure module, no Svelte runes.
 * Persisted to localStorage under kbd-training:keystats.
 */

const STORAGE_KEY = 'kbd-training:keystats'
const EWMA_ALPHA = 0.1
const LATENCY_BASELINE_MS = 200

export interface KeyStat {
  char: string
  attempts: number
  errors: number
  errorRateEwma: number   // 0..1
  latencyEwmaMs: number   // ms, only updated on correct strokes
  lastAttemptMs: number   // Date.now() of last attempt
}

export interface KeyStatsStore {
  byChar: Record<string, KeyStat>
  totalAttempts: number
  updatedMs: number
}

function emptyStore(): KeyStatsStore {
  return { byChar: {}, totalAttempts: 0, updatedMs: Date.now() }
}

export function loadKeyStats(): KeyStatsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as KeyStatsStore
    if (!parsed || typeof parsed !== 'object' || !parsed.byChar) return emptyStore()
    return parsed
  } catch {
    return emptyStore()
  }
}

export function saveKeyStats(store: KeyStatsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (e) {
    console.warn('[keyStats] localStorage quota exceeded — stats not persisted', e)
  }
}

/**
 * Pure function — returns a NEW store with the keystroke recorded.
 * Does not mutate the input.
 */
export function recordKeystroke(
  store: KeyStatsStore,
  char: string,
  correct: boolean,
  latencyMs?: number,
): KeyStatsStore {
  const now = Date.now()
  const existing: KeyStat = store.byChar[char] ?? {
    char,
    attempts: 0,
    errors: 0,
    errorRateEwma: 0,
    latencyEwmaMs: latencyMs ?? LATENCY_BASELINE_MS,
    lastAttemptMs: now,
  }

  const errorSample = correct ? 0 : 1
  const newErrorRateEwma =
    EWMA_ALPHA * errorSample + (1 - EWMA_ALPHA) * existing.errorRateEwma

  // Only update latency EWMA on correct strokes when a latency is provided
  const newLatencyEwmaMs =
    correct && latencyMs !== undefined
      ? EWMA_ALPHA * latencyMs + (1 - EWMA_ALPHA) * existing.latencyEwmaMs
      : existing.latencyEwmaMs

  const updated: KeyStat = {
    char,
    attempts: existing.attempts + 1,
    errors: existing.errors + (correct ? 0 : 1),
    errorRateEwma: newErrorRateEwma,
    latencyEwmaMs: newLatencyEwmaMs,
    lastAttemptMs: now,
  }

  return {
    byChar: { ...store.byChar, [char]: updated },
    totalAttempts: store.totalAttempts + 1,
    updatedMs: now,
  }
}

/**
 * Weakness score: primarily error rate, boosted by latency above baseline.
 * Returns a value in roughly 0..1+ range.
 */
export function weaknessScore(stat: KeyStat): number {
  const latencyBoost = Math.max(0, stat.latencyEwmaMs - LATENCY_BASELINE_MS) / 1000
  return stat.errorRateEwma + 0.1 * latencyBoost
}

/**
 * Returns up to `limit` keys ranked by weakness, filtered to those with
 * at least `minAttempts` attempts (so noisy 1-2 attempt entries don't surface).
 */
export function weakestKeys(
  store: KeyStatsStore,
  limit = 5,
  minAttempts = 10,
): KeyStat[] {
  return Object.values(store.byChar)
    .filter((s) => s.attempts >= minAttempts)
    .sort((a, b) => weaknessScore(b) - weaknessScore(a))
    .slice(0, limit)
}

/** Remove all keystats from localStorage and return a fresh empty store. */
export function clearKeyStats(): KeyStatsStore {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  return emptyStore()
}
