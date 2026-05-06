<script lang="ts">
  import KeymapUpload from './lib/components/KeymapUpload.svelte'
  import Flashcards from './lib/drills/Flashcards.svelte'
  import Thumbs from './lib/drills/Thumbs.svelte'
  import ChatProse from './lib/drills/ChatProse.svelte'
  import { getLastSession } from './lib/stats'

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

  function handleClick(drillId: 'flashcards' | 'thumbs' | 'chat') {
    activeDrill = drillId
  }

  function handleBack() {
    activeDrill = null
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
  <Flashcards onBack={handleBack} />
{:else if activeDrill === 'thumbs'}
  <Thumbs onBack={handleBack} />
{:else if activeDrill === 'chat'}
  <ChatProse onBack={handleBack} />
{:else}
  <main class="min-h-screen bg-bg text-text font-mono flex flex-col items-center justify-center px-4 gap-12">
    <h1 class="text-4xl font-bold text-accent">Keyboard Training</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
      {#each drills as drill}
        {@const lastSession = getLastSession(drill.id)}
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
        </button>
      {/each}
    </div>

    <KeymapUpload />
  </main>
{/if}
