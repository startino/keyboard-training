import { describe, it, expect, beforeEach } from 'bun:test'
import { TypingEngine } from './typingEngine.svelte'

describe('TypingEngine', () => {
  let engine: TypingEngine

  beforeEach(() => {
    engine = new TypingEngine('hello')
  })

  it('should initialize with correct state', () => {
    const chars = engine.getChars()
    expect(chars.length).toBe(5)
    expect(chars[0].state).toBe('current')
    expect(chars[1].state).toBe('ahead')
    expect(engine.getCursor()).toBe(0)
    expect(engine.isComplete()).toBe(false)
  })

  it('should advance cursor on correct char', () => {
    engine.handleKeypress('h')
    const chars = engine.getChars()
    expect(chars[0].state).toBe('correct')
    expect(chars[1].state).toBe('current')
    expect(engine.getCursor()).toBe(1)
  })

  it('should mark incorrect and store typedChar on wrong char', () => {
    engine.handleKeypress('x')
    const chars = engine.getChars()
    expect(chars[0].state).toBe('incorrect')
    expect(chars[0].typedChar).toBe('x')
    expect(engine.getCursor()).toBe(1)
  })

  it('should handle backspace', () => {
    engine.handleKeypress('h')
    engine.handleKeypress('x') // wrong 'e'
    expect(engine.getCursor()).toBe(2)

    engine.handleKeypress('Backspace')
    const chars = engine.getChars()
    expect(engine.getCursor()).toBe(1)
    expect(chars[1].state).toBe('current')
    expect(chars[1].typedChar).toBeUndefined()
    expect(chars[2].state).toBe('ahead')
  })

  it('should not backspace past start', () => {
    engine.handleKeypress('Backspace')
    expect(engine.getCursor()).toBe(0)
  })

  it('should calculate WPM', () => {
    // Manually set start time to control timing
    const state = engine.getState()
    state.startTime = Date.now() - 60000 // 1 minute ago

    // Type all correct
    engine.handleKeypress('h')
    engine.handleKeypress('e')
    engine.handleKeypress('l')
    engine.handleKeypress('l')
    engine.handleKeypress('o')

    const wpm = engine.getWpm()
    // 5 correct chars / 5 = 1 word, over ~1 minute = ~1 WPM
    expect(wpm).toBeGreaterThan(0.9)
    expect(wpm).toBeLessThan(1.2)
  })

  it('should calculate accuracy', () => {
    engine.handleKeypress('h') // correct
    engine.handleKeypress('x') // incorrect
    engine.handleKeypress('l') // correct
    engine.handleKeypress('l') // correct
    engine.handleKeypress('o') // correct

    const accuracy = engine.getAccuracy()
    // 4 correct / 5 total = 80%
    expect(accuracy).toBe(80)
  })

  it('should fire onComplete when all chars typed', () => {
    let completed = false
    engine.onComplete = () => {
      completed = true
    }

    engine.handleKeypress('h')
    engine.handleKeypress('e')
    engine.handleKeypress('l')
    engine.handleKeypress('l')
    engine.handleKeypress('o')

    expect(completed).toBe(true)
    expect(engine.isComplete()).toBe(true)
  })

  it('should fire onError on incorrect char', () => {
    let errorIndex = -1
    let expectedChar = ''
    let typedChar = ''

    engine.onError = (index, expected, typed) => {
      errorIndex = index
      expectedChar = expected
      typedChar = typed
    }

    engine.handleKeypress('x')

    expect(errorIndex).toBe(0)
    expect(expectedChar).toBe('h')
    expect(typedChar).toBe('x')
  })

  it('should ignore tab', () => {
    engine.handleKeypress('Tab')
    expect(engine.getCursor()).toBe(0)
  })

  it('should handle enter as newline when expected', () => {
    const nlEngine = new TypingEngine('a\nb')
    nlEngine.handleKeypress('a')
    nlEngine.handleKeypress('Enter')
    expect(nlEngine.getCursor()).toBe(2)
    expect(nlEngine.getChars()[1].state).toBe('correct')
  })

  it('should ignore enter when newline not expected', () => {
    engine.handleKeypress('Enter')
    expect(engine.getCursor()).toBe(0)
  })

  it('should reset with same text', () => {
    engine.handleKeypress('h')
    engine.handleKeypress('e')
    engine.reset()

    expect(engine.getCursor()).toBe(0)
    expect(engine.getChars()[0].state).toBe('current')
    expect(engine.getChars().length).toBe(5)
    expect(engine.isComplete()).toBe(false)
  })

  it('should reset with new text', () => {
    engine.handleKeypress('h')
    engine.reset('world')

    expect(engine.getCursor()).toBe(0)
    expect(engine.getChars().length).toBe(5)
    expect(engine.getChars()[0].char).toBe('w')
  })

  it('should not accept input after completion', () => {
    engine.handleKeypress('h')
    engine.handleKeypress('e')
    engine.handleKeypress('l')
    engine.handleKeypress('l')
    engine.handleKeypress('o')

    expect(engine.isComplete()).toBe(true)
    engine.handleKeypress('x')
    expect(engine.getCursor()).toBe(5) // unchanged
  })

  it('should ignore keystrokes while paused', () => {
    // Start the engine by typing one char first (sets startTime)
    engine.handleKeypress('h')
    expect(engine.getCursor()).toBe(1)

    engine.pause()
    expect(engine.isPaused).toBe(true)

    // Typing while paused should have no effect
    engine.handleKeypress('e')
    expect(engine.getCursor()).toBe(1)

    engine.resume()
    expect(engine.isPaused).toBe(false)

    // After resume, typing works again
    engine.handleKeypress('e')
    expect(engine.getCursor()).toBe(2)
  })

  it('pause/resume should not corrupt timing when startTime is null', () => {
    // Pausing before any keypress (no startTime) should be a no-op
    engine.pause()
    expect(engine.isPaused).toBe(false) // no startTime → pause ignored
    engine.resume()
    expect(engine.isPaused).toBe(false)
  })

  it('should return 100% accuracy when nothing typed', () => {
    expect(engine.getAccuracy()).toBe(100)
  })

  it('should track error count', () => {
    engine.handleKeypress('x') // error
    engine.handleKeypress('e') // correct
    engine.handleKeypress('x') // error

    expect(engine.getErrorCount()).toBe(2)
  })
})
