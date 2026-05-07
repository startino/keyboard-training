<script lang="ts">
  import type { SessionStats } from '../stats'
  import { sparklineValues, toPolylinePoints } from './sparklineHelpers'

  interface Props {
    sessions: SessionStats[]
    drillId: string
    width?: number
    height?: number
  }

  let { sessions, drillId, width = 80, height = 24 }: Props = $props()

  const values = $derived(sparklineValues(sessions, drillId))
  const points = $derived(toPolylinePoints(values, width, height))
</script>

{#if points}
  <svg
    {width}
    {height}
    viewBox="0 0 {width} {height}"
    aria-hidden="true"
    style="display: block; overflow: visible;"
  >
    <polyline
      {points}
      fill="none"
      stroke="#e2b714"
      stroke-width="1.5"
      stroke-linejoin="round"
      stroke-linecap="round"
      opacity="0.6"
    />
  </svg>
{/if}
