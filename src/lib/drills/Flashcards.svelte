<script lang="ts">
  import { getKeymap } from '../keymap/store.svelte'
  import { ZMK_CHAR_MAP } from '../keymap/zmkCharMap'
  import StatsPanel from '../components/StatsPanel.svelte'
  import VirtualKeyboard from '../components/VirtualKeyboard.svelte'
  import { saveSession } from '../stats'

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
    if (completed >= totalCards) {
      sessionDone = true
      saveDrillSession()
      return
    }
    currentCard = pickNextCard()
    cardShowTime = Date.now()
  }

  function saveDrillSession() {
    const duration = (Date.now() - startTime) / 1000
    const layerLatencies = new Map<string, number[]>()
    const charLatencies = new Map<string, number[]>()

    for (const l of latencies) {
      const layerArr = layerLatencies.get(l.layerName) || []
      layerArr.push(l.ms)
      layerLatencies.set(l.layerName, layerArr)

      const charArr = charLatencies.get(l.char) || []
      charArr.push(l.ms)
      charLatencies.set(l.char, charArr)
    }

    const extraStats: Record<string, string | number> = {}

    // Median latency per layer
    for (const [layer, times] of layerLatencies) {
      times.sort((a, b) => a - b)
      const median = times[Math.floor(times.length / 2)]
      extraStats[`${layer} median`] = `${Math.round(median)}ms`
    }

    // Error count
    extraStats['errors'] = errorCount

    // Slowest 3 characters
    const avgByChar: { char: string; avg: number }[] = []
    for (const [char, times] of charLatencies) {
      const avg = times.reduce((s, t) => s + t, 0) / times.length
      avgByChar.push({ char, avg })
    }
    avgByChar.sort((a, b) => b.avg - a.avg)
    const slowest = avgByChar.slice(0, 3).map((c) => `${c.char} (${Math.round(c.avg)}ms)`)
    extraStats['slowest chars'] = slowest.join(', ')

    saveSession({
      timestamp: Date.now(),
      wpm: 0,
      accuracy: totalCards > 0 ? ((totalCards - errorCount) / totalCards) * 100 : 100,
      duration,
      errorCount,
      drillId: 'flashcards',
      extraStats,
    })
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onBack()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      showKeyboard = !showKeyboard
      return
    }
    if (sessionDone) return
    if (!currentCard) return
    if (e.key.length !== 1) return

    e.preventDefault()
    lastTypedChar = e.key
    const now = Date.now()
    const latency = now - cardShowTime

    if (e.key === currentCard.char) {
      // Correct
      latencies.push({ char: currentCard.char, layerName: currentCard.layerName, ms: latency })
      showFlash('correct')
      setTimeout(() => advanceCard(), 150)
    } else {
      // Wrong - double weight, re-present
      errorCount++
      currentCard.weight *= 2
      showFlash('incorrect')
      // After flash, re-show same card with new timing
      setTimeout(() => {
        cardShowTime = Date.now()
      }, 300)
    }
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
  <StatsPanel
    wpm={0}
    accuracy={totalCards > 0 ? ((totalCards - errorCount) / totalCards) * 100 : 100}
    duration={(Date.now() - startTime) / 1000}
    errorCount={errorCount}
    extraStats={(() => {
      const layerLatencies = new Map<string, number[]>()
      const charLatencies = new Map<string, number[]>()
      for (const l of latencies) {
        const layerArr = layerLatencies.get(l.layerName) || []
        layerArr.push(l.ms)
        layerLatencies.set(l.layerName, layerArr)
        const charArr = charLatencies.get(l.char) || []
        charArr.push(l.ms)
        charLatencies.set(l.char, charArr)
      }
      const stats: { label: string; value: string }[] = []
      for (const [layer, times] of layerLatencies) {
        times.sort((a, b) => a - b)
        const median = times[Math.floor(times.length / 2)]
        stats.push({ label: `${layer} median`, value: `${Math.round(median)}ms` })
      }
      stats.push({ label: 'errors', value: String(errorCount) })
      const avgByChar: { char: string; avg: number }[] = []
      for (const [char, times] of charLatencies) {
        const avg = times.reduce((s, t) => s + t, 0) / times.length
        avgByChar.push({ char, avg })
      }
      avgByChar.sort((a, b) => b.avg - a.avg)
      const slowest = avgByChar.slice(0, 3)
      for (const s of slowest) {
        stats.push({ label: `slowest: ${s.char}`, value: `${Math.round(s.avg)}ms` })
      }
      return stats
    })()}
    onRestart={restart}
    {onBack}
  />
{:else if currentCard}
  <main class="min-h-screen bg-bg flex flex-col items-center justify-center gap-8 px-4">
    <div
      class="flex flex-col items-center gap-6 transition-colors duration-150"
      style:color={flashColor || '#d1d0c5'}
    >
      <span class="font-mono font-bold" style="font-size: 6rem; line-height: 1;">
        {currentCard.char}
      </span>
      <span class="text-sm font-mono" style="color: #646669;">
        {currentCard.layerName} &middot; {FINGER_LABELS[currentCard.finger] || currentCard.finger}
      </span>
    </div>

    <div class="font-mono text-sm" style="color: #646669;">
      {completed + 1} / {totalCards}
    </div>

    {#if showKeyboard}
      <VirtualKeyboard {lastTypedChar} forcedLayer={currentCard.layerName} />
    {:else}
      <p class="font-mono text-xs" style="color: #646669;">tab to show keyboard</p>
    {/if}
  </main>
{:else}
  <main class="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
    <p class="font-mono text-text/70">No flashcard characters found in keymap.</p>
    <button class="mt-4 font-mono text-accent underline" onclick={onBack}>Back to menu</button>
  </main>
{/if}
