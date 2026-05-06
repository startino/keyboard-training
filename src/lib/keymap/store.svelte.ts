import { parseKeymap } from './parser'
import type { ParsedKeymap } from './types'
import defaultKeymapRaw from './default.keymap?raw'

const STORAGE_KEY = 'kbd-training:keymap'

function tryParseDefault(): ParsedKeymap {
  return parseKeymap(defaultKeymapRaw)
}

function loadInitial(): { keymap: ParsedKeymap; name: string; raw: string } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = parseKeymap(stored)
      return { keymap: parsed, name: 'Uploaded keymap', raw: stored }
    }
  } catch {
    // fall through to default
  }
  return { keymap: tryParseDefault(), name: 'Default (eksno corne)', raw: defaultKeymapRaw }
}

const initial = loadInitial()

let keymap = $state<ParsedKeymap>(initial.keymap)
let keymapName = $state<string>(initial.name)
let keymapRaw = $state<string>(initial.raw)
let error = $state<string | null>(null)

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
    } catch {
      // storage full
    }
    return true
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to parse keymap'
    return false
  }
}

export function reset(): void {
  keymap = tryParseDefault()
  keymapName = 'Default (eksno corne)'
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
