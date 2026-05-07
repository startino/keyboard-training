<script lang="ts">
  import type { Snippet } from 'svelte'
  import StatsPanel from './StatsPanel.svelte'
  import VirtualKeyboard from './VirtualKeyboard.svelte'

  interface ExtraStat {
    label: string
    value: string
  }

  interface Props {
    /** Called when the user exits (double-Esc or Esc on stats panel). */
    onBack: () => void
    /** Called when the user hits restart on the stats panel. Optional — if
     *  not provided the restart button is still shown and calls onBack. */
    onRestart?: () => void
    /** The drill's typing-area UI, rendered in the main content area. */
    body: Snippet
    /** Set to true once the drill session is complete. Triggers stats panel. */
    sessionDone: boolean
    /** Stats to display when sessionDone. */
    wpm: number
    accuracy: number
    duration: number
    errorCount: number
    extraStats?: ExtraStat[]
    /** Passed through to VirtualKeyboard. */
    lastTypedChar: string | null
    lastTypedToken?: number
    forcedLayer?: string | null
    targetChar?: string | null
    /** The drill's keydown handler. DrillShell consumes Esc / Tab / modifier
     *  events and forwards everything else here. */
    onKey: (e: KeyboardEvent) => void
    /** When true (Flashcards behaviour), a single Esc on the stats panel
     *  immediately exits instead of requiring double-tap. Default: false. */
    singleEscOnDone?: boolean
    /** Passed to StatsPanel to color WPM green when target is met. */
    targetWpm?: number
    /** Called when the tab becomes hidden — drill should pause its engine. */
    onPause?: () => void
    /** Called when the tab becomes visible again — drill should resume its engine. */
    onResume?: () => void
  }

  let {
    onBack,
    onRestart,
    body,
    sessionDone,
    wpm,
    accuracy,
    duration,
    errorCount,
    extraStats = [],
    lastTypedChar,
    lastTypedToken = 0,
    forcedLayer = null,
    targetChar = null,
    onKey,
    singleEscOnDone = false,
    targetWpm = 0,
    onPause,
    onResume,
  }: Props = $props()

  let showKeyboard = $state(false)
  let escPendingUntil = $state(0)
  let escHintTimeout = $state<ReturnType<typeof setTimeout> | null>(null)
  let showEscHint = $state(false)

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (sessionDone) {
        if (singleEscOnDone) {
          onBack()
          return
        }
        // double-tap on stats panel: same logic as mid-drill
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
      // mid-drill double-tap
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

    // Block browser shortcuts (Ctrl/Cmd/Alt combos), allow refresh and devtools
    if (e.ctrlKey || e.metaKey || e.altKey) {
      const key = e.key.toLowerCase()
      const isRefresh = (e.ctrlKey || e.metaKey) && key === 'r'
      const isDevtools = (e.ctrlKey || e.metaKey) && (key === 'i' || key === 'j' || key === 'u')
      if (!isRefresh && !isDevtools) {
        e.preventDefault()
      }
      return
    }

    onKey(e)
  }

  function handleRestart() {
    // Reset shell state on restart
    showEscHint = false
    escPendingUntil = 0
    if (escHintTimeout) clearTimeout(escHintTimeout)
    if (onRestart) {
      onRestart()
    } else {
      onBack()
    }
  }

  function handleVisibilityChange() {
    // Reset double-tap Esc state on every visibility change to avoid
    // the known issue where alt-tabbing between two Esc taps drops the user out.
    escPendingUntil = 0
    showEscHint = false
    if (escHintTimeout) {
      clearTimeout(escHintTimeout)
      escHintTimeout = null
    }

    if (document.visibilityState === 'hidden') {
      onPause?.()
    } else {
      onResume?.()
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:document onvisibilitychange={handleVisibilityChange} />

{#if sessionDone}
  <StatsPanel
    {wpm}
    {accuracy}
    {duration}
    {errorCount}
    {extraStats}
    {targetWpm}
    onRestart={handleRestart}
    {onBack}
  />
{:else}
  <main class="min-h-screen bg-bg flex flex-col items-center justify-center px-4 gap-8">
    {@render body()}
    {#if showKeyboard}
      <VirtualKeyboard {lastTypedChar} {lastTypedToken} {forcedLayer} {targetChar} />
    {:else}
      <p class="font-mono text-xs" style="color: #646669;">tab to show keyboard</p>
    {/if}
    {#if showEscHint}
      <p class="font-mono text-xs" style="color: #e2b714;">press esc again to exit</p>
    {:else}
      <p class="font-mono text-xs" style="color: #646669;">press esc twice to exit</p>
    {/if}
  </main>
{/if}
