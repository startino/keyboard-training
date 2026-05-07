import { describe, it, expect } from 'bun:test'
import { clampStep } from './settings.svelte'

describe('clampStep', () => {
  it('clamps below min to min', () => {
    expect(clampStep(10, 14, 48, 2)).toBe(14)
  })

  it('clamps above max to max', () => {
    expect(clampStep(100, 14, 48, 2)).toBe(48)
  })

  it('rounds to nearest step', () => {
    // 21 rounded to step 2 → 22
    expect(clampStep(21, 14, 48, 2)).toBe(22)
  })

  it('keeps value already on a step boundary', () => {
    expect(clampStep(20, 14, 48, 2)).toBe(20)
  })

  it('rounds target wpm correctly with step 5', () => {
    // 62 rounded to step 5 → 60
    expect(clampStep(62, 20, 120, 5)).toBe(60)
    // 63 rounded to step 5 → 65
    expect(clampStep(63, 20, 120, 5)).toBe(65)
  })

  it('clamps and rounds simultaneously', () => {
    // 13 is below min 14; nearest step-2 is 14
    expect(clampStep(13, 14, 48, 2)).toBe(14)
  })
})
