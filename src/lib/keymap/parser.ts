import type { ParsedKeymap, Layer, Key, ThumbKey, HomeRowMod, Combo } from './types'

/**
 * Finger assignment for a 36-key layout (3 rows x 10 cols + 6 thumbs).
 * Columns: 0=LP, 1=LR, 2=LM, 3=LI, 4=LI, 5=RI, 6=RI, 7=RM, 8=RR, 9=RP
 */
const FINGER_MAP: Record<number, string> = {
  0: 'LP', 1: 'LR', 2: 'LM', 3: 'LI', 4: 'LI',
  5: 'RI', 6: 'RI', 7: 'RM', 8: 'RR', 9: 'RP',
}

const THUMB_FINGERS: Record<number, string> = {
  30: 'LT3', 31: 'LT2', 32: 'LT1',
  33: 'RT1', 34: 'RT2', 35: 'RT3',
}

const MODIFIER_MAP: Record<string, { modifier: string; hand: 'L' | 'R' }> = {
  'LGUI': { modifier: 'GUI', hand: 'L' },
  'LEFT_META': { modifier: 'GUI', hand: 'L' },
  'RGUI': { modifier: 'GUI', hand: 'R' },
  'LALT': { modifier: 'ALT', hand: 'L' },
  'LEFT_ALT': { modifier: 'ALT', hand: 'L' },
  'RALT': { modifier: 'ALT', hand: 'R' },
  'RIGHT_ALT': { modifier: 'ALT', hand: 'R' },
  'LCTRL': { modifier: 'CTRL', hand: 'L' },
  'LEFT_CONTROL': { modifier: 'CTRL', hand: 'L' },
  'RCTRL': { modifier: 'CTRL', hand: 'R' },
  'LSHIFT': { modifier: 'SHIFT', hand: 'L' },
  'LEFT_SHIFT': { modifier: 'SHIFT', hand: 'L' },
  'RSHIFT': { modifier: 'SHIFT', hand: 'R' },
  'RIGHT_SHIFT': { modifier: 'SHIFT', hand: 'R' },
}

interface ParsedBinding {
  tap: string
  hold: string
  isHoldTap: boolean
  holdRaw: string
}

function parseBinding(binding: string): ParsedBinding {
  const trimmed = binding.trim()

  if (trimmed === '&none') {
    return { tap: '', hold: '', isHoldTap: false, holdRaw: '' }
  }
  if (trimmed === '&trans') {
    return { tap: '', hold: '', isHoldTap: false, holdRaw: '' }
  }

  // &kp KEY or &kp MOD(KEY)
  const kpMatch = trimmed.match(/^&kp\s+(.+)$/)
  if (kpMatch) {
    return { tap: kpMatch[1], hold: '', isHoldTap: false, holdRaw: '' }
  }

  // &mt MOD KEY → tap=KEY hold=MOD
  const mtMatch = trimmed.match(/^&mt\s+(\S+)\s+(.+)$/)
  if (mtMatch) {
    return { tap: mtMatch[2], hold: mtMatch[1], isHoldTap: true, holdRaw: mtMatch[1] }
  }

  // &hm MOD KEY → tap=KEY hold=MOD (home-row mod)
  const hmMatch = trimmed.match(/^&hm\s+(\S+)\s+(.+)$/)
  if (hmMatch) {
    return { tap: hmMatch[2], hold: hmMatch[1], isHoldTap: true, holdRaw: hmMatch[1] }
  }

  // &shifthr MOD KEY → tap=KEY hold=MOD (shift home-row mod variant)
  const shifthrMatch = trimmed.match(/^&shifthr\s+(\S+)\s+(.+)$/)
  if (shifthrMatch) {
    return { tap: shifthrMatch[2], hold: shifthrMatch[1], isHoldTap: true, holdRaw: shifthrMatch[1] }
  }

  // &lt LAYER KEY → tap=KEY hold=LAYER_N
  const ltMatch = trimmed.match(/^&lt\s+(\S+)\s+(.+)$/)
  if (ltMatch) {
    return { tap: ltMatch[2], hold: `LAYER_${ltMatch[1]}`, isHoldTap: true, holdRaw: '' }
  }

  // &weak MOD KEY → tap=KEY hold=MOD
  const weakMatch = trimmed.match(/^&weak\s+(\S+)\s+(.+)$/)
  if (weakMatch) {
    return { tap: weakMatch[2], hold: weakMatch[1], isHoldTap: true, holdRaw: weakMatch[1] }
  }

  // Fallback: other behaviors like &bt, &save, &email, &backspace, etc.
  const otherMatch = trimmed.match(/^&(\S+)(?:\s+(.*))?$/)
  if (otherMatch) {
    const args = otherMatch[2] || ''
    return { tap: `${otherMatch[1]}${args ? ' ' + args : ''}`, hold: '', isHoldTap: false, holdRaw: '' }
  }

  return { tap: trimmed, hold: '', isHoldTap: false, holdRaw: '' }
}

/**
 * Tokenize bindings from a `bindings = < ... >;` block.
 * Each binding starts with & and may have arguments.
 */
function tokenizeBindings(raw: string): string[] {
  const bindings: string[] = []
  const tokens = raw.trim().split(/\s+/)
  let current = ''

  for (const token of tokens) {
    if (token.startsWith('&')) {
      if (current) {
        bindings.push(current.trim())
      }
      current = token
    } else {
      current += ' ' + token
    }
  }
  if (current) {
    bindings.push(current.trim())
  }

  return bindings
}

function extractCombos(raw: string): Combo[] {
  const combos: Combo[] = []

  const combosIdx = raw.search(/combos\s*\{/)
  if (combosIdx === -1) return combos

  const braceIdx = raw.indexOf('{', combosIdx)
  const combosBlock = extractBraceBlock(raw, braceIdx)
  if (!combosBlock) return combos

  // Match each combo entry within the combos block
  const comboHeaderRegex = /(\w+)\s*\{/g
  let headerMatch: RegExpExecArray | null

  while ((headerMatch = comboHeaderRegex.exec(combosBlock)) !== null) {
    const name = headerMatch[1]
    if (name === 'compatible') continue

    const innerBraceIdx = combosBlock.indexOf('{', headerMatch.index)
    const innerContent = extractBraceBlock(combosBlock, innerBraceIdx)

    const bindingsMatch = innerContent.match(/bindings\s*=\s*<([^>]+)>/)
    const positionsMatch = innerContent.match(/key-positions\s*=\s*<([^>]+)>/)

    if (!bindingsMatch || !positionsMatch) continue

    const bindingStr = bindingsMatch[1].trim()
    const positions = positionsMatch[1].trim().split(/\s+/).map(Number)

    const parsed = parseBinding(bindingStr)
    const output = parsed.tap || bindingStr

    combos.push({ name, keys: positions, output })

    comboHeaderRegex.lastIndex = innerBraceIdx + innerContent.length + 2
  }

  return combos
}

/**
 * Extract the content of a brace-delimited block starting at the opening '{'.
 * Returns the content between (but not including) the outermost braces.
 */
function extractBraceBlock(text: string, startIdx: number): string {
  let depth = 0
  let i = startIdx
  let blockStart = -1

  while (i < text.length) {
    if (text[i] === '{') {
      if (depth === 0) blockStart = i + 1
      depth++
    } else if (text[i] === '}') {
      depth--
      if (depth === 0) {
        return text.slice(blockStart, i)
      }
    }
    i++
  }
  return ''
}

function extractLayers(raw: string): { name: string; bindingsRaw: string }[] {
  const layers: { name: string; bindingsRaw: string }[] = []

  // Find the keymap block by locating 'keymap {' then using brace counting
  const keymapIdx = raw.search(/keymap\s*\{/)
  if (keymapIdx === -1) {
    throw new Error(
      'No keymap block found. Please upload a ZMK ".keymap" file that contains a ' +
      '"keymap { compatible = \\"zmk,keymap\\"; ... };" devicetree block. ' +
      'See https://zmk.dev/docs/keymaps for the expected format.'
    )
  }

  const braceIdx = raw.indexOf('{', keymapIdx)
  const keymapBlock = extractBraceBlock(raw, braceIdx)

  if (!keymapBlock || !keymapBlock.includes('zmk,keymap')) {
    throw new Error(
      'The keymap block found does not look like a ZMK keymap — missing ' +
      '"compatible = \\"zmk,keymap\\"". Make sure you are uploading a ZMK ".keymap" file. ' +
      'See https://zmk.dev/docs/keymaps for the expected format.'
    )
  }

  // Now find each layer within the keymap block - they have bindings = < ... >;
  // We need to find each sub-block that contains bindings
  const layerHeaderRegex = /(\w+)\s*\{/g
  let headerMatch: RegExpExecArray | null

  while ((headerMatch = layerHeaderRegex.exec(keymapBlock)) !== null) {
    const name = headerMatch[1]
    if (name === 'compatible') continue // skip the compatible line

    // Extract the full block content
    const blockBraceIdx = keymapBlock.indexOf('{', headerMatch.index)
    const blockContent = extractBraceBlock(keymapBlock, blockBraceIdx)

    // Check if this block has bindings
    const bindingsMatch = blockContent.match(/bindings\s*=\s*<([\s\S]*?)>/)
    if (!bindingsMatch) continue

    const bindingsRaw = bindingsMatch[1]

    // Check for label property
    let layerName = name
    const labelMatch = blockContent.match(/label\s*=\s*"([^"]+)"/)
    if (labelMatch) {
      layerName = labelMatch[1]
    }

    layers.push({ name: layerName, bindingsRaw })

    // Skip past this block to avoid re-matching nested content
    layerHeaderRegex.lastIndex = blockBraceIdx + blockContent.length + 2
  }

  return layers
}

/**
 * Detect if the keymap uses outer columns (e.g., 42-key corne with &none/&trans padding).
 * If each row has 12 keys and the first/last are &none or &trans, it's a 36-key with padding.
 */
function detectLayout(bindings: string[]): { hasOuterCols: boolean; colsPerRow: number } {
  // Check if we have exactly 42 bindings (36 + 6 outer) or 48 (42 + 6 thumbs)
  if (bindings.length >= 42) {
    // Check if positions 0, 11, 12, 23, 24, 35 are &none or &trans
    const outerPositions = [0, 11, 12, 23, 24, 35]
    const allOuter = outerPositions.every(
      (pos) => bindings[pos] === '&none' || bindings[pos] === '&trans'
    )
    if (allOuter) {
      return { hasOuterCols: true, colsPerRow: 12 }
    }
  }
  return { hasOuterCols: false, colsPerRow: 10 }
}

export function parseKeymap(raw: string): ParsedKeymap {
  const layers: Layer[] = []
  const thumbCluster: ThumbKey[] = []
  const homeRowMods: HomeRowMod[] = []
  const combos = extractCombos(raw)

  const rawLayers = extractLayers(raw)
  if (rawLayers.length === 0) {
    throw new Error(
      'No key layers found in the keymap. Expected at least one layer with a "bindings = < ... >;" block inside the keymap. ' +
      'See https://zmk.dev/docs/keymaps for the expected format.'
    )
  }

  for (const rawLayer of rawLayers) {
    const bindings = tokenizeBindings(rawLayer.bindingsRaw)
    const layout = detectLayout(bindings)
    const keys: Key[] = []
    const layerThumbs: ThumbKey[] = []

    let position = 0

    if (layout.hasOuterCols) {
      // 42 main keys + 6 thumbs = skip outer columns
      // Rows: 0-11 (use cols 1-10), 12-23 (use cols 1-10), 24-35 (use cols 1-10)
      // Thumbs: 36-41
      for (let rawIdx = 0; rawIdx < bindings.length; rawIdx++) {
        const row = Math.floor(rawIdx / 12)
        const colInRow = rawIdx % 12

        if (row < 3) {
          // Main keys - skip outer columns (0 and 11)
          if (colInRow === 0 || colInRow === 11) continue

          const col = colInRow - 1 // 0-9
          const parsed = parseBinding(bindings[rawIdx])
          keys.push({
            position,
            row,
            col,
            finger: FINGER_MAP[col],
            tap: parsed.tap,
            hold: parsed.hold,
          })

          // Detect home-row mods (row 1 = home row)
          if (row === 1 && parsed.isHoldTap && parsed.holdRaw) {
            const modInfo = MODIFIER_MAP[parsed.holdRaw]
            if (modInfo) {
              homeRowMods.push({
                key: parsed.tap,
                modifier: modInfo.modifier,
                hand: modInfo.hand,
              })
            }
          }

          position++
        } else if (row === 3) {
          // Thumb row (6 keys after 36 main positions)
          const thumbPos = 30 + colInRow
          const parsed = parseBinding(bindings[rawIdx])
          layerThumbs.push({
            position: thumbPos,
            finger: THUMB_FINGERS[thumbPos] || `T${colInRow}`,
            tap: parsed.tap,
            hold: parsed.hold,
          })
        }
      }
    } else {
      // Standard 36-key + 6 thumb layout
      for (let i = 0; i < bindings.length; i++) {
        if (i < 30) {
          const row = Math.floor(i / 10)
          const col = i % 10
          const parsed = parseBinding(bindings[i])
          keys.push({
            position: i,
            row,
            col,
            finger: FINGER_MAP[col],
            tap: parsed.tap,
            hold: parsed.hold,
          })

          // Detect home-row mods (row 1 = home row)
          if (row === 1 && parsed.isHoldTap && parsed.holdRaw) {
            const modInfo = MODIFIER_MAP[parsed.holdRaw]
            if (modInfo) {
              homeRowMods.push({
                key: parsed.tap,
                modifier: modInfo.modifier,
                hand: modInfo.hand,
              })
            }
          }
        } else {
          // Thumb keys
          const thumbPos = i
          const parsed = parseBinding(bindings[i])
          layerThumbs.push({
            position: thumbPos,
            finger: THUMB_FINGERS[thumbPos] || `T${i - 30}`,
            tap: parsed.tap,
            hold: parsed.hold,
          })
        }
      }
    }

    layers.push({ name: rawLayer.name, keys, thumbs: layerThumbs })

    // Use first layer's thumb cluster as the primary one
    if (layers.length === 1) {
      thumbCluster.push(...layerThumbs)
    }
  }

  return { layers, thumbCluster, homeRowMods, combos }
}
