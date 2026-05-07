<script lang="ts">
  import { TypingEngine } from '../engine/typingEngine.svelte'
  import TypingDisplay from '../components/TypingDisplay.svelte'
  import DrillShell from '../components/DrillShell.svelte'
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
  let lastTypedChar = $state<string | null>(null)
  let lastTypedToken = $state(0)

  function handleKey(e: KeyboardEvent) {
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
    for (let i = 0; i < keypressTimes.length; i++) {
      const kp = keypressTimes[i]
      if (kp.key.length === 1 && kp.key >= 'A' && kp.key <= 'Z') {
        shiftTimes.push(kp.time)
      }
    }

    const extraStats: { label: string; value: string }[] = []
    if (spaceTimes.length > 0) {
      const avgSpace = spaceTimes.reduce((s, t) => s + t, 0) / spaceTimes.length
      extraStats.push({ label: 'space avg', value: `${Math.round(avgSpace)}ms` })
    }
    if (shiftTimes.length > 0) {
      const avgShift = shiftTimes.reduce((s, t) => s + t, 0) / shiftTimes.length
      extraStats.push({ label: 'shift avg', value: `${Math.round(avgShift)}ms` })
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
      extraStats: Object.fromEntries(extraStats.map(({ label, value }) => [label, value])),
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

  const stats = $derived(done ? getStats() : null)
</script>

<DrillShell
  {onBack}
  onRestart={restart}
  sessionDone={done}
  wpm={stats?.wpm ?? 0}
  accuracy={stats?.accuracy ?? 0}
  duration={stats?.duration ?? 0}
  errorCount={stats?.errorCount ?? 0}
  extraStats={stats?.extraStats ?? []}
  {lastTypedChar}
  {lastTypedToken}
  onKey={handleKey}
>
  {#snippet body()}
    <div class="w-full max-w-3xl">
      <TypingDisplay {chars} {cursor} />
    </div>
  {/snippet}
</DrillShell>
