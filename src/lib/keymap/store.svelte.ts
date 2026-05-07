import { parseKeymap } from './parser'
import type { ParsedKeymap } from './types'
import defaultKeymapRaw from './default.keymap?raw'

const STORAGE_KEY = 'kbd-training:keymap'

function tryParseDefault(): ParsedKeymap {
  return parseKeymap(defaultKeymapRaw)
}

let loadError: string | null = null

function loadInitial(): { keymap: ParsedKeymap; name: string; raw: string } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = parseKeymap(stored)
      return { keymap: parsed, name: 'Uploaded keymap', raw: stored }
    }
  } catch (e) {
    const msg = 'Stored keymap was corrupt — reset to default'
    console.warn('[keymap store]', msg, e)
    loadError = msg
    // fall through to default
  }
  return { keymap: tryParseDefault(), name: 'Default (Toucan)', raw: defaultKeymapRaw }
}

const initial = loadInitial()

let keymap = $state<ParsedKeymap>(initial.keymap)
let keymapName = $state<string>(initial.name)
let keymapRaw = $state<string>(initial.raw)
// Reflects corrupt-stored-keymap warning from loadInitial, or parse errors
// from loadFromString. Cleared on successful load or explicit clearError().
let error = $state<string | null>(loadError)

export function getKeymap(): ParsedKeymap {
  return keymap
}

export function getKeymapName(): string {
  return keymapName
}

export function getKeymapRaw(): string {
  return keymapRaw
}

export function getError(): string | null {
  return error
}

export function loadFromString(raw: string, filename?: string): boolean {
  try {
    const parsed = parseKeymap(raw)
    keymap = parsed
    keymapName = filename ?? 'Uploaded keymap'
    keymapRaw = raw
    error = null
    try {
      localStorage.setItem(STORAGE_KEY, raw)
    } catch (e) {
      console.warn('[keymap store] localStorage full — keymap loaded in memory but not persisted', e)
    }
    return true
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to parse keymap'
    return false
  }
}

export function reset(): void {
  keymap = tryParseDefault()
  keymapName = 'Default (Toucan)'
  keymapRaw = defaultKeymapRaw
  error = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function clearError(): void {
  error = null
}
