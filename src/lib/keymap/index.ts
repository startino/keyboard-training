import { parseKeymap } from './parser'
import type { ParsedKeymap } from './types'
import defaultKeymapRaw from './default.keymap?raw'

export type { ParsedKeymap } from './types'
export { parseKeymap } from './parser'

export function loadKeymap(): ParsedKeymap {
  return parseKeymap(defaultKeymapRaw)
}

export function loadKeymapFromString(raw: string): ParsedKeymap {
  return parseKeymap(raw)
}
