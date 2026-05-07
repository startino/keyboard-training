import { describe, it, expect } from 'bun:test'
import { normalizeCustomText } from './chatProseHelpers'

describe('normalizeCustomText', () => {
  it('strips surrounding whitespace', () => {
    expect(normalizeCustomText('  hello  ')).toBe('hello')
  })

  it('collapses multiple spaces into one', () => {
    expect(normalizeCustomText('foo   bar')).toBe('foo bar')
  })

  it('collapses tabs into a single space', () => {
    expect(normalizeCustomText('foo\t\tbar')).toBe('foo bar')
  })

  it('handles mixed tabs and spaces', () => {
    expect(normalizeCustomText('foo \t bar')).toBe('foo bar')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeCustomText('   ')).toBe('')
    expect(normalizeCustomText('\t\t')).toBe('')
    expect(normalizeCustomText('')).toBe('')
  })

  it('preserves internal single spaces', () => {
    expect(normalizeCustomText('the quick brown fox')).toBe('the quick brown fox')
  })

  it('does not strip internal newlines (only tabs and spaces)', () => {
    // normalizeCustomText collapses tabs+spaces but not newlines
    const result = normalizeCustomText('line one\nline two')
    expect(result).toBe('line one\nline two')
  })
})
