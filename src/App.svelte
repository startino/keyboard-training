<script lang="ts">
  import KeymapUpload from './lib/components/KeymapUpload.svelte'
  import Flashcards from './lib/drills/Flashcards.svelte'
  import Thumbs from './lib/drills/Thumbs.svelte'
  import ChatProse from './lib/drills/ChatProse.svelte'
  import SettingsPanel from './lib/components/SettingsPanel.svelte'
  import Sparkline from './lib/components/Sparkline.svelte'
  import { getLastSession, getRecentSessions, type SessionStats } from './lib/stats'
  import { getWeakestKeys } from './lib/keyStats.svelte'
  import { settings } from './lib/settings.svelte'

  interface DrillInfo {
    id: 'flashcards' | 'thumbs' | 'chat'
    title: string
    description: string
  }

  const drills: DrillInfo[] = [
    {
      id: 'flashcards',
      title: 'Flashcards',
      description: 'Practice individual key positions and combos with spaced repetition.',
    },
    {
      id: 'thumbs',
      title: 'Thumbs',
      description: 'Train thumb cluster muscle memory for layers and modifiers.',
    },
    {
      id: 'chat',
      title: 'Chat Prose',
      description: 'Type full sentences and paragraphs to build real-world speed.',
    },
  ]

  let activeDrill: 'flashcards' | 'thumbs' | 'chat' | null = $state(null)
  let showSettings = $state(false)

  // Snapshotted on every return to home so the stats panel always reflects the
  // most recent completed session even if Svelte patches the home block in place.
  let lastSessions = $state<Record<string, SessionStats | null>>({
    flashcards: getLastSession('flashcards'),
    thumbs: getLastSession('thumbs'),
    chat: getLastSession('chat'),
  })

  let recentSessions = $state<Record<string, SessionStats[]>>({
    flashcards: getRecentSessions('flashcards', 20),
    thumbs: getRecentSessions('thumbs', 20),
    chat: getRecentSessions('chat', 20),
  })

  function handleClick(drillId: 'flashcards' | 'thumbs' | 'chat') {
    activeDrill = drillId
  }

  // Snapshot of weak keys — refreshed on return from any drill
  let weakKeys = $state(getWeakestKeys(5, 10))

  function handleBack() {
    activeDrill = null
    // Refresh snapshots so the home screen shows stats from the just-completed session
    lastSessions = {
      flashcards: getLastSession('flashcards'),
      thumbs: getLastSession('thumbs'),
      chat: getLastSession('chat'),
    }
    recentSessions = {
      flashcards: getRecentSessions('flashcards', 20),
      thumbs: getRecentSessions('thumbs', 20),
      chat: getRecentSessions('chat', 20),
    }
    weakKeys = getWeakestKeys(5, 10)
  }

  function formatWpm(wpm: number): string {
    return `${Math.round(wpm)} wpm`
  }

  function formatAccuracy(accuracy: number): string {
    return `${accuracy.toFixed(0)}%`
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

{#if activeDrill === 'flashcards'}
  <Flashcards onBack={handleBack} targetWpm={settings.targetWpm} />
{:else if activeDrill === 'thumbs'}
  <Thumbs onBack={handleBack} fontSizePx={settings.fontSizePx} targetWpm={settings.targetWpm} />
{:else if activeDrill === 'chat'}
  <ChatProse onBack={handleBack} fontSizePx={settings.fontSizePx} targetWpm={settings.targetWpm} />
{:else}
  <main class="min-h-screen bg-bg text-text font-mono flex flex-col items-center justify-center px-4 gap-12">
    <!-- Settings gear button -->
    <button
      onclick={() => (showSettings = !showSettings)}
      class="fixed top-4 right-4 font-mono text-lg px-2 py-1 rounded transition-colors"
      style={showSettings
        ? 'color: #e2b714; background: transparent; border: none; cursor: pointer;'
        : 'color: #646669; background: transparent; border: none; cursor: pointer;'}
      aria-label="Open settings"
      title="Settings"
    >⚙</button>

    {#if showSettings}
      <SettingsPanel onClose={() => (showSettings = false)} />
    {/if}

    <h1 class="text-4xl font-bold text-accent">Keyboard Training</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
      {#each drills as drill}
        {@const lastSession = lastSessions[drill.id]}
        {@const sessions = recentSessions[drill.id]}
        <button
          onclick={() => handleClick(drill.id)}
          class="bg-card rounded-xl p-8 text-left hover:ring-2 hover:ring-accent transition-all cursor-pointer"
        >
          <h2 class="text-xl font-bold text-accent mb-3">{drill.title}</h2>
          <p class="text-text/70 text-sm">{drill.description}</p>
          {#if lastSession}
            <div class="mt-4 pt-3 border-t border-text/10 flex gap-4 text-xs text-text/50">
              {#if lastSession.wpm > 0}
                <span>{formatWpm(lastSession.wpm)}</span>
              {/if}
              <span>{formatAccuracy(lastSession.accuracy)}</span>
            </div>
          {/if}
          <!-- Sparkline: pointer-events-none so it doesn't steal click -->
          <div class="pointer-events-none mt-2">
            <Sparkline {sessions} drillId={drill.id} />
          </div>
        </button>
      {/each}
    </div>

    <!-- Weak keys panel -->
    <div class="bg-card rounded-xl p-6 max-w-4xl w-full">
      <h2 class="text-sm font-bold font-mono mb-4" style="color: #e2b714;">Weak keys</h2>
      {#if weakKeys.length === 0}
        <p class="font-mono text-xs" style="color: #646669;">
          Train a few sessions to see your weakest keys.
        </p>
      {:else}
        <div class="flex gap-6 flex-wrap">
          {#each weakKeys as stat}
            <div class="flex flex-col items-center gap-1">
              <span class="font-mono font-bold" style="font-size: 2rem; color: #d1d0c5;">
                {stat.char === ' ' ? '␣' : stat.char}
              </span>
              <span class="font-mono text-xs" style="color: #ca4754;">
                {(stat.errorRateEwma * 100).toFixed(0)}% errors
              </span>
              <span class="font-mono text-xs" style="color: #646669;">
                {Math.round(stat.latencyEwmaMs)}ms
              </span>
              <span class="font-mono text-xs" style="color: #3c3c3c;">
                {stat.attempts} attempts
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <KeymapUpload />
  </main>
{/if}
