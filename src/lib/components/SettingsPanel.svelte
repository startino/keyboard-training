<script lang="ts">
  import {
    settings,
    updateSettings,
    resetSettings,
    FONT_SIZE_MIN,
    FONT_SIZE_MAX,
    FONT_SIZE_STEP,
    TARGET_WPM_MIN,
    TARGET_WPM_MAX,
    TARGET_WPM_STEP,
  } from '../settings.svelte'

  interface Props {
    onClose: () => void
  }

  let { onClose }: Props = $props()
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }} />

<!-- Backdrop -->
<div
  class="settings-overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Settings"
  tabindex="-1"
>
  <!-- Click outside to close -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="settings-backdrop" role="none" onclick={onClose}></div>

  <div class="settings-panel">
    <div class="settings-header">
      <span class="settings-title">settings</span>
      <button class="settings-close" onclick={onClose} aria-label="Close settings">×</button>
    </div>

    <div class="settings-body">
      <!-- Font size -->
      <div class="setting-row">
        <label class="setting-label" for="font-size-input">
          font size
          <span class="setting-value">{settings.fontSizePx}px</span>
        </label>
        <input
          id="font-size-input"
          type="range"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={FONT_SIZE_STEP}
          value={settings.fontSizePx}
          oninput={(e) => updateSettings({ fontSizePx: Number((e.target as HTMLInputElement).value) })}
          class="setting-slider"
        />
      </div>

      <!-- Target WPM -->
      <div class="setting-row">
        <label class="setting-label" for="target-wpm-input">
          target wpm
          <span class="setting-value">{settings.targetWpm}</span>
        </label>
        <input
          id="target-wpm-input"
          type="range"
          min={TARGET_WPM_MIN}
          max={TARGET_WPM_MAX}
          step={TARGET_WPM_STEP}
          value={settings.targetWpm}
          oninput={(e) => updateSettings({ targetWpm: Number((e.target as HTMLInputElement).value) })}
          class="setting-slider"
        />
      </div>

      <!-- Default weakness bias -->
      <div class="setting-row">
        <label class="setting-label setting-label-row" for="weakness-bias-toggle">
          <span>flashcards weakness bias</span>
          <button
            id="weakness-bias-toggle"
            role="switch"
            aria-checked={settings.weaknessBiasDefault}
            onclick={() => updateSettings({ weaknessBiasDefault: !settings.weaknessBiasDefault })}
            class="toggle-btn"
            class:toggle-on={settings.weaknessBiasDefault}
          >
            {settings.weaknessBiasDefault ? 'on' : 'off'}
          </button>
        </label>
      </div>

      <!-- Reset to defaults -->
      <div class="setting-row setting-row-reset">
        <button class="reset-btn" onclick={resetSettings}>reset to defaults</button>
      </div>
    </div>
  </div>
</div>

<style>
  .settings-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 16px;
  }

  .settings-backdrop {
    position: absolute;
    inset: 0;
  }

  .settings-panel {
    position: relative;
    background: #2c2e31;
    color: #d1d0c5;
    border-radius: 12px;
    padding: 24px;
    min-width: 280px;
    font-family: 'Roboto Mono', ui-monospace, monospace;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    border: 1px solid #3c3c3c;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .settings-title {
    font-size: 14px;
    font-weight: 500;
    color: #e2b714;
    letter-spacing: 1px;
  }

  .settings-close {
    background: transparent;
    border: none;
    color: #646669;
    font-size: 20px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    font-family: inherit;
    transition: color 0.15s;
  }

  .settings-close:hover {
    color: #d1d0c5;
  }

  .settings-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .setting-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .setting-label {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #646669;
    text-transform: lowercase;
  }

  .setting-value {
    color: #d1d0c5;
    font-weight: 500;
  }

  .setting-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: #646669;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .setting-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #e2b714;
    cursor: pointer;
  }

  .setting-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #e2b714;
    cursor: pointer;
    border: none;
  }

  .setting-label-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .toggle-btn {
    font-family: 'Roboto Mono', ui-monospace, monospace;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 10px;
    border: 1px solid #646669;
    cursor: pointer;
    background: transparent;
    color: #646669;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .toggle-btn.toggle-on {
    border-color: #e2b714;
    color: #e2b714;
  }

  .setting-row-reset {
    padding-top: 4px;
    border-top: 1px solid #3c3c3c;
  }

  .reset-btn {
    font-family: 'Roboto Mono', ui-monospace, monospace;
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid #646669;
    cursor: pointer;
    background: transparent;
    color: #646669;
    transition: color 0.15s, border-color 0.15s;
    align-self: flex-start;
  }

  .reset-btn:hover {
    color: #d1d0c5;
    border-color: #d1d0c5;
  }
</style>
