<script lang="ts">
  import { getKeymap } from '../keymap/store.svelte'
  import { ZMK_CHAR_MAP } from '../keymap/zmkCharMap'
  import DrillShell from '../components/DrillShell.svelte'
  import { saveSession } from '../stats'
  import { computeFlashcardStats } from './flashcardStats'
  import { recordKeystroke, getKeyStats } from '../keyStats.svelte'
  import { weaknessScore } from '../keyStats'
  import { settings } from '../settings.svelte'

  interface Props {
    onBack: () => void
    targetWpm?: number
  }

  let { onBack, targetWpm = 0 }: Props = $props()

  const FINGER_LABELS: Record<string, string> = {
    LP: 'left pinky',
    LR: 'left ring',
    LM: 'left middle',
    LI: 'left index',
    LT: 'left thumb',
    LT1: 'left thumb',
    LT2: 'left thumb',
    LT3: 'left thumb',
    RT: 'right thumb',
    RT1: 'right thumb',
    RT2: 'right thumb',
    RT3: 'right thumb',
    RI: 'right index',
    RM: 'right middle',
    RR: 'right ring',
    RP: 'right pinky',
  }

  interface FlashCard {
    char: string
    layerName: string
    finger: string
    weight: number
  }

  function buildCards(): FlashCard[] {
    const keymap = getKeymap()
    const cards: FlashCard[] = []
    const seen = new Set<string>()

    for (const layer of keymap.layers) {
      for (const key of layer.keys) {
        if (!key.tap || key.tap === '' || key.tap === 'trans' || key.tap === 'none') continue

        const char = ZMK_CHAR_MAP[key.tap]
        if (!char) continue // Only include non-alpha symbols we can map

        const id = `${char}-${layer.name}-${key.finger}`
        if (seen.has(id)) continue
        seen.add(id)

        cards.push({
          char,
          layerName: layer.name,
          finger: key.finger,
          weight: 1,
        })
      }
    }

    return cards
  }

  const SESSION_LENGTH = 28

  // Weighted-by-weakness toggle (default from settings)
  let useWeaknessBias = $state(settings.weaknessBiasDefault)

  let cards = $state<FlashCard[]>(buildCards())
  let currentIndex = $state(0)
  let totalCards = $state(SESSION_LENGTH)
  let completed = $state(0)
  let currentCard = $state<FlashCard | null>(null)
  let flashColor = $state<string | null>(null)
  let flashTimeout = $state<ReturnType<typeof setTimeout> | null>(null)
  let sessionDone = $state(false)
  let cardShowTime = $state(0)
  let latencies = $state<{ char: string; layerName: string; ms: number }[]>([])
  let errorCount = $state(0)
  let startTime = $state(0)
  let lastTypedChar = $state<string | null>(null)
  let lastTypedToken = $state(0)
  let wrongCount = $state(0)
  let shaking = $state(false)
  let shakeTimeout = $state<ReturnType<typeof setTimeout> | null>(null)

  /** Compute the effective pick-weight for a card, merging session weight and weakness bias. */
  function effectiveWeight(card: FlashCard): number {
    let w = card.weight // session weight (doubles on wrong, starts at 1)
    if (useWeaknessBias) {
      const stats = getKeyStats()
      const stat = stats.byChar[card.char]
      if (stat && stat.attempts >= 5) {
        // Clamp to [1, 6]: weak keys up to 6× more likely than a strong key
        const biasMultiplier = Math.min(6, 1 + 5 * weaknessScore(stat))
        w *= biasMultiplier
      }
    }
    return w
  }

  function pickNextCard(): FlashCard | null {
    if (cards.length === 0) return null
    const totalWeight = cards.reduce((sum, c) => sum + effectiveWeight(c), 0)
    let r = Math.random() * totalWeight
    for (const card of cards) {
      r -= effectiveWeight(card)
      if (r <= 0) return card
    }
    return cards[cards.length - 1]
  }

  function advanceCard() {
    completed++
    wrongCount = 0
    if (completed >= totalCards) {
      sessionDone = true
      saveDrillSession()
      return
    }
    currentCard = pickNextCard()
    cardShowTime = Date.now()
  }

  function saveDrillSession() {
    const stats = computeFlashcardStats({ latencies, totalCards, errorCount, startTime })
    saveSession({
      timestamp: Date.now(),
      wpm: 0,
      accuracy: stats.accuracy,
      duration: stats.duration,
      errorCount: stats.errorCount,
      drillId: 'flashcards',
      extraStats: stats.extraStatsRecord,
    })
  }

  // Modifier-only keys that should never be counted as input
  const MODIFIER_KEYS = new Set([
    'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
    'Tab', 'Escape', 'Enter', 'Backspace', 'Delete',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End', 'PageUp', 'PageDown',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  ])

  function isCorrectChar(typed: string, target: string): boolean {
    // Letters: case-insensitive (drill is about the key, not the case)
    if (target.length === 1 && target.toLowerCase() !== target.toUpperCase()) {
      return typed.toLowerCase() === target.toLowerCase()
    }
    // Non-letter glyphs: exact match
    return typed === target
  }

  function handleKey(e: KeyboardEvent) {
    if (!currentCard) return

    // Skip non-character keys (arrows, modifiers, fn keys, etc.)
    if (MODIFIER_KEYS.has(e.key)) return
    if (e.key.length !== 1) return

    e.preventDefault()
    lastTypedChar = e.key
    lastTypedToken++
    const now = Date.now()
    const latency = now - cardShowTime

    if (isCorrectChar(e.key, currentCard.char)) {
      // Correct — record with actual latency from card show time
      recordKeystroke(currentCard.char, true, latency)
      latencies.push({ char: currentCard.char, layerName: currentCard.layerName, ms: latency })
      wrongCount = 0
      showFlash('correct')
      setTimeout(() => advanceCard(), 150)
    } else {
      // Wrong — record against the TARGET char (we want to learn weakness on what was expected)
      recordKeystroke(currentCard.char, false)
      // Double weight, re-present. cardShowTime is NOT reset here;
      // latency = time from card shown to first correct keystroke (wrong
      // attempts are part of that reaction window).
      errorCount++
      wrongCount++
      currentCard.weight *= 2
      showFlash('incorrect')
      triggerShake()
    }
  }

  function triggerShake() {
    if (shakeTimeout) clearTimeout(shakeTimeout)
    shaking = true
    shakeTimeout = setTimeout(() => {
      shaking = false
    }, 300)
  }

  function showFlash(type: 'correct' | 'incorrect') {
    if (flashTimeout) clearTimeout(flashTimeout)
    flashColor = type === 'correct' ? '#4caf50' : '#ca4754'
    const duration = type === 'correct' ? 150 : 300
    flashTimeout = setTimeout(() => {
      flashColor = null
    }, duration)
  }

  function restart() {
    cards = buildCards()
    completed = 0
    currentCard = pickNextCard()
    cardShowTime = Date.now()
    startTime = Date.now()
    sessionDone = false
    latencies = []
    errorCount = 0
    flashColor = null
  }

  // Initialize
  $effect(() => {
    if (!currentCard && cards.length > 0 && !sessionDone) {
      currentCard = pickNextCard()
      cardShowTime = Date.now()
      startTime = Date.now()
    }
  })

  const sessionStats = $derived(
    sessionDone
      ? computeFlashcardStats({ latencies, totalCards, errorCount, startTime })
      : null
  )

  /** True when at least one key has >= 5 attempts — meaning weakness weights are meaningful. */
  const hasWeaknessData = $derived(
    Object.values(getKeyStats().byChar).some((stat) => stat.attempts >= 5)
  )
</script>

{#if cards.length === 0}
  <main class="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
    <p class="font-mono text-text/70">No flashcard characters found in keymap.</p>
    <button class="mt-4 font-mono text-accent underline" onclick={onBack}>Back to menu</button>
  </main>
{:else}
  <DrillShell
    {onBack}
    onRestart={restart}
    {sessionDone}
    wpm={0}
    accuracy={sessionStats?.accuracy ?? 0}
    duration={sessionStats?.duration ?? 0}
    errorCount={sessionStats?.errorCount ?? 0}
    extraStats={sessionStats?.extraStatsList ?? []}
    {lastTypedChar}
    {lastTypedToken}
    forcedLayer={currentCard?.layerName ?? null}
    targetChar={currentCard?.char ?? null}
    onKey={handleKey}
    singleEscOnDone={true}
    {targetWpm}
  >
    {#snippet body()}
      <div class="relative w-full flex flex-col items-center gap-6">
      <div
        class="flex flex-col items-center gap-6 transition-colors duration-150"
        class:fc-shake={shaking}
        style:color={flashColor || '#d1d0c5'}
      >
        <span class="font-mono font-bold" style="font-size: 6rem; line-height: 1;">
          {currentCard?.char ?? ''}
        </span>
        <span class="text-sm font-mono" style="color: #646669;">
          {currentCard?.layerName ?? ''} &middot; {FINGER_LABELS[currentCard?.finger ?? ''] || (currentCard?.finger ?? '')}
        </span>
        {#if wrongCount > 0}
          <span class="font-mono text-sm" style="color: #ca4754;">× {wrongCount}</span>
        {/if}
      </div>

      <div class="font-mono text-sm" style="color: #646669;">
        {completed + 1} / {totalCards}
      </div>

      <button
        onclick={() => hasWeaknessData && (useWeaknessBias = !useWeaknessBias)}
        disabled={!hasWeaknessData}
        class="absolute top-0 right-0 font-mono text-xs px-2 py-1 rounded border transition-colors"
        style={!hasWeaknessData
          ? 'color: #646669; border-color: #646669; background: transparent; opacity: 0.5; cursor: default;'
          : useWeaknessBias
            ? 'color: #e2b714; border-color: #e2b714; background: transparent;'
            : 'color: #646669; border-color: #646669; background: transparent;'}
        title={!hasWeaknessData ? 'drill more sessions to enable' : 'Toggle weak-key weighting'}
      >
        {useWeaknessBias ? 'weighted by weakness' : 'uniform'}
      </button>
      </div>
    {/snippet}
  </DrillShell>
{/if}

<style>
  @keyframes fc-shake {
    0%   { transform: translateX(0); }
    20%  { transform: translateX(-4px); }
    40%  { transform: translateX(4px); }
    60%  { transform: translateX(-4px); }
    80%  { transform: translateX(4px); }
    100% { transform: translateX(0); }
  }
  .fc-shake {
    animation: fc-shake 300ms ease-in-out;
  }
</style>
