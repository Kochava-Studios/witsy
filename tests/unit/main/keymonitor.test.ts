
import { expect, test, describe, vi } from 'vitest'
import { NativeShortcut } from '../../../src/types/index'
import KeyMonitor from '../../../src/main/keymonitor'

// Mock autolib
vi.mock('autolib', () => ({
  default: {
    startKeyMonitor: vi.fn(() => 0),
    stopKeyMonitor: vi.fn(() => 0),
    isKeyMonitorRunning: vi.fn(() => false),
  }
}))

// Mock config
vi.mock('../../../src/main/config', () => ({
  loadSettings: vi.fn(() => ({
    shortcuts: {}
  }))
}))

// Mock Monitor
vi.mock('../../../src/main/monitor', () => ({
  default: class MockMonitor {
    start() {}
    stop() {}
  }
}))

const platform = process.platform

const MODIFIER_KEY_CODES: Record<string, number> = platform === 'darwin' ? {
  rightCommand: 54,
  leftCommand: 55,
  rightShift: 60,
  leftShift: 56,
  rightOption: 61,
  leftOption: 58,
  rightControl: 62,
  leftControl: 59,
} : platform === 'linux' ? {
  rightCommand: 126,
  leftCommand: 125,
  rightShift: 54,
  leftShift: 42,
  rightOption: 100,
  leftOption: 56,
  rightControl: 97,
  leftControl: 29,
} : {
  rightCommand: 0x5C,
  leftCommand: 0x5B,
  rightShift: 0xA1,
  leftShift: 0xA0,
  rightOption: 0xA5,
  leftOption: 0xA4,
  rightControl: 0xA3,
  leftControl: 0xA2,
}

const KEY_CODES: Record<string, number> = platform === 'darwin' ? {
  A: 0, B: 11, C: 8, D: 2, E: 14, F: 3, G: 5, H: 4, I: 34, J: 38,
  K: 40, L: 37, M: 46, N: 45, O: 31, P: 35, Q: 12, R: 15, S: 1, T: 17,
  U: 32, V: 9, W: 13, X: 7, Y: 16, Z: 6,
  '0': 29, '1': 18, '2': 19, '3': 20, '4': 21,
  '5': 23, '6': 22, '7': 26, '8': 28, '9': 25,
  Space: 49,
  Return: 36,
  Tab: 48,
} : platform === 'linux' ? {
  A: 30, B: 48, C: 46, D: 32, E: 18, F: 33, G: 34, H: 35, I: 23, J: 36,
  K: 37, L: 38, M: 50, N: 49, O: 24, P: 25, Q: 16, R: 19, S: 31, T: 20,
  U: 22, V: 47, W: 17, X: 45, Y: 21, Z: 44,
  '0': 11, '1': 2, '2': 3, '3': 4, '4': 5,
  '5': 6, '6': 7, '7': 8, '8': 9, '9': 10,
  Space: 57,
  Return: 28,
  Tab: 15,
} : {
  A: 0x41, B: 0x42, C: 0x43, D: 0x44, E: 0x45, F: 0x46, G: 0x47, H: 0x48, I: 0x49, J: 0x4A,
  K: 0x4B, L: 0x4C, M: 0x4D, N: 0x4E, O: 0x4F, P: 0x50, Q: 0x51, R: 0x52, S: 0x53, T: 0x54,
  U: 0x55, V: 0x56, W: 0x57, X: 0x58, Y: 0x59, Z: 0x5A,
  '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
  '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
  Space: 0x20,
  Return: 0x0D,
  Tab: 0x09,
}

const createEvent = (type: 'down' | 'up' | 'flagsChanged', keyCode: number) => ({
  type,
  keyCode,
  flags: 0,
  isRepeat: false,
})

describe('KeyMonitor multi-modifier matching', () => {

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('delays multi-modifier activation and fires while still held', () => {
    const { monitor, onDown, onUp } = createMonitor()

    monitor.handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftOption))
    monitor.handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftCommand))

    vi.advanceTimersByTime(119)
    expect(onDown).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onDown).toHaveBeenCalledTimes(1)
    expect(onUp).not.toHaveBeenCalled()

    monitor.handleKeyEvent(createEvent('up', MODIFIER_KEY_CODES.leftCommand))
    expect(onUp).toHaveBeenCalledTimes(1)
  })

  test('fires a clean quick tap on release before the activation delay', () => {
    const { monitor, onDown, onUp } = createMonitor()

    monitor.handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftOption))
    monitor.handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftCommand))
    monitor.handleKeyEvent(createEvent('up', MODIFIER_KEY_CODES.leftCommand))

    expect(onDown).toHaveBeenCalledTimes(1)
    expect(onUp).toHaveBeenCalledTimes(1)
  })

  test('cancels multi-modifier activation when a regular key is pressed', () => {
    const { monitor, onDown, onUp } = createMonitor()

    monitor.handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftOption))
    monitor.handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftCommand))
    monitor.handleKeyEvent(createEvent('down', KEY_CODES.Tab))

    vi.advanceTimersByTime(120)

    expect(onDown).not.toHaveBeenCalled()
    expect(onUp).not.toHaveBeenCalled()
  })

  test('requires an exact modifier set for multi-modifier activation', () => {
    const { monitor, onDown, onUp } = createMonitor()

    monitor.handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftOption))
    monitor.handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftCommand))
    monitor.handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftShift))

    vi.advanceTimersByTime(120)

    expect(onDown).not.toHaveBeenCalled()
    expect(onUp).not.toHaveBeenCalled()
  })

  test('requires an exact modifier set for native modifier plus key shortcuts', () => {
    const onDown = vi.fn()
    const monitor = new KeyMonitor({} as any, {
      dictation: { onDown, onUp: vi.fn() },
    } as any)
    const shortcut = KeyMonitor.parseNativeShortcut({ type: 'native', leftOption: true, leftCommand: true, key: 'Space' })!
    shortcut.name = 'dictation'
    ;(monitor as any).nativeShortcuts = [shortcut]

    ;(monitor as any).handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftOption))
    ;(monitor as any).handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftCommand))
    ;(monitor as any).handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftShift))
    ;(monitor as any).handleKeyEvent(createEvent('down', KEY_CODES.Space))

    expect(onDown).not.toHaveBeenCalled()
  })

  test('releases an active modifier-only shortcut when it becomes a chord', () => {
    const onDown = vi.fn()
    const onUp = vi.fn()
    const monitor = new KeyMonitor({} as any, {
      dictation: { onDown, onUp },
    } as any)
    const shortcut = KeyMonitor.parseNativeShortcut({ type: 'native', leftOption: true })!
    shortcut.name = 'dictation'
    ;(monitor as any).nativeShortcuts = [shortcut]

    ;(monitor as any).handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftOption))
    expect(onDown).toHaveBeenCalledTimes(1)

    ;(monitor as any).handleKeyEvent(createEvent('down', MODIFIER_KEY_CODES.leftShift))
    expect(onUp).toHaveBeenCalledTimes(1)

    ;(monitor as any).handleKeyEvent(createEvent('up', MODIFIER_KEY_CODES.leftOption))
    expect(onUp).toHaveBeenCalledTimes(1)
  })

})

const createMonitor = () => {
  const onDown = vi.fn()
  const onUp = vi.fn()
  const monitor = new KeyMonitor({} as any, {
    dictation: { onDown, onUp },
  } as any)
  const shortcut = KeyMonitor.parseNativeShortcut({ type: 'native', leftOption: true, leftCommand: true })!
  shortcut.name = 'dictation'
  ;(monitor as any).nativeShortcuts = [shortcut]
  return { monitor: monitor as any, onDown, onUp, shortcut }
}

describe('KeyMonitor parseNativeShortcut', () => {

  describe('disabled shortcuts', () => {
    test('should return null for key: "none" without modifiers', () => {
      const shortcut: NativeShortcut = { type: 'native', key: 'none' }
      expect(KeyMonitor.parseNativeShortcut(shortcut)).toBeNull()
    })

    // Note: key: "none" WITH modifiers is handled as modifier-only (see that section)
  })

  describe('modifier-only shortcuts (no key, single modifier)', () => {
    test('should parse rightCommand modifier-only', () => {
      const shortcut: NativeShortcut = { type: 'native', rightCommand: true }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.modifierKeyCode).toBe(MODIFIER_KEY_CODES.rightCommand)
      expect(result!.requiredModifiers).toEqual([])
    })

    test('should parse rightCommand with key: "none" as modifier-only (merged from defaults)', () => {
      // This happens when user config { type: "native", rightCommand: true }
      // gets merged with default { key: "none" }
      const shortcut: NativeShortcut = { type: 'native', key: 'none', rightCommand: true }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.modifierKeyCode).toBe(MODIFIER_KEY_CODES.rightCommand)
      expect(result!.requiredModifiers).toEqual([])
    })

    test('should parse leftCommand modifier-only', () => {
      const shortcut: NativeShortcut = { type: 'native', leftCommand: true }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.modifierKeyCode).toBe(MODIFIER_KEY_CODES.leftCommand)
    })

    test('should parse rightShift modifier-only', () => {
      const shortcut: NativeShortcut = { type: 'native', rightShift: true }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.modifierKeyCode).toBe(MODIFIER_KEY_CODES.rightShift)
    })

    test('should parse with empty string key', () => {
      const shortcut: NativeShortcut = { type: 'native', key: '', rightCommand: true }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.modifierKeyCode).toBe(MODIFIER_KEY_CODES.rightCommand)
    })
  })

  describe('modifier-only shortcuts (key is modifier name)', () => {
    test('should parse key: "rightCommand"', () => {
      const shortcut: NativeShortcut = { type: 'native', key: 'rightCommand' }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.modifierKeyCode).toBe(MODIFIER_KEY_CODES.rightCommand)
      expect(result!.requiredModifiers).toEqual([])
    })

    test('should parse key: "leftShift"', () => {
      const shortcut: NativeShortcut = { type: 'native', key: 'leftShift' }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.modifierKeyCode).toBe(MODIFIER_KEY_CODES.leftShift)
    })
  })

  describe('modifier + key combos', () => {
    test('should parse rightCommand + Space', () => {
      const shortcut: NativeShortcut = { type: 'native', rightCommand: true, key: 'Space' }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.keyCode).toBe(KEY_CODES.Space)
      expect(result!.requiredModifiers).toEqual([MODIFIER_KEY_CODES.rightCommand])
      expect(result!.modifierKeyCode).toBeUndefined()
    })

    test('should parse leftCommand + Return', () => {
      const shortcut: NativeShortcut = { type: 'native', leftCommand: true, key: 'Return' }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.keyCode).toBe(KEY_CODES.Return)
      expect(result!.requiredModifiers).toEqual([MODIFIER_KEY_CODES.leftCommand])
    })

    test('should parse multiple modifiers + key', () => {
      const shortcut: NativeShortcut = { type: 'native', rightCommand: true, rightShift: true, key: 'Space' }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.keyCode).toBe(KEY_CODES.Space)
      expect(result!.requiredModifiers).toContain(MODIFIER_KEY_CODES.rightCommand)
      expect(result!.requiredModifiers).toContain(MODIFIER_KEY_CODES.rightShift)
    })

    test('should parse leftCommand + leftShift + letter key B', () => {
      const shortcut: NativeShortcut = { type: 'native', leftCommand: true, leftShift: true, key: 'B' }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.keyCode).toBe(KEY_CODES.B)
      expect(result!.requiredModifiers).toContain(MODIFIER_KEY_CODES.leftCommand)
      expect(result!.requiredModifiers).toContain(MODIFIER_KEY_CODES.leftShift)
    })

    test('should parse modifier + number key', () => {
      const shortcut: NativeShortcut = { type: 'native', leftCommand: true, key: '1' }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.keyCode).toBe(KEY_CODES['1'])
      expect(result!.requiredModifiers).toEqual([MODIFIER_KEY_CODES.leftCommand])
    })
  })

  describe('multi-modifier combos (no key, multiple modifiers)', () => {
    test('should parse rightCommand + rightOption combo', () => {
      const shortcut: NativeShortcut = { type: 'native', rightCommand: true, rightOption: true }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.modifierKeyCode).toBeUndefined()
      expect(result!.keyCode).toBeUndefined()
      expect(result!.requiredModifiers).toContain(MODIFIER_KEY_CODES.rightCommand)
      expect(result!.requiredModifiers).toContain(MODIFIER_KEY_CODES.rightOption)
      expect(result!.requiredModifiers.length).toBe(2)
    })

    test('should parse rightControl + rightShift combo', () => {
      const shortcut: NativeShortcut = { type: 'native', rightControl: true, rightShift: true }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.requiredModifiers).toContain(MODIFIER_KEY_CODES.rightControl)
      expect(result!.requiredModifiers).toContain(MODIFIER_KEY_CODES.rightShift)
    })

    test('should parse three modifiers combo', () => {
      const shortcut: NativeShortcut = { type: 'native', rightCommand: true, rightOption: true, rightShift: true }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.requiredModifiers.length).toBe(3)
    })

    test('should parse combo with key: "none" (merged from defaults)', () => {
      const shortcut: NativeShortcut = { type: 'native', key: 'none', rightCommand: true, rightOption: true }
      const result = KeyMonitor.parseNativeShortcut(shortcut)
      expect(result).not.toBeNull()
      expect(result!.requiredModifiers).toContain(MODIFIER_KEY_CODES.rightCommand)
      expect(result!.requiredModifiers).toContain(MODIFIER_KEY_CODES.rightOption)
    })
  })

  describe('invalid shortcuts', () => {
    test('should return null for unknown key without modifiers', () => {
      const shortcut: NativeShortcut = { type: 'native', key: 'UnknownKey' }
      expect(KeyMonitor.parseNativeShortcut(shortcut)).toBeNull()
    })

    test('should return null for unknown key with modifiers', () => {
      const shortcut: NativeShortcut = { type: 'native', rightCommand: true, key: 'UnknownKey' }
      expect(KeyMonitor.parseNativeShortcut(shortcut)).toBeNull()
    })

    test('should return null for known key without modifiers', () => {
      const shortcut: NativeShortcut = { type: 'native', key: 'Space' }
      expect(KeyMonitor.parseNativeShortcut(shortcut)).toBeNull()
    })
  })

})
