<script lang="ts">
  import type { EngineChar } from '../engine/typingEngine.svelte'

  interface Props {
    chars: EngineChar[]
    cursor: number
    fontSizePx?: number
  }

  let { chars, cursor, fontSizePx = 20 }: Props = $props()

  let containerEl: HTMLDivElement | undefined = $state()

  // Auto-scroll to keep cursor in view
  $effect(() => {
    if (!containerEl) return
    // Track cursor changes
    void cursor
    const caretEl = containerEl.querySelector('[data-caret]')
    if (caretEl) {
      const containerRect = containerEl.getBoundingClientRect()
      const caretRect = caretEl.getBoundingClientRect()
      const relativeTop = caretRect.top - containerRect.top
      const lineHeight = fontSizePx * 1.6

      // Scroll so the cursor line is at the top visible line
      if (relativeTop > lineHeight * 2 || relativeTop < 0) {
        containerEl.scrollTop += relativeTop - lineHeight * 0.5
      }
    }
  })

  function charColor(ch: EngineChar): string {
    switch (ch.state) {
      case 'ahead':
        return '#646669'
      case 'correct':
        return '#d1d0c5'
      case 'incorrect':
        return '#ca4754'
      case 'current':
        return '#646669'
      default:
        return '#d1d0c5'
    }
  }

  function displayChar(ch: EngineChar): string {
    if (ch.state === 'incorrect' && ch.typedChar !== undefined) {
      // Show the wrong char that was typed
      if (ch.typedChar === ' ' || ch.char === ' ') return ch.typedChar === ' ' ? ' ' : ch.typedChar
      return ch.typedChar
    }
    if (ch.char === ' ') return ' ' // regular space; .space-char inline-block preserves visual gap
    if (ch.char === '\n') return '↵\n'
    return ch.char
  }

  // Group chars into word-segments so the browser wraps between words, not mid-word.
  // Each segment is either a run of non-space chars (a "word") or a single space/newline.
  interface Segment {
    indices: number[]
    isWord: boolean
  }

  let segments = $derived((): Segment[] => {
    const result: Segment[] = []
    let wordIndices: number[] = []

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]
      if (ch.char === ' ' || ch.char === '\n') {
        if (wordIndices.length > 0) {
          result.push({ indices: wordIndices, isWord: true })
          wordIndices = []
        }
        result.push({ indices: [i], isWord: false })
      } else {
        wordIndices.push(i)
      }
    }
    if (wordIndices.length > 0) {
      result.push({ indices: wordIndices, isWord: true })
    }
    return result
  })
</script>

<div
  bind:this={containerEl}
  class="typing-display"
  style:font-size="{fontSizePx}px"
  style:line-height="{fontSizePx * 1.6}px"
  style:max-height="{fontSizePx * 1.6 * 3}px"
>
  {#each segments() as seg}
    {#if seg.isWord}
      <span class="word">{#each seg.indices as i}{#if i === cursor}<span data-caret class="caret"></span>{/if}<span
          class="char"
          class:incorrect-underline={chars[i].state === 'incorrect'}
          style:color={charColor(chars[i])}
        >{displayChar(chars[i])}</span>{/each}</span>
    {:else}
      {#each seg.indices as i}
        {#if i === cursor}<span data-caret class="caret"></span>{/if}<span
          class="char space-char"
          class:incorrect-underline={chars[i].state === 'incorrect'}
          style:color={charColor(chars[i])}
        >{displayChar(chars[i])}</span>
      {/each}
    {/if}
  {/each}
  {#if cursor >= chars.length}
    <span data-caret class="caret"></span>
  {/if}
</div>

<style>
  .typing-display {
    font-family: 'Roboto Mono', ui-monospace, monospace;
    overflow-wrap: break-word;
    overflow: hidden;
    position: relative;
    width: 100%;
  }

  /* Word spans prevent mid-word line breaks */
  .word {
    display: inline-block;
    white-space: nowrap;
  }

  .char {
    position: relative;
  }

  /* Space/newline chars: never add underline decoration */
  .space-char {
    display: inline-block;
    text-decoration: none !important;
  }

  .incorrect-underline {
    text-decoration: underline;
    text-decoration-color: #ca4754;
    text-underline-offset: 3px;
  }

  .caret {
    display: inline-block;
    width: 2px;
    height: 1em;
    background-color: #e2b714;
    vertical-align: text-bottom;
    margin-left: -1px;
    margin-right: -1px;
    animation: blink 1060ms step-end infinite;
  }

  @keyframes blink {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
</style>
