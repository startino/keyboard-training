export type CharState = 'ahead' | 'correct' | 'incorrect' | 'current'

export interface EngineChar {
  char: string
  state: CharState
  typedChar?: string
}

export interface EngineState {
  chars: EngineChar[]
  cursor: number
  startTime: number | null
  endTime: number | null
  errors: number[]
  totalTyped: number
}

export class TypingEngine {
  state = $state<EngineState>({
    chars: [],
    cursor: 0,
    startTime: null,
    endTime: null,
    errors: [],
    totalTyped: 0,
  })
  private _onComplete?: () => void
  private _onError?: (index: number, expected: string, typed: string) => void

  constructor(text: string) {
    this.state = this.buildState(text)
  }

  private buildState(text: string): EngineState {
    const chars: EngineChar[] = text.split('').map((char) => ({
      char,
      state: 'ahead' as CharState,
    }))
    if (chars.length > 0) {
      chars[0].state = 'current'
    }
    return {
      chars,
      cursor: 0,
      startTime: null,
      endTime: null,
      errors: [],
      totalTyped: 0,
    }
  }

  set onComplete(cb: (() => void) | undefined) {
    this._onComplete = cb
  }

  set onError(cb: ((index: number, expected: string, typed: string) => void) | undefined) {
    this._onError = cb
  }

  handleKeypress(key: string): void {
    if (this.isComplete()) return

    // Backspace
    if (key === 'Backspace') {
      if (this.state.cursor > 0) {
        // Reset current cursor position to 'ahead'
        this.state.chars[this.state.cursor].state = 'ahead'
        this.state.cursor--
        // Reset the char we moved back to
        this.state.chars[this.state.cursor].state = 'current'
        this.state.chars[this.state.cursor].typedChar = undefined
      }
      return
    }

    // Tab — ignore
    if (key === 'Tab') return

    // Enter — treat as newline if expected, else ignore
    if (key === 'Enter') {
      if (this.state.chars[this.state.cursor].char === '\n') {
        this.typeChar('\n')
      }
      return
    }

    // Printable character (length 1)
    if (key.length === 1) {
      this.typeChar(key)
    }
  }

  private typeChar(key: string): void {
    if (this.isComplete()) return

    // Start timer on first keypress
    if (this.state.startTime === null) {
      this.state.startTime = Date.now()
    }

    this.state.totalTyped++
    const current = this.state.chars[this.state.cursor]

    if (key === current.char) {
      current.state = 'correct'
    } else {
      current.state = 'incorrect'
      current.typedChar = key
      this.state.errors.push(this.state.cursor)
      this._onError?.(this.state.cursor, current.char, key)
    }

    this.state.cursor++

    if (this.state.cursor >= this.state.chars.length) {
      // Complete
      this.state.endTime = Date.now()
      this._onComplete?.()
    } else {
      this.state.chars[this.state.cursor].state = 'current'
    }
  }

  getChars(): EngineChar[] {
    return this.state.chars
  }

  getCursor(): number {
    return this.state.cursor
  }

  getState(): EngineState {
    return this.state
  }

  getWpm(): number {
    const elapsed = this.getElapsedMs()
    if (elapsed === 0) return 0
    const correctChars = this.state.chars.filter((c) => c.state === 'correct').length
    const minutes = elapsed / 60000
    return (correctChars / 5) / minutes
  }

  getAccuracy(): number {
    if (this.state.totalTyped === 0) return 100
    const correctCount = this.state.chars.filter((c) => c.state === 'correct').length
    return (correctCount / this.state.totalTyped) * 100
  }

  getElapsedMs(): number {
    if (this.state.startTime === null) return 0
    const end = this.state.endTime ?? Date.now()
    return end - this.state.startTime
  }

  getErrorCount(): number {
    return this.state.errors.length
  }

  isComplete(): boolean {
    return this.state.cursor >= this.state.chars.length
  }

  reset(newText?: string): void {
    if (newText !== undefined) {
      this.state = this.buildState(newText)
    } else {
      const text = this.state.chars.map((c) => c.char).join('')
      this.state = this.buildState(text)
    }
  }
}
