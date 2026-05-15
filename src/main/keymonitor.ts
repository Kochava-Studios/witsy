
import autolib from 'autolib'
import { App } from 'electron'
import { NativeShortcutCallbacks } from 'types/automation'
import { ShortcutsConfig } from 'types/config'
import { disabledShortcutKey, NativeShortcut, Shortcut } from 'types/index'
import { loadSettings } from './config'

const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'
const MULTI_MODIFIER_ACTIVATION_DELAY_MS = 120

// Platform-specific key codes for modifier keys
const MODIFIER_KEY_CODES: Record<string, number> = isMac ? {
  rightCommand: 54,
  leftCommand: 55,
  rightShift: 60,
  leftShift: 56,
  rightOption: 61,
  leftOption: 58,
  rightControl: 62,
  leftControl: 59,
} : isLinux ? {
  // Linux evdev key codes
  rightCommand: 126,   // KEY_RIGHTMETA
  leftCommand: 125,    // KEY_LEFTMETA
  rightShift: 54,      // KEY_RIGHTSHIFT
  leftShift: 42,       // KEY_LEFTSHIFT
  rightOption: 100,    // KEY_RIGHTALT
  leftOption: 56,      // KEY_LEFTALT
  rightControl: 97,    // KEY_RIGHTCTRL
  leftControl: 29,     // KEY_LEFTCTRL
} : {
  // Windows VK codes
  rightCommand: 0x5C,  // VK_RWIN
  leftCommand: 0x5B,   // VK_LWIN
  rightShift: 0xA1,    // VK_RSHIFT
  leftShift: 0xA0,     // VK_LSHIFT
  rightOption: 0xA5,   // VK_RMENU (Alt)
  leftOption: 0xA4,    // VK_LMENU (Alt)
  rightControl: 0xA3,  // VK_RCONTROL
  leftControl: 0xA2,   // VK_LCONTROL
}

// Platform-specific key codes for regular keys
const KEY_CODES: Record<string, number> = isMac ? {
  // Letters (macOS virtual key codes follow keyboard layout, not alphabetical order)
  A: 0, B: 11, C: 8, D: 2, E: 14, F: 3, G: 5, H: 4, I: 34, J: 38,
  K: 40, L: 37, M: 46, N: 45, O: 31, P: 35, Q: 12, R: 15, S: 1, T: 17,
  U: 32, V: 9, W: 13, X: 7, Y: 16, Z: 6,
  // Numbers
  '0': 29, '1': 18, '2': 19, '3': 20, '4': 21,
  '5': 23, '6': 22, '7': 26, '8': 28, '9': 25,
  // Punctuation and symbols
  '[': 33, ']': 30, ';': 41, "'": 39, ',': 43, '.': 47,
  '/': 44, '\\': 42, '-': 27, '=': 24, '`': 50,
  // Arrow keys (symbols)
  '↑': 126, '↓': 125, '←': 123, '→': 124,
  // Special keys
  Space: 49, Return: 36, Tab: 48, Escape: 53, Delete: 51,
} : isLinux ? {
  // Linux evdev key codes (scan codes)
  A: 30, B: 48, C: 46, D: 32, E: 18, F: 33, G: 34, H: 35, I: 23, J: 36,
  K: 37, L: 38, M: 50, N: 49, O: 24, P: 25, Q: 16, R: 19, S: 31, T: 20,
  U: 22, V: 47, W: 17, X: 45, Y: 21, Z: 44,
  // Numbers
  '0': 11, '1': 2, '2': 3, '3': 4, '4': 5,
  '5': 6, '6': 7, '7': 8, '8': 9, '9': 10,
  // Punctuation and symbols
  '[': 26, ']': 27, ';': 39, "'": 40, ',': 51, '.': 52,
  '/': 53, '\\': 43, '-': 12, '=': 13, '`': 41,
  // Arrow keys (symbols)
  '↑': 103, '↓': 108, '←': 105, '→': 106,
  // Special keys
  Space: 57, Return: 28, Tab: 15, Escape: 1, Delete: 14,
} : {
  // Windows VK codes (letters and numbers match ASCII)
  A: 0x41, B: 0x42, C: 0x43, D: 0x44, E: 0x45, F: 0x46, G: 0x47, H: 0x48, I: 0x49, J: 0x4A,
  K: 0x4B, L: 0x4C, M: 0x4D, N: 0x4E, O: 0x4F, P: 0x50, Q: 0x51, R: 0x52, S: 0x53, T: 0x54,
  U: 0x55, V: 0x56, W: 0x57, X: 0x58, Y: 0x59, Z: 0x5A,
  // Numbers
  '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
  '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
  // Punctuation and symbols (OEM keys)
  '[': 0xDB, ']': 0xDD, ';': 0xBA, "'": 0xDE, ',': 0xBC, '.': 0xBE,
  '/': 0xBF, '\\': 0xDC, '-': 0xBD, '=': 0xBB, '`': 0xC0,
  // Arrow keys (symbols)
  '↑': 0x26, '↓': 0x28, '←': 0x25, '→': 0x27,
  // Special keys
  Space: 0x20, Return: 0x0D, Tab: 0x09, Escape: 0x1B, Delete: 0x08,
}

// Modifier flag masks (used for flagsChanged events)
// Maps keyCode -> flag bit to check in event.flags
const MODIFIER_FLAGS: Record<number, number> = isMac ? {
  54: 0x100000, // right command
  55: 0x100000, // left command
  60: 0x20000,  // right shift
  56: 0x20000,  // left shift
  61: 0x80000,  // right option
  58: 0x80000,  // left option
  62: 0x40000,  // right control
  59: 0x40000,  // left control
} : isLinux ? {
  // Linux evdev: keyCode -> flag bit (as defined in keymonitor.c)
  126: 64,  // right meta (LINUX_FLAG_META = 1 << 6)
  125: 64,  // left meta
  54: 1,    // right shift (LINUX_FLAG_SHIFT = 1 << 0)
  42: 1,    // left shift
  100: 8,   // right alt (LINUX_FLAG_ALT = 1 << 3)
  56: 8,    // left alt
  97: 4,    // right control (LINUX_FLAG_CTRL = 1 << 2)
  29: 4,    // left control
} : {
  // Windows: not used (Windows uses down/up events for modifiers)
}

type KeyMonitorEvent = {
  type: 'down' | 'up' | 'flagsChanged'
  keyCode: number
  flags: number
  isRepeat: boolean
}

type ParsedNativeShortcut = {
  name?: keyof NativeShortcutCallbacks
  // For modifier-only shortcuts
  modifierKeyCode?: number
  // For modifier+key shortcuts
  keyCode?: number
  requiredModifiers: number[] // key codes of required modifiers
}

type PendingShortcut = {
  shortcut: ParsedNativeShortcut
  timer: ReturnType<typeof setTimeout>
}

export default class KeyMonitor {

  private app: App
  private callbacks: NativeShortcutCallbacks
  private nativeShortcuts: ParsedNativeShortcut[] = []
  private isRunning = false

  // Track state
  private heldModifiers: Set<number> = new Set()
  private modifierPressedAlone: Map<number, boolean> = new Map() // true if no other key pressed while held
  private activeShortcuts: Set<keyof NativeShortcutCallbacks> = new Set() // shortcuts currently "down"
  private pendingShortcuts: Map<keyof NativeShortcutCallbacks, PendingShortcut> = new Map()

  // Static methods for use without instance
  static isPlatformSupported(): boolean {
    return process.platform !== 'linux'
  }

  static parseNativeShortcut(shortcut: NativeShortcut): ParsedNativeShortcut | null {
    // Collect specified modifiers
    const modifiers: { name: string, keyCode: number }[] = []
    if (shortcut.leftCommand) modifiers.push({ name: 'leftCommand', keyCode: MODIFIER_KEY_CODES.leftCommand })
    if (shortcut.rightCommand) modifiers.push({ name: 'rightCommand', keyCode: MODIFIER_KEY_CODES.rightCommand })
    if (shortcut.leftShift) modifiers.push({ name: 'leftShift', keyCode: MODIFIER_KEY_CODES.leftShift })
    if (shortcut.rightShift) modifiers.push({ name: 'rightShift', keyCode: MODIFIER_KEY_CODES.rightShift })
    if (shortcut.leftOption) modifiers.push({ name: 'leftOption', keyCode: MODIFIER_KEY_CODES.leftOption })
    if (shortcut.rightOption) modifiers.push({ name: 'rightOption', keyCode: MODIFIER_KEY_CODES.rightOption })
    if (shortcut.leftControl) modifiers.push({ name: 'leftControl', keyCode: MODIFIER_KEY_CODES.leftControl })
    if (shortcut.rightControl) modifiers.push({ name: 'rightControl', keyCode: MODIFIER_KEY_CODES.rightControl })

    // Determine if key is missing/disabled/empty
    const hasNoKey = !shortcut.key || shortcut.key === '' || shortcut.key === disabledShortcutKey

    // Skip if no key AND no modifiers
    if (hasNoKey && modifiers.length === 0) {
      return null
    }

    // Case 1a: No key (or disabled/empty) + single modifier = modifier-only shortcut
    if (hasNoKey && modifiers.length === 1) {
      return {
        modifierKeyCode: modifiers[0].keyCode,
        requiredModifiers: [],
      }
    }

    // Case 1b: No key (or disabled/empty) + multiple modifiers = multi-modifier combo
    if (hasNoKey && modifiers.length > 1) {
      return {
        requiredModifiers: modifiers.map(m => m.keyCode),
      }
    }

    // Case 2: Key is itself a modifier name (e.g., key: "rightCommand")
    const modifierKeyCode = MODIFIER_KEY_CODES[shortcut.key!]
    if (modifierKeyCode !== undefined) {
      return {
        modifierKeyCode,
        requiredModifiers: [],
      }
    }

    // Case 3: Regular key + modifiers = modifier+key combo
    const keyCode = KEY_CODES[shortcut.key!]
    if (keyCode !== undefined && modifiers.length > 0) {
      return {
        keyCode,
        requiredModifiers: modifiers.map(m => m.keyCode),
      }
    }

    // Invalid shortcut
    return null
  }

  constructor(app: App, callbacks: NativeShortcutCallbacks) {
    this.app = app
    this.callbacks = callbacks
  }

  start(): void {
    this.reload()
  }

  stop(): void {
    this.stopNativeMonitor()
  }

  reload(): void {
    const settings = loadSettings(this.app)
    this.parseShortcuts(settings.shortcuts)

    if (this.nativeShortcuts.length > 0) {
      this.startNativeMonitor()
    } else {
      this.stopNativeMonitor()
    }
  }

  private parseShortcuts(shortcuts: ShortcutsConfig): void {
    this.nativeShortcuts = []

    const shortcutToCallback: Record<keyof ShortcutsConfig, keyof NativeShortcutCallbacks> = {
      main: 'chat',
      prompt: 'prompt',
      scratchpad: 'scratchpad',
      command: 'command',
      readaloud: 'readaloud',
      dictation: 'dictation',
      audioBooth: 'audioBooth',
      realtime: 'realtime',
      studio: 'studio',
      forge: 'forge',
    }

    for (const [name, shortcut] of Object.entries(shortcuts) as [keyof ShortcutsConfig, Shortcut][]) {
      if (shortcut?.type === 'native') {
        const parsed = this.parseShortcutWithName(shortcut as NativeShortcut, shortcutToCallback[name])
        if (parsed) {
          this.nativeShortcuts.push(parsed)
        }
      }
    }

    console.info(`[keymonitor] Found ${this.nativeShortcuts.length} native shortcuts`)
  }

  private parseShortcutWithName(shortcut: NativeShortcut, callbackName: keyof NativeShortcutCallbacks): ParsedNativeShortcut | null {
    const parsed = KeyMonitor.parseNativeShortcut(shortcut)
    if (parsed) {
      parsed.name = callbackName
      return parsed
    }
    console.warn(`[keymonitor] Invalid native shortcut: ${JSON.stringify(shortcut)}`)
    return null
  }

  private startNativeMonitor(): void {
    if (this.isRunning) return

    try {
      const result = autolib.startKeyMonitor((event: KeyMonitorEvent) => {
        this.handleKeyEvent(event)
      })

      if (result === 0) {
        this.isRunning = true
        console.info('[keymonitor] Started')
      } else if (result === 3) {
        console.error('[keymonitor] Accessibility permissions not granted')
      } else {
        console.error('[keymonitor] Failed with code:', result)
      }
    } catch (error) {
      console.error('[keymonitor] Failed:', error)
    }
  }

  private stopNativeMonitor(): void {
    if (!this.isRunning) return

    try {
      autolib.stopKeyMonitor()
      this.isRunning = false
      this.heldModifiers.clear()
      this.modifierPressedAlone.clear()
      this.activeShortcuts.clear()
      this.clearPendingShortcuts()
      console.info('[keymonitor] Stopped')
    } catch (error) {
      console.error('[keymonitor] Stop failed:', error)
    }
  }

  private isModifierKeyCode(keyCode: number): boolean {
    return Object.values(MODIFIER_KEY_CODES).includes(keyCode)
  }

  private handleKeyEvent(event: KeyMonitorEvent): void {
    const usesFlagsChanged = isMac || isLinux // macOS and Linux use flagsChanged for modifiers

    if (event.type === 'flagsChanged') {
      // macOS and Linux send flagsChanged for modifier keys
      this.handleModifierEvent(event)
    } else if (event.type === 'down') {
      // Windows sends down/up for modifier keys, so check if it's a modifier
      if (!usesFlagsChanged && this.isModifierKeyCode(event.keyCode)) {
        this.handleModifierDown(event.keyCode)
      } else {
        this.handleKeyDown(event)
      }
    } else if (event.type === 'up') {
      if (!usesFlagsChanged && this.isModifierKeyCode(event.keyCode)) {
        this.handleModifierUp(event.keyCode)
      } else {
        this.handleKeyUp(event)
      }
    }
  }

  // macOS/Linux: handle flagsChanged event
  private handleModifierEvent(event: KeyMonitorEvent): void {
    const keyCode = event.keyCode
    if (!this.isModifierKeyCode(keyCode)) return

    const flagMask = MODIFIER_FLAGS[keyCode]
    const isPressed = (event.flags & flagMask) !== 0

    if (isPressed) {
      this.handleModifierDown(keyCode)
    } else {
      this.handleModifierUp(keyCode)
    }
  }

  // Common modifier down handling (both platforms)
  private handleModifierDown(keyCode: number): void {
    this.heldModifiers.add(keyCode)
    this.modifierPressedAlone.set(keyCode, true)

    if (this.heldModifiers.size > 1) {
      for (const modKeyCode of this.heldModifiers) {
        this.modifierPressedAlone.set(modKeyCode, false)
      }
      this.releaseActiveModifierOnlyShortcutsForModifiers(this.heldModifiers)
    }

    this.cancelInvalidPendingShortcuts()

    // Check single modifier-only shortcuts (onDown)
    this.checkModifierOnlyShortcuts(keyCode, 'down')

    // Check multi-modifier combos (onDown when all are held)
    this.checkMultiModifierCombos()
  }

  // Common modifier up handling (both platforms)
  private handleModifierUp(keyCode: number): void {
    const wasAlone = this.modifierPressedAlone.get(keyCode) ?? false

    // A clean quick tap of a multi-modifier combo can be released before the
    // delayed activation fires. Trigger it now so tap mode still works.
    this.firePendingShortcutsForReleasedModifier(keyCode)

    this.heldModifiers.delete(keyCode)
    this.modifierPressedAlone.delete(keyCode)

    this.cancelPendingShortcuts((shortcut) => shortcut.requiredModifiers.includes(keyCode))

    // Check single modifier-only shortcuts (onUp only if pressed alone)
    if (wasAlone) {
      this.checkModifierOnlyShortcuts(keyCode, 'up')
    }

    // Check if any active modifier+key shortcuts or multi-modifier combos need to be released
    this.checkModifierRelease(keyCode)
  }

  private handleKeyDown(event: KeyMonitorEvent): void {
    if (event.isRepeat) return

    const keyCode = event.keyCode

    this.cancelPendingShortcuts()

    // Mark all held modifiers as "not alone"
    for (const modKeyCode of this.heldModifiers) {
      this.modifierPressedAlone.set(modKeyCode, false)
    }
    this.releaseActiveModifierOnlyShortcutsForModifiers(this.heldModifiers)

    // Check modifier+key shortcuts
    for (const shortcut of this.nativeShortcuts) {
      if (shortcut.keyCode === keyCode && this.areExactModifiersHeld(shortcut.requiredModifiers)) {
        if (!this.activeShortcuts.has(shortcut.name)) {
          this.activeShortcuts.add(shortcut.name)
          console.debug(`[keymonitor] ${shortcut.name} onDown`)
          this.callbacks[shortcut.name].onDown()
        }
      }
    }
  }

  private handleKeyUp(event: KeyMonitorEvent): void {
    const keyCode = event.keyCode

    // Check if any active shortcuts with this key need onUp
    for (const shortcut of this.nativeShortcuts) {
      if (shortcut.keyCode === keyCode && this.activeShortcuts.has(shortcut.name)) {
        this.activeShortcuts.delete(shortcut.name)
        console.debug(`[keymonitor] ${shortcut.name} onUp`)
        this.callbacks[shortcut.name].onUp()
      }
    }
  }

  private checkModifierOnlyShortcuts(keyCode: number, eventType: 'down' | 'up'): void {
    for (const shortcut of this.nativeShortcuts) {
      if (shortcut.modifierKeyCode === keyCode) {
        if (eventType === 'down') {
          if (!this.activeShortcuts.has(shortcut.name)) {
            this.activeShortcuts.add(shortcut.name)
            console.debug(`[keymonitor] ${shortcut.name} onDown (modifier-only)`)
            this.callbacks[shortcut.name].onDown()
          }
        } else {
          if (this.activeShortcuts.has(shortcut.name)) {
            this.activeShortcuts.delete(shortcut.name)
            console.debug(`[keymonitor] ${shortcut.name} onUp (modifier-only)`)
            this.callbacks[shortcut.name].onUp()
          }
        }
      }
    }
  }

  private checkMultiModifierCombos(): void {
    // Check for multi-modifier combos (no key, multiple modifiers)
    for (const shortcut of this.nativeShortcuts) {
      // Must be a multi-modifier combo: no modifierKeyCode, no keyCode, multiple requiredModifiers
      if (!this.isMultiModifierCombo(shortcut)) {
        continue
      }

      if (!this.areExactModifiersHeld(shortcut.requiredModifiers)) {
        this.cancelPendingShortcut(shortcut.name)
        continue
      }

      if (!this.activeShortcuts.has(shortcut.name) && !this.pendingShortcuts.has(shortcut.name)) {
        this.schedulePendingShortcut(shortcut)
      }
    }
  }

  private checkModifierRelease(releasedKeyCode: number): void {
    // If a required modifier is released, send onUp for any active shortcuts that need it
    for (const shortcut of this.nativeShortcuts) {
      if (shortcut.requiredModifiers.includes(releasedKeyCode) && this.activeShortcuts.has(shortcut.name)) {
        this.activeShortcuts.delete(shortcut.name)
        console.debug(`[keymonitor] ${shortcut.name} onUp (modifier released)`)
        this.callbacks[shortcut.name].onUp()
      }
    }
  }

  private areModifiersHeld(requiredModifiers: number[]): boolean {
    return requiredModifiers.every(mod => this.heldModifiers.has(mod))
  }

  private releaseActiveModifierOnlyShortcutsForModifiers(keyCodes: Iterable<number>): void {
    const keyCodeSet = new Set(keyCodes)

    for (const shortcut of this.nativeShortcuts) {
      if (shortcut.name &&
          shortcut.modifierKeyCode !== undefined &&
          keyCodeSet.has(shortcut.modifierKeyCode) &&
          this.activeShortcuts.has(shortcut.name)) {
        this.activeShortcuts.delete(shortcut.name)
        console.debug(`[keymonitor] ${shortcut.name} onUp (modifier no longer alone)`)
        this.callbacks[shortcut.name].onUp()
      }
    }
  }

  private areExactModifiersHeld(requiredModifiers: number[]): boolean {
    return this.heldModifiers.size === requiredModifiers.length && this.areModifiersHeld(requiredModifiers)
  }

  private isMultiModifierCombo(shortcut: ParsedNativeShortcut): boolean {
    return shortcut.modifierKeyCode === undefined &&
      shortcut.keyCode === undefined &&
      shortcut.requiredModifiers.length > 1
  }

  private schedulePendingShortcut(shortcut: ParsedNativeShortcut): void {
    if (!shortcut.name) return

    const timer = setTimeout(() => {
      this.firePendingShortcut(shortcut.name)
    }, MULTI_MODIFIER_ACTIVATION_DELAY_MS)

    this.pendingShortcuts.set(shortcut.name, { shortcut, timer })
  }

  private firePendingShortcut(name: keyof NativeShortcutCallbacks): void {
    const pending = this.pendingShortcuts.get(name)
    if (!pending) return

    this.pendingShortcuts.delete(name)
    clearTimeout(pending.timer)

    if (!this.areExactModifiersHeld(pending.shortcut.requiredModifiers) || this.activeShortcuts.has(name)) {
      return
    }

    this.activeShortcuts.add(name)
    console.debug(`[keymonitor] ${name} onDown (multi-modifier combo)`)
    this.callbacks[name].onDown()
  }

  private firePendingShortcutsForReleasedModifier(keyCode: number): void {
    const pendingNames = Array.from(this.pendingShortcuts.values())
      .filter(({ shortcut }) => shortcut.name && shortcut.requiredModifiers.includes(keyCode) && this.areExactModifiersHeld(shortcut.requiredModifiers))
      .map(({ shortcut }) => shortcut.name)

    for (const name of pendingNames) {
      this.firePendingShortcut(name)
    }
  }

  private cancelInvalidPendingShortcuts(): void {
    this.cancelPendingShortcuts((shortcut) => !this.areExactModifiersHeld(shortcut.requiredModifiers))
  }

  private cancelPendingShortcuts(predicate?: (shortcut: ParsedNativeShortcut) => boolean): void {
    for (const [name, pending] of this.pendingShortcuts) {
      if (!predicate || predicate(pending.shortcut)) {
        this.cancelPendingShortcut(name)
      }
    }
  }

  private cancelPendingShortcut(name: keyof NativeShortcutCallbacks): void {
    const pending = this.pendingShortcuts.get(name)
    if (!pending) return

    clearTimeout(pending.timer)
    this.pendingShortcuts.delete(name)
  }

  private clearPendingShortcuts(): void {
    this.cancelPendingShortcuts()
  }
}
