<script lang="ts">
  import { TypingEngine } from '../engine/typingEngine.svelte'
  import TypingDisplay from '../components/TypingDisplay.svelte'
  import DrillShell from '../components/DrillShell.svelte'
  import { saveSession } from '../stats'
  import { sentences } from '../corpus/chat'
  import { recordKeystroke } from '../keyStats.svelte'
  import { normalizeCustomText } from './chatProseHelpers'

  interface Props {
    onBack: () => void
    fontSizePx?: number
    targetWpm?: number
  }

  let { onBack, fontSizePx = 20, targetWpm = 0 }: Props = $props()

  const CUSTOM_PROSE_KEY = 'kbd-training:customprose'

  function loadStoredCustomText(): string | null {
    try {
      const v = localStorage.getItem(CUSTOM_PROSE_KEY)
      return v && v.trim() ? v : null
    } catch {
      return null
    }
  }

  function saveCustomText(t: string): void {
    try {
      localStorage.setItem(CUSTOM_PROSE_KEY, t)
    } catch {
      // ignore
    }
  }

  function clearStoredCustomText(): void {
    try {
      localStorage.removeItem(CUSTOM_PROSE_KEY)
    } catch {
      // ignore
    }
  }

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

  // Custom text state
  let customText = $state<string | null>(loadStoredCustomText())
  let showCustomPanel = $state(false)
  let customDraft = $state('')

  function buildInitialText(): string {
    return customText ?? generateText()
  }

  const initialText = buildInitialText()
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
    // Block keypresses while custom panel is open
    if (showCustomPanel) return

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
    // In custom mode, replay same text; otherwise generate new
    text = customText ?? generateText()
    engine = new TypingEngine(text)
    done = false
    errorChars = new Map()
    lastCharPressTime = 0
  }

  function openCustomPanel() {
    customDraft = customText ?? ''
    showCustomPanel = true
  }

  function applyCustomText() {
    const normalized = normalizeCustomText(customDraft)
    if (!normalized) {
      // Empty/whitespace — treat as cancel
      showCustomPanel = false
      return
    }
    customText = normalized
    saveCustomText(normalized)
    text = normalized
    engine = new TypingEngine(normalized)
    done = false
    errorChars = new Map()
    lastCharPressTime = 0
    showCustomPanel = false
  }

  function cancelCustomPanel() {
    showCustomPanel = false
  }

  function clearCustomText() {
    customText = null
    clearStoredCustomText()
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
  onPause={() => engine.pause()}
  onResume={() => engine.resume()}
  {targetWpm}
>
  {#snippet body()}
    <div class="w-full max-w-3xl relative">
      <!-- Custom text button / indicator (top-right) -->
      <div class="absolute -top-8 right-0 flex items-center gap-2" style="z-index: 10;">
        {#if customText}
          <span class="font-mono text-xs" style="color: #e2b714;">custom</span>
          <button
            onclick={clearCustomText}
            class="font-mono text-xs px-1 rounded"
            style="color: #646669; background: transparent; border: none; cursor: pointer;"
            title="Clear custom text"
            aria-label="Clear custom text"
          >×</button>
        {:else}
          <button
            onclick={openCustomPanel}
            class="font-mono text-xs px-2 py-1 rounded border transition-colors"
            style="color: #646669; border-color: #646669; background: transparent; cursor: pointer;"
            title="Paste your own text to drill"
          >✎ custom text</button>
        {/if}
      </div>

      <TypingDisplay {chars} {cursor} {fontSizePx} />

      <!-- Custom text input panel -->
      {#if showCustomPanel}
        <div
          class="absolute inset-0 flex flex-col gap-3 rounded-lg p-4"
          style="background: #2c2e31; z-index: 20;"
        >
          <label for="custom-prose-textarea" class="font-mono text-xs" style="color: #646669;">
            paste your paragraph:
          </label>
          <!-- svelte-ignore a11y_autofocus -->
          <textarea
            id="custom-prose-textarea"
            autofocus
            bind:value={customDraft}
            class="font-mono text-sm rounded p-2 resize-none"
            style="background: #323437; color: #d1d0c5; border: 1px solid #646669; min-height: 120px; outline: none;"
            placeholder="Paste text here…"
            onkeydown={(e) => {
              // Allow Esc to cancel without bubbling to DrillShell
              if (e.key === 'Escape') { e.stopPropagation(); cancelCustomPanel() }
              // Allow Enter inside textarea (don't submit)
            }}
          ></textarea>
          <div class="flex gap-2">
            <button
              onclick={applyCustomText}
              class="font-mono text-xs px-3 py-1 rounded"
              style="background: #e2b714; color: #323437; border: none; cursor: pointer;"
            >Use this text</button>
            <button
              onclick={cancelCustomPanel}
              class="font-mono text-xs px-3 py-1 rounded"
              style="background: #646669; color: #d1d0c5; border: none; cursor: pointer;"
            >Cancel</button>
          </div>
        </div>
      {/if}
    </div>
  {/snippet}
</DrillShell>
