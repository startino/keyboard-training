<script lang="ts">
  import {
    getKeymapName,
    getError,
    loadFromString,
    reset,
    clearError,
  } from '../keymap/store.svelte'

  let dragOver = $state(false)
  let errorTimeout: ReturnType<typeof setTimeout> | null = null

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const ok = loadFromString(text, file.name)
      if (!ok) {
        // Auto-clear error after 3 seconds
        if (errorTimeout) clearTimeout(errorTimeout)
        errorTimeout = setTimeout(() => {
          clearError()
        }, 3000)
      }
    }
    reader.readAsText(file)
  }

  function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files && input.files[0]) {
      handleFile(input.files[0])
      input.value = '' // reset so same file can be re-uploaded
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragOver = false
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    dragOver = true
  }

  function onDragLeave() {
    dragOver = false
  }

  function handleReset() {
    reset()
  }
</script>

<div class="keymap-upload">
  <div class="keymap-header">
    <span class="keymap-label">Keymap:</span>
    <span class="keymap-name">{getKeymapName()}</span>
    {#if getKeymapName() !== 'Default (eksno corne)'}
      <button class="reset-btn" onclick={handleReset}>Reset to default</button>
    {/if}
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="drop-zone"
    class:drag-active={dragOver}
    ondrop={onDrop}
    ondragover={onDragOver}
    ondragleave={onDragLeave}
  >
    <label class="drop-label">
      <input type="file" accept=".keymap" onchange={onFileInput} class="file-input" />
      <span class="drop-text">
        {#if dragOver}
          Drop keymap file here
        {:else}
          Drag .keymap file here or <span class="browse-link">browse</span>
        {/if}
      </span>
    </label>
  </div>

  {#if getError()}
    <p class="error-text">{getError()}</p>
  {/if}
</div>

<style>
  .keymap-upload {
    width: 100%;
    max-width: 480px;
    font-family: 'Roboto Mono', ui-monospace, monospace;
  }

  .keymap-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .keymap-label {
    color: #646669;
    font-size: 13px;
  }

  .keymap-name {
    color: #d1d0c5;
    font-size: 13px;
    font-weight: 500;
  }

  .reset-btn {
    font-family: 'Roboto Mono', ui-monospace, monospace;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid #646669;
    background: transparent;
    color: #646669;
    cursor: pointer;
    transition: all 0.15s;
  }

  .reset-btn:hover {
    border-color: #d1d0c5;
    color: #d1d0c5;
  }

  .drop-zone {
    border: 2px dashed #646669;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    transition: all 0.15s;
    cursor: pointer;
  }

  .drop-zone:hover,
  .drag-active {
    border-color: #e2b714;
    background: rgba(226, 183, 20, 0.05);
  }

  .drop-label {
    cursor: pointer;
    display: block;
  }

  .file-input {
    display: none;
  }

  .drop-text {
    color: #646669;
    font-size: 13px;
  }

  .browse-link {
    color: #e2b714;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .error-text {
    color: #ca4754;
    font-size: 13px;
    margin-top: 8px;
  }
</style>
