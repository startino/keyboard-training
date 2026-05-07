<script lang="ts">
  import { TypingEngine } from '../engine/typingEngine.svelte'
  import TypingDisplay from '../components/TypingDisplay.svelte'
  import DrillShell from '../components/DrillShell.svelte'
  import { saveSession } from '../stats'
  import { sentences } from '../corpus/chat'
  import { recordKeystroke } from '../keyStats.svelte'

  interface Props {
    onBack: () => void
  }

  let { onBack }: Props = $props()

  function generateText(): string {
    const picked: string[] = []
    const indices = new Set<number>()
    while (picked.length < 5) {
      const idx = Math.floor(Math.random() * sentences.length)
      if (!indices.has(idx)) {
        indices.add(idx)
        picked.push(sentences[idx])
      }
    }
    return picked.join(' ')
  }

  const initialText = generateText()
  let text = $state(initialText)
  let engine = $state(new TypingEngine(initialText))
  let done = $state(false)
  let chars = $derived(engine.getChars())
  let cursor = $derived(engine.getCursor())

  // Track error characters
  let errorChars = $state<Map<string, number>>(new Map())
  let lastTypedChar = $state<string | null>(null)
  let lastTypedToken = $state(0)
  // Track inter-keypress latency for per-key stats
  let lastCharPressTime = $state(0)

  function handleKey(e: KeyboardEvent) {
    const now = Date.now()
    // Track errors and record per-key stats before engine processes keypress
    const cursorPos = engine.getCursor()
    if (e.key.length === 1 && cursorPos < text.length) {
      const expected = text[cursorPos]
      const correct = e.key === expected
      if (!correct) {
        const count = errorChars.get(expected) || 0
        errorChars.set(expected, count + 1)
        errorChars = new Map(errorChars) // trigger reactivity
      }
      const latencyMs = lastCharPressTime > 0 ? now - lastCharPressTime : undefined
      recordKeystroke(expected, correct, correct ? latencyMs : undefined)
      lastCharPressTime = now
    }

    if (e.key.length === 1) {
      lastTypedChar = e.key
      lastTypedToken++
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

    // Top 5 error characters
    const sorted = [...errorChars.entries()].sort((a, b) => b[1] - a[1])
    const top5 = sorted.slice(0, 5)

    const extraStats: { label: string; value: string }[] = []
    if (top5.length > 0) {
      extraStats.push({
        label: 'top errors',
        value: top5.map(([ch, count]) => {
          const display = ch === ' ' ? 'space' : ch
          return `${display}(${count})`
        }).join(', '),
      })
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
      drillId: 'chat',
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
    errorChars = new Map()
    lastCharPressTime = 0
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
