<script lang="ts">
  import { getKeymap } from '../keymap/store.svelte'
  import { zmkToChar } from '../keymap/zmkCharMap'
  import type { Key, ThumbKey, Layer } from '../keymap/types'

  interface Props {
    lastTypedChar: string | null
    forcedLayer?: string | null
  }

  let { lastTypedChar, forcedLayer = null }: Props = $props()

  const keymap = $derived(getKeymap())

  let autoLayer = $state<string>('home')

  $effect(() => {
    if (forcedLayer) return
    if (!lastTypedChar) return
    const char = lastTypedChar
    for (let i = keymap.layers.length - 1; i >= 0; i--) {
      const layer = keymap.layers[i]
      if (layerContainsChar(layer, char)) {
        autoLayer = layer.name
        return
      }
    }
  })

  function layerContainsChar(layer: Layer, char: string): boolean {
    const lower = char.toLowerCase()
    const upper = char.toUpperCase()
    for (const key of layer.keys) {
      if (!key.tap) continue
      const mapped = zmkToChar(key.tap)
      if (mapped === char || mapped === lower) return true
      if (key.tap === upper && char === lower) return true
    }
    for (const thumb of layer.thumbs) {
      if (!thumb.tap) continue
      const mapped = zmkToChar(thumb.tap)
      if (mapped === char) return true
      if (thumb.tap === 'SPACE' && char === ' ') return true
    }
    return false
  }

  const activeLayerName = $derived(forcedLayer ?? autoLayer)
  const activeLayer = $derived(
    keymap.layers.find((l) => l.name === activeLayerName) ?? keymap.layers[0]
  )

  let pulseToken = $state(0)
  let pulseKeyId = $state<string | null>(null)

  $effect(() => {
    if (!lastTypedChar) return
    const _bumpToken = pulseToken
    const char = lastTypedChar
    if (!activeLayer) return
    const id = findKeyIdForChar(activeLayer, char)
    if (!id) return
    pulseKeyId = id
    pulseToken++
    const myToken = pulseToken
    setTimeout(() => {
      if (myToken === pulseToken) pulseKeyId = null
    }, 150)
    void _bumpToken
  })

  function findKeyIdForChar(layer: Layer, char: string): string | null {
    const lower = char.toLowerCase()
    const upper = char.toUpperCase()
    for (const key of layer.keys) {
      if (!key.tap) continue
      const mapped = zmkToChar(key.tap)
      if (mapped === char || mapped === lower) return `k-${key.position}`
      if (key.tap === upper && char === lower) return `k-${key.position}`
    }
    for (const thumb of layer.thumbs) {
      if (!thumb.tap) continue
      const mapped = zmkToChar(thumb.tap)
      if (mapped === char) return `t-${thumb.position}`
      if (thumb.tap === 'SPACE' && char === ' ') return `t-${thumb.position}`
    }
    return null
  }

  const NON_PRINT_LABEL: Record<string, string> = {
    BACKSPACE: 'bksp',
    BSPC: 'bksp',
    DEL: 'del',
    DELETE: 'del',
    ENTER: 'ent',
    RET: 'ent',
    RETURN: 'ent',
    ESC: 'esc',
    ESCAPE: 'esc',
    TAB: 'tab',
    SPACE: '␣',
    CAPS: 'caps',
    CAPSLOCK: 'caps',
    LEFT: '←',
    RIGHT: '→',
    UP: '↑',
    DOWN: '↓',
    LSHIFT: 'sft',
    RSHIFT: 'sft',
    LCTRL: 'ctrl',
    RCTRL: 'ctrl',
    LALT: 'alt',
    RALT: 'alt',
    LGUI: 'gui',
    RGUI: 'gui',
  }

  function tapLabel(tap: string): string {
    if (!tap) return ''
    const layerMatch = tap.match(/^LAYER_(\d+)$/)
    if (layerMatch) return `L${layerMatch[1]}`
    const ch = zmkToChar(tap)
    if (ch !== null) return ch
    if (NON_PRINT_LABEL[tap]) return NON_PRINT_LABEL[tap]
    return tap.toLowerCase().slice(0, 4)
  }

  function modBadge(hold: string): string | null {
    if (!hold) return null
    if (hold.startsWith('LAYER_')) return null
    const m: Record<string, string> = {
      LGUI: 'gui',
      RGUI: 'gui',
      LEFT_META: 'gui',
      LALT: 'alt',
      RALT: 'alt',
      LEFT_ALT: 'alt',
      RIGHT_ALT: 'alt',
      LCTRL: 'ctrl',
      RCTRL: 'ctrl',
      LEFT_CONTROL: 'ctrl',
      LSHIFT: 'sft',
      RSHIFT: 'sft',
      LEFT_SHIFT: 'sft',
      RIGHT_SHIFT: 'sft',
    }
    return m[hold] ?? null
  }

  function layerHoldLabel(hold: string): string | null {
    const m = hold.match(/^LAYER_(\d+)$/)
    return m ? `→${m[1]}` : null
  }

  // Geometry
  const KW = 46
  const KH = 46
  const GAP = 4
  const SPLIT = 30
  // Columnar stagger offsets (per col): pinky down 5, ring up 2, middle 0, index 0
  const STAGGER: Record<number, number> = {
    0: 5,
    1: -2,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: -2,
    9: 5,
  }

  function colX(col: number): number {
    if (col < 5) return col * (KW + GAP)
    return col * (KW + GAP) + SPLIT
  }

  function rowY(row: number, col: number): number {
    return row * (KH + GAP) + (STAGGER[col] ?? 0)
  }

  // Thumb arcs: 3 thumbs per side, slightly outboard, below alphas
  const THUMB_OFFSETS_LEFT: { x: number; y: number }[] = [
    { x: 0, y: 0 },
    { x: 0, y: 8 },
    { x: 0, y: 14 },
  ]
  const THUMB_OFFSETS_RIGHT: { x: number; y: number }[] = [
    { x: 0, y: 14 },
    { x: 0, y: 8 },
    { x: 0, y: 0 },
  ]

  function thumbPos(idx: number): { x: number; y: number } {
    // idx 0..5 → positions 30..35 (LT3, LT2, LT1, RT1, RT2, RT3)
    const yBase = 3 * (KH + GAP) + 14
    if (idx < 3) {
      const off = THUMB_OFFSETS_LEFT[idx]
      const xBase = colX(2) + idx * (KW + GAP) + 8
      return { x: xBase + off.x, y: yBase + off.y }
    } else {
      const i = idx - 3
      const off = THUMB_OFFSETS_RIGHT[i]
      const xBase = colX(5) + i * (KW + GAP) - 8
      return { x: xBase + off.x, y: yBase + off.y }
    }
  }

  // Trackpad position: below right thumbs
  const trackpadCx = $derived(colX(8) + KW)
  const trackpadCy = $derived(3 * (KH + GAP) + 14 + KH + 50)

  const totalWidth = colX(9) + KW
  const totalHeight = 3 * (KH + GAP) + 14 + KH + 90

  const homeRowMods = $derived(keymap.homeRowMods)

  function findHomeRowMod(key: Key): string | null {
    if (key.row !== 1) return null
    if (key.hold) {
      const badge = modBadge(key.hold)
      if (badge) return badge
    }
    const found = homeRowMods.find((m) => m.key === key.tap)
    if (found) return found.modifier.toLowerCase().slice(0, 3) === 'shi' ? 'sft' : found.modifier.toLowerCase()
    return null
  }
</script>

<div class="vk-wrap">
  <div class="vk-layer-name">{activeLayerName}</div>
  <svg
    viewBox={`-8 -8 ${totalWidth + 16} ${totalHeight + 16}`}
    width="100%"
    style="max-width: 720px; height: auto;"
    role="img"
    aria-label="virtual keyboard"
  >
    {#if activeLayer}
      {#each activeLayer.keys as key (key.position)}
        {@const x = colX(key.col)}
        {@const y = rowY(key.row, key.col)}
        {@const id = `k-${key.position}`}
        {@const pulsing = pulseKeyId === id}
        {@const label = tapLabel(key.tap)}
        {@const badge = findHomeRowMod(key)}
        <g transform={`translate(${x} ${y})`}>
          <rect
            width={KW}
            height={KH}
            rx="6"
            ry="6"
            fill={pulsing ? '#e2b714' : '#2c2e31'}
            fill-opacity={pulsing ? 0.4 : 1}
            stroke="#646669"
            stroke-width="1"
            class="vk-key"
          />
          <text
            x={KW / 2}
            y={KH / 2 + 4}
            text-anchor="middle"
            font-family="'Roboto Mono', monospace"
            font-size="12"
            fill="#d1d0c5"
          >{label}</text>
          {#if badge}
            <text
              x={4}
              y={KH - 4}
              font-family="'Roboto Mono', monospace"
              font-size="8"
              fill="#646669"
            >{badge}</text>
          {/if}
        </g>
      {/each}

      {#each activeLayer.thumbs as thumb, i (thumb.position)}
        {@const p = thumbPos(i)}
        {@const id = `t-${thumb.position}`}
        {@const pulsing = pulseKeyId === id}
        {@const layerHold = layerHoldLabel(thumb.hold)}
        {@const label = layerHold ? tapLabel(thumb.tap) : tapLabel(thumb.tap)}
        <g transform={`translate(${p.x} ${p.y})`}>
          <rect
            width={KW}
            height={KH}
            rx="8"
            ry="8"
            fill={pulsing ? '#e2b714' : layerHold ? '#34363a' : '#2c2e31'}
            fill-opacity={pulsing ? 0.4 : 1}
            stroke="#646669"
            stroke-width="1"
            class="vk-key"
          />
          <text
            x={KW / 2}
            y={KH / 2 + 4}
            text-anchor="middle"
            font-family="'Roboto Mono', monospace"
            font-size="12"
            fill="#d1d0c5"
          >{label}</text>
          {#if layerHold}
            <text
              x={KW - 4}
              y={KH - 4}
              text-anchor="end"
              font-family="'Roboto Mono', monospace"
              font-size="8"
              fill="#e2b714"
            >{layerHold}</text>
          {/if}
        </g>
      {/each}

      <ellipse
        cx={trackpadCx}
        cy={trackpadCy}
        rx="40"
        ry="30"
        fill="transparent"
        stroke="#3a3c3f"
        stroke-width="1"
        stroke-dasharray="3 3"
      />
    {/if}
  </svg>
</div>

<style>
  .vk-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    max-width: 720px;
    margin: 0 auto;
    padding: 16px;
    width: 100%;
  }
  .vk-layer-name {
    font-family: 'Roboto Mono', monospace;
    font-size: 14px;
    color: #646669;
    text-transform: lowercase;
  }
  :global(.vk-key) {
    transition: fill 150ms ease-out, fill-opacity 150ms ease-out;
  }
</style>
