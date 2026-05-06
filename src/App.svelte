<script lang="ts">
  function handleClick(drill: string) {
    console.log(`Selected drill: ${drill}`)
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

<main class="min-h-screen bg-bg text-text font-mono flex flex-col items-center justify-center px-4">
  <h1 class="text-4xl font-bold text-accent mb-12">Keyboard Training</h1>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
    <button
      onclick={() => handleClick('flashcards')}
      class="bg-card rounded-xl p-8 text-left hover:ring-2 hover:ring-accent transition-all cursor-pointer"
    >
      <h2 class="text-xl font-bold text-accent mb-3">Flashcards</h2>
      <p class="text-text/70 text-sm">Practice individual key positions and combos with spaced repetition.</p>
    </button>

    <button
      onclick={() => handleClick('thumbs')}
      class="bg-card rounded-xl p-8 text-left hover:ring-2 hover:ring-accent transition-all cursor-pointer"
    >
      <h2 class="text-xl font-bold text-accent mb-3">Thumbs</h2>
      <p class="text-text/70 text-sm">Train thumb cluster muscle memory for layers and modifiers.</p>
    </button>

    <button
      onclick={() => handleClick('chat-prose')}
      class="bg-card rounded-xl p-8 text-left hover:ring-2 hover:ring-accent transition-all cursor-pointer"
    >
      <h2 class="text-xl font-bold text-accent mb-3">Chat Prose</h2>
      <p class="text-text/70 text-sm">Type full sentences and paragraphs to build real-world speed.</p>
    </button>
  </div>
</main>
