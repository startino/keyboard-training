<script lang="ts">
  import { getKeymap } from '../keymap/store.svelte'
  import { ZMK_CHAR_MAP } from '../keymap/zmkCharMap'
  import StatsPanel from '../components/StatsPanel.svelte'
  import VirtualKeyboard from '../components/VirtualKeyboard.svelte'
  import { saveSession } from '../stats'
  import { computeFlashcardStats } from './flashcardStats'

  interface Props {
    onBack: () => void
  }

  let { onBack }: Props = $props()

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
  let showKeyboard = $state(false)
  let lastTypedChar = $state<string | null>(null)
  let lastTypedToken = $state(0)
  let escPendingUntil = $state(0)
  let escHintTimeout = $state<ReturnType<typeof setTimeout> | null>(null)
  let showEscHint = $state(false)
  let wrongCount = $state(0)
  let shaking = $state(false)
  let shakeTimeout = $state<ReturnType<typeof setTimeout> | null>(null)

  function pickNextCard(): FlashCard | null {
    if (cards.length === 0) return null
    const totalWeight = cards.reduce((sum, c) => sum + c.weight, 0)
    let r = Math.random() * totalWeight
    for (const card of cards) {
      r -= card.weight
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

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (sessionDone) {
        onBack()
        return
      }
      const now = Date.now()
      if (now < escPendingUntil) {
        if (escHintTimeout) clearTimeout(escHintTimeout)
        showEscHint = false
        onBack()
        return
      }
      escPendingUntil = now + 500
      showEscHint = true
      if (escHintTimeout) clearTimeout(escHintTimeout)
      escHintTimeout = setTimeout(() => {
        showEscHint = false
      }, 1000)
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      showKeyboard = !showKeyboard
      return
    }

    // C2: Block browser shortcuts (Ctrl/Cmd/Alt combos) but allow refresh and devtools
    if (e.ctrlKey || e.metaKey || e.altKey) {
      const key = e.key.toLowerCase()
      const isRefresh = (e.ctrlKey || e.metaKey) && (key === 'r')
      const isDevtools = (e.ctrlKey || e.metaKey) && (key === 'i' || key === 'j' || key === 'u')
      if (!isRefresh && !isDevtools) {
        e.preventDefault()
      }
      return
    }

    if (sessionDone) return
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
      // Correct
      latencies.push({ char: currentCard.char, layerName: currentCard.layerName, ms: latency })
      wrongCount = 0
      showFlash('correct')
      setTimeout(() => advanceCard(), 150)
    } else {
      // Wrong - double weight, re-present. cardShowTime is NOT reset here;
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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if sessionDone}
  {@const sessionStats = computeFlashcardStats({ latencies, totalCards, errorCount, startTime })}
  <StatsPanel
    wpm={0}
    accuracy={sessionStats.accuracy}
    duration={sessionStats.duration}
    errorCount={sessionStats.errorCount}
    extraStats={sessionStats.extraStatsList}
    onRestart={restart}
    {onBack}
  />
{:else if currentCard}
  <main class="min-h-screen bg-bg flex flex-col items-center justify-center gap-8 px-4">
    <div
      class="flex flex-col items-center gap-6 transition-colors duration-150"
      class:fc-shake={shaking}
      style:color={flashColor || '#d1d0c5'}
    >
      <span class="font-mono font-bold" style="font-size: 6rem; line-height: 1;">
        {currentCard.char}
      </span>
      <span class="text-sm font-mono" style="color: #646669;">
        {currentCard.layerName} &middot; {FINGER_LABELS[currentCard.finger] || currentCard.finger}
      </span>
      {#if wrongCount > 0}
        <span class="font-mono text-sm" style="color: #ca4754;">× {wrongCount}</span>
      {/if}
    </div>

    <div class="font-mono text-sm" style="color: #646669;">
      {completed + 1} / {totalCards}
    </div>

    {#if showKeyboard}
      <VirtualKeyboard {lastTypedChar} {lastTypedToken} forcedLayer={currentCard.layerName} targetChar={currentCard.char} />
    {:else}
      <p class="font-mono text-xs" style="color: #646669;">tab to show keyboard</p>
    {/if}
    {#if showEscHint}
      <p class="font-mono text-xs" style="color: #e2b714;">press esc again to exit</p>
    {:else}
      <p class="font-mono text-xs" style="color: #646669;">press esc twice to exit</p>
    {/if}
  </main>
{:else}
  <main class="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
    <p class="font-mono text-text/70">No flashcard characters found in keymap.</p>
    <button class="mt-4 font-mono text-accent underline" onclick={onBack}>Back to menu</button>
  </main>
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
