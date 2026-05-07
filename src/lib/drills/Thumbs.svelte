<script lang="ts">
  import { TypingEngine } from '../engine/typingEngine.svelte'
  import TypingDisplay from '../components/TypingDisplay.svelte'
  import StatsPanel from '../components/StatsPanel.svelte'
  import VirtualKeyboard from '../components/VirtualKeyboard.svelte'
  import { saveSession } from '../stats'

  interface Props {
    onBack: () => void
  }

  let { onBack }: Props = $props()

  const COMMON_WORDS = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
    'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
    'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
    'an', 'will', 'my', 'one', 'all', 'if', 'there', 'their', 'what', 'so',
    'up', 'out', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'can',
  ]

  function generateText(): string {
    const phrases: string[] = []
    for (let p = 0; p < 5; p++) {
      const len = 3 + Math.floor(Math.random() * 4) // 3-6 words
      const words: string[] = []
      for (let i = 0; i < len; i++) {
        const word = COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)]
        // ~20% of random words capitalized to increase shift density
        if (Math.random() < 0.2) {
          words.push(word.charAt(0).toUpperCase() + word.slice(1))
        } else {
          words.push(word)
        }
      }
      phrases.push(words.join(' '))
    }
    return phrases.join(' ')
  }

  const initialText = generateText()
  let text = $state(initialText)
  let engine = $state(new TypingEngine(initialText))
  let done = $state(false)
  let chars = $derived(engine.getChars())
  let cursor = $derived(engine.getCursor())

  // Track per-keypress timing for thumb analysis
  let keypressTimes = $state<{ key: string; time: number; index: number }[]>([])
  let lastKeypressTime = $state(0)
  let showKeyboard = $state(false)
  let lastTypedChar = $state<string | null>(null)
  let lastTypedToken = $state(0)
  let escPendingUntil = $state(0)
  let escHintTimeout = $state<ReturnType<typeof setTimeout> | null>(null)
  let showEscHint = $state(false)

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (done) {
        onBack()
        return
      }
      const nowEsc = Date.now()
      if (nowEsc < escPendingUntil) {
        if (escHintTimeout) clearTimeout(escHintTimeout)
        showEscHint = false
        onBack()
        return
      }
      escPendingUntil = nowEsc + 500
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
    // C2: Block browser shortcuts (Ctrl/Cmd/Alt combos), allow refresh and devtools
    if (e.ctrlKey || e.metaKey || e.altKey) {
      const key = e.key.toLowerCase()
      const isRefresh = (e.ctrlKey || e.metaKey) && key === 'r'
      const isDevtools = (e.ctrlKey || e.metaKey) && (key === 'i' || key === 'j' || key === 'u')
      if (!isRefresh && !isDevtools) {
        e.preventDefault()
      }
      return
    }

    if (done) return

    const now = Date.now()

    if (e.key.length === 1) {
      lastTypedChar = e.key
      lastTypedToken++
    }

    // Track timing for thumb keys (space, shift inferred from capitals)
    if (e.key === ' ' || e.key.length === 1 || e.key === 'Backspace') {
      if (lastKeypressTime > 0) {
        keypressTimes.push({ key: e.key, time: now - lastKeypressTime, index: engine.getCursor() })
      }
      lastKeypressTime = now
    }

    engine.handleKeypress(e.key)

    if (engine.isComplete()) {
      done = true
    }
  }

  function getStats() {
    const wpm = engine.getWpm()
    const accuracy = engine.getAccuracy()
    const duration = engine.getElapsedMs() / 1000
    const errorCount = engine.getErrorCount()

    // Analyze thumb usage
    const spaceTimes: number[] = []
    const shiftTimes: number[] = []

    for (const kp of keypressTimes) {
      if (kp.key === ' ') {
        spaceTimes.push(kp.time)
      }
    }

    // Detect shift usage: when typing a capital letter, the previous keypress involved shift
    const textChars = text.split('')
    for (let i = 0; i < keypressTimes.length; i++) {
      const kp = keypressTimes[i]
      if (kp.key.length === 1 && kp.key >= 'A' && kp.key <= 'Z') {
        shiftTimes.push(kp.time)
      }
    }

    const extraStats: Record<string, string | number> = {}
    if (spaceTimes.length > 0) {
      const avgSpace = spaceTimes.reduce((s, t) => s + t, 0) / spaceTimes.length
      extraStats['space avg'] = `${Math.round(avgSpace)}ms`
    }
    if (shiftTimes.length > 0) {
      const avgShift = shiftTimes.reduce((s, t) => s + t, 0) / shiftTimes.length
      extraStats['shift avg'] = `${Math.round(avgShift)}ms`
    }

    return { wpm, accuracy, duration, errorCount, extraStats }
  }

  function saveDrillSession() {
    const { wpm, accuracy, duration, errorCount, extraStats } = getStats()
    saveSession({
      timestamp: Date.now(),
      wpm,
      accuracy,
      duration,
      errorCount,
      drillId: 'thumbs',
      extraStats,
    })
  }

  $effect(() => {
    if (done) {
      saveDrillSession()
    }
  })

  function restart() {
    text = generateText()
    engine = new TypingEngine(text)
    done = false
    keypressTimes = []
    lastKeypressTime = 0
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if done}
  {@const stats = getStats()}
  <StatsPanel
    wpm={stats.wpm}
    accuracy={stats.accuracy}
    duration={stats.duration}
    errorCount={stats.errorCount}
    extraStats={Object.entries(stats.extraStats).map(([label, value]) => ({ label, value: String(value) }))}
    onRestart={restart}
    {onBack}
  />
{:else}
  <main class="min-h-screen bg-bg flex flex-col items-center justify-center px-4 gap-8">
    <div class="w-full max-w-3xl">
      <TypingDisplay {chars} {cursor} />
    </div>
    {#if showKeyboard}
      <VirtualKeyboard {lastTypedChar} {lastTypedToken} />
    {/if}
    {#if showEscHint}
      <p class="font-mono text-xs" style="color: #e2b714;">press esc again to exit</p>
    {:else}
      <p class="font-mono text-xs" style="color: #646669;">
        press esc twice to exit &middot; {showKeyboard ? 'tab to hide keyboard' : 'tab to show keyboard'}
      </p>
    {/if}
  </main>
{/if}
