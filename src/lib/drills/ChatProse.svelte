<script lang="ts">
  import { TypingEngine } from '../engine/typingEngine.svelte'
  import TypingDisplay from '../components/TypingDisplay.svelte'
  import StatsPanel from '../components/StatsPanel.svelte'
  import VirtualKeyboard from '../components/VirtualKeyboard.svelte'
  import { saveSession } from '../stats'
  import { sentences } from '../corpus/chat'

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
  let showKeyboard = $state(false)
  let lastTypedChar = $state<string | null>(null)
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
    if (done) return

    // Track errors before handling
    const cursorPos = engine.getCursor()
    if (e.key.length === 1 && cursorPos < text.length) {
      const expected = text[cursorPos]
      if (e.key !== expected) {
        const count = errorChars.get(expected) || 0
        errorChars.set(expected, count + 1)
        errorChars = new Map(errorChars) // trigger reactivity
      }
    }

    if (e.key.length === 1) {
      lastTypedChar = e.key
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

    const extraStats: Record<string, string | number> = {}
    if (top5.length > 0) {
      extraStats['top errors'] = top5.map(([ch, count]) => {
        const display = ch === ' ' ? 'space' : ch
        return `${display}(${count})`
      }).join(', ')
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
    errorChars = new Map()
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
      <VirtualKeyboard {lastTypedChar} />
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
