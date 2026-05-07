<script lang="ts">
  interface ExtraStat {
    label: string
    value: string
  }

  interface Props {
    wpm: number
    accuracy: number
    duration: number
    errorCount: number
    extraStats?: ExtraStat[]
    targetWpm?: number
    onRestart: () => void
    onBack: () => void
  }

  let { wpm, accuracy, duration, errorCount, extraStats, targetWpm = 0, onRestart, onBack }: Props = $props()

  const wpmColor = $derived(wpm > 0 && targetWpm > 0 && wpm >= targetWpm ? '#4caf50' : '#e2b714')

  const wpmDelta = $derived(
    wpm > 0 && targetWpm > 0
      ? Math.round(wpm) - targetWpm
      : null
  )
  const wpmDeltaColor = $derived(wpmDelta !== null && wpmDelta >= 0 ? '#4caf50' : '#ca4754')

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }
</script>

<div class="stats-overlay">
  <div class="stats-panel">
    <div class="primary-stat">
      <span class="wpm-value" style:color={wpmColor}>{Math.round(wpm)}</span>
      <span class="wpm-label">wpm</span>
      {#if wpmDelta !== null}
        <span class="wpm-delta" style:color={wpmDeltaColor}>
          {wpmDelta >= 0 ? '+' : ''}{wpmDelta} vs target
        </span>
      {/if}
    </div>

    <div class="secondary-stats">
      <div class="stat-item">
        <span class="stat-value">{accuracy.toFixed(1)}%</span>
        <span class="stat-label">accuracy</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{formatDuration(duration)}</span>
        <span class="stat-label">time</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{errorCount}</span>
        <span class="stat-label">errors</span>
      </div>
    </div>

    {#if extraStats && extraStats.length > 0}
      <div class="extra-stats">
        {#each extraStats as stat}
          <div class="extra-stat-item">
            <span class="extra-stat-label">{stat.label}</span>
            <span class="extra-stat-value">{stat.value}</span>
          </div>
        {/each}
      </div>
    {/if}

    <div class="actions">
      <button class="btn" onclick={onRestart}>restart</button>
      <button class="btn btn-secondary" onclick={onBack}>back to menu</button>
    </div>
  </div>
</div>

<style>
  .stats-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .stats-panel {
    background: #2c2e31;
    color: #d1d0c5;
    border-radius: 16px;
    padding: 48px;
    min-width: 360px;
    max-width: 480px;
    text-align: center;
    font-family: 'Roboto Mono', ui-monospace, monospace;
  }

  .primary-stat {
    margin-bottom: 32px;
  }

  .wpm-value {
    font-size: 72px;
    font-weight: 700;
    display: block;
    line-height: 1;
    transition: color 0.2s;
  }

  .wpm-label {
    font-size: 18px;
    color: #646669;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .wpm-delta {
    display: block;
    font-size: 13px;
    margin-top: 4px;
    letter-spacing: 0.5px;
  }

  .secondary-stats {
    display: flex;
    justify-content: center;
    gap: 32px;
    margin-bottom: 24px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 500;
    color: #d1d0c5;
  }

  .stat-label {
    font-size: 12px;
    color: #646669;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .extra-stats {
    border-top: 1px solid #646669;
    margin-top: 16px;
    padding-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .extra-stat-item {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
  }

  .extra-stat-label {
    color: #646669;
  }

  .extra-stat-value {
    color: #d1d0c5;
  }

  .actions {
    margin-top: 32px;
    display: flex;
    gap: 16px;
    justify-content: center;
  }

  .btn {
    font-family: 'Roboto Mono', ui-monospace, monospace;
    font-size: 14px;
    padding: 10px 24px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    background: #e2b714;
    color: #323437;
    font-weight: 500;
    transition: opacity 0.15s;
  }

  .btn:hover {
    opacity: 0.85;
  }

  .btn-secondary {
    background: #646669;
    color: #d1d0c5;
  }
</style>
