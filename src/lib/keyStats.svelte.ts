/**
 * Svelte 5 reactive wrapper around the pure keyStats module.
 * Mirrors the pattern of src/lib/keymap/store.svelte.ts.
 */
import {
  loadKeyStats,
  saveKeyStats,
  recordKeystroke as recordKeystrokePure,
  weakestKeys as weakestKeysPure,
  clearKeyStats,
  type KeyStatsStore,
  type KeyStat,
} from './keyStats'

let store = $state<KeyStatsStore>(loadKeyStats())

export function getKeyStats(): KeyStatsStore {
  return store
}

/** Record a keystroke attempt and persist. */
export function recordKeystroke(char: string, correct: boolean, latencyMs?: number): void {
  store = recordKeystrokePure(store, char, correct, latencyMs)
  saveKeyStats(store)
}

/** Reactive top-N weakest keys (re-evaluates whenever store changes). */
export function getWeakestKeys(limit = 5, minAttempts = 10): KeyStat[] {
  return weakestKeysPure(store, limit, minAttempts)
}

/** Clear all keystats from localStorage and zero the in-memory reactive store. */
export function resetKeyStats(): void {
  store = clearKeyStats()
}
