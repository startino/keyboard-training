const SETTINGS_KEY = 'kbd-training:settings'

export interface Settings {
  fontSizePx: number
  targetWpm: number
  weaknessBiasDefault: boolean
}

const DEFAULTS: Settings = {
  fontSizePx: 20,
  targetWpm: 60,
  weaknessBiasDefault: true,
}

export const FONT_SIZE_MIN = 14
export const FONT_SIZE_MAX = 48
export const FONT_SIZE_STEP = 2
export const TARGET_WPM_MIN = 20
export const TARGET_WPM_MAX = 120
export const TARGET_WPM_STEP = 5

/** Clamp a value to [min, max] and round to the nearest step. */
export function clampStep(value: number, min: number, max: number, step: number): number {
  const stepped = Math.round(value / step) * step
  return Math.min(max, Math.max(min, stepped))
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      fontSizePx: clampStep(
        typeof parsed.fontSizePx === 'number' ? parsed.fontSizePx : DEFAULTS.fontSizePx,
        FONT_SIZE_MIN,
        FONT_SIZE_MAX,
        FONT_SIZE_STEP,
      ),
      targetWpm: clampStep(
        typeof parsed.targetWpm === 'number' ? parsed.targetWpm : DEFAULTS.targetWpm,
        TARGET_WPM_MIN,
        TARGET_WPM_MAX,
        TARGET_WPM_STEP,
      ),
      weaknessBiasDefault:
        typeof parsed.weaknessBiasDefault === 'boolean'
          ? parsed.weaknessBiasDefault
          : DEFAULTS.weaknessBiasDefault,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function persistSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // ignore
  }
}

// Reactive settings object — reads from localStorage on first import.
// Use `settings.fontSizePx` etc. directly in Svelte components.
export const settings = $state<Settings>(loadSettings())

export function updateSettings(patch: Partial<Settings>): void {
  if (patch.fontSizePx !== undefined) {
    settings.fontSizePx = clampStep(patch.fontSizePx, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_STEP)
  }
  if (patch.targetWpm !== undefined) {
    settings.targetWpm = clampStep(patch.targetWpm, TARGET_WPM_MIN, TARGET_WPM_MAX, TARGET_WPM_STEP)
  }
  if (patch.weaknessBiasDefault !== undefined) {
    settings.weaknessBiasDefault = patch.weaknessBiasDefault
  }
  persistSettings({
    fontSizePx: settings.fontSizePx,
    targetWpm: settings.targetWpm,
    weaknessBiasDefault: settings.weaknessBiasDefault,
  })
}

export function resetSettings(): void {
  settings.fontSizePx = DEFAULTS.fontSizePx
  settings.targetWpm = DEFAULTS.targetWpm
  settings.weaknessBiasDefault = DEFAULTS.weaknessBiasDefault
  persistSettings({ ...DEFAULTS })
}
