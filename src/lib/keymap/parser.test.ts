import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseKeymap } from './parser'

const keymapPath = resolve(import.meta.dir, 'default.keymap')
const keymapRaw = readFileSync(keymapPath, 'utf-8')

describe('parseKeymap', () => {
  it('should parse without throwing', () => {
    expect(() => parseKeymap(keymapRaw)).not.toThrow()
  })

  it('should find at least one layer', () => {
    const result = parseKeymap(keymapRaw)
    expect(result.layers.length).toBeGreaterThan(0)
  })

  it('should have keys in each layer', () => {
    const result = parseKeymap(keymapRaw)
    for (const layer of result.layers) {
      expect(layer.keys.length).toBeGreaterThan(0)
    }
  })

  it('should have 30 keys per layer (36-key layout minus thumbs)', () => {
    const result = parseKeymap(keymapRaw)
    for (const layer of result.layers) {
      expect(layer.keys.length).toBe(30)
    }
  })

  it('should assign correct finger for each key', () => {
    const result = parseKeymap(keymapRaw)
    const validFingers = ['LP', 'LR', 'LM', 'LI', 'LT', 'RT', 'RI', 'RM', 'RR', 'RP']
    for (const layer of result.layers) {
      for (const key of layer.keys) {
        expect(validFingers).toContain(key.finger)
      }
    }
  })

  it('should extract thumb cluster keys', () => {
    const result = parseKeymap(keymapRaw)
    expect(result.thumbCluster.length).toBe(6)
  })

  it('should assign correct thumb fingers', () => {
    const result = parseKeymap(keymapRaw)
    const validThumbFingers = ['LT1', 'LT2', 'LT3', 'RT1', 'RT2', 'RT3']
    for (const thumb of result.thumbCluster) {
      expect(validThumbFingers).toContain(thumb.finger)
    }
  })

  it('should detect home-row mods', () => {
    const result = parseKeymap(keymapRaw)
    expect(result.homeRowMods.length).toBeGreaterThan(0)
  })

  it('should detect combos', () => {
    const result = parseKeymap(keymapRaw)
    expect(result.combos.length).toBeGreaterThan(0)
  })

  it('should parse layer names', () => {
    const result = parseKeymap(keymapRaw)
    expect(result.layers[0].name).toBe('home')
  })

  it('should parse home layer first key correctly (SEMICOLON)', () => {
    const result = parseKeymap(keymapRaw)
    const homeLayer = result.layers[0]
    expect(homeLayer.keys[0].tap).toBe('SEMICOLON')
    expect(homeLayer.keys[0].position).toBe(0)
    expect(homeLayer.keys[0].row).toBe(0)
    expect(homeLayer.keys[0].col).toBe(0)
    expect(homeLayer.keys[0].finger).toBe('LP')
  })

  it('should parse hold-tap bindings correctly', () => {
    const result = parseKeymap(keymapRaw)
    const homeLayer = result.layers[0]
    // Home row first key: &shifthr LGUI A
    const keyA = homeLayer.keys[10] // position 10, row 1, col 0
    expect(keyA.tap).toBe('A')
    expect(keyA.hold).toBe('LGUI')
  })

  it('should parse &lt bindings with layer hold', () => {
    const result = parseKeymap(keymapRaw)
    // Thumb keys from home layer: &lt 1 BACKSPACE
    const thumb = result.thumbCluster.find((t) => t.tap === 'BACKSPACE')
    expect(thumb).toBeDefined()
    expect(thumb!.hold).toBe('LAYER_1')
  })

  it('should throw on empty input', () => {
    expect(() => parseKeymap('')).toThrow()
  })

  it('should throw on invalid keymap', () => {
    expect(() => parseKeymap('not a keymap')).toThrow()
  })
})
