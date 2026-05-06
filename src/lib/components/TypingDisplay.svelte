<script lang="ts">
  import type { EngineChar } from '../engine/typingEngine'

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
    }
  }

  function displayChar(ch: EngineChar): string {
    if (ch.state === 'incorrect' && ch.typedChar !== undefined) {
      // Show the wrong char that was typed
      if (ch.typedChar === ' ' || ch.char === ' ') return ch.typedChar === ' ' ? ' ' : ch.typedChar
      return ch.typedChar
    }
    if (ch.char === ' ') return ' '
    if (ch.char === '\n') return '↵\n'
    return ch.char
  }
</script>

<div
  bind:this={containerEl}
  class="typing-display"
  style:font-size="{fontSizePx}px"
  style:line-height="{fontSizePx * 1.6}px"
  style:max-height="{fontSizePx * 1.6 * 3}px"
>
  {#each chars as ch, i}
    {#if i === cursor}
      <span data-caret class="caret"></span>
    {/if}
    <span
      class="char"
      class:incorrect-underline={ch.state === 'incorrect'}
      style:color={charColor(ch)}
    >{displayChar(ch)}</span>
  {/each}
  {#if cursor >= chars.length}
    <span data-caret class="caret"></span>
  {/if}
</div>

<style>
  .typing-display {
    font-family: 'Roboto Mono', ui-monospace, monospace;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: hidden;
    position: relative;
    width: 100%;
  }

  .char {
    position: relative;
    white-space: pre-wrap;
  }

  .incorrect-underline {
    text-decoration: underline;
    text-decoration-color: #ca4754;
    text-underline-offset: 3px;
  }

  .caret {
    display: inline-block;
    width: 2px;
    height: 1.2em;
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
