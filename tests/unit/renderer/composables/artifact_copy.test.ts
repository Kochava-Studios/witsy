import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useArtifactCopy } from '@composables/artifact_copy'

class ClipboardItemMock {
  items: Record<string, Blob>
  constructor(items: Record<string, Blob>) {
    this.items = items
  }
}

const setClipboard = (impl: Partial<Clipboard>) => {
  Object.assign(navigator, { clipboard: impl })
}

describe('useArtifactCopy', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as Window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('copying flag is initially false', () => {
    const { copying } = useArtifactCopy(() => 'test content')
    expect(copying.value).toBe(false)
  })

  test('legacy signature writes plain text only', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    const contentGetter = vi.fn(() => 'my test content')
    const { copying, onCopy } = useArtifactCopy(contentGetter)

    const promise = onCopy()
    expect(copying.value).toBe(true)
    await promise

    expect(contentGetter).toHaveBeenCalled()
    expect(writeText).toHaveBeenCalledWith('my test content')
  })

  test('plainText-only source writes plain text only', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const write = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText, write })

    const { onCopy } = useArtifactCopy({ plainText: () => 'plain only' })
    await onCopy()

    expect(writeText).toHaveBeenCalledWith('plain only')
    expect(write).not.toHaveBeenCalled()
  })

  test('writes rich html + plain text when ClipboardItem is available', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ write, writeText })
    window.ClipboardItem = ClipboardItemMock as unknown as typeof ClipboardItem

    const { onCopy } = useArtifactCopy({
      plainText: () => 'hello world',
      html: () => '<p>hello <b>world</b></p>',
    })
    await onCopy()

    expect(write).toHaveBeenCalledTimes(1)
    expect(writeText).not.toHaveBeenCalled()

    const items = write.mock.calls[0][0]
    expect(items).toHaveLength(1)
    expect(items[0]).toBeInstanceOf(ClipboardItemMock)
    expect(items[0].items['text/html']).toBeInstanceOf(Blob)
    expect(items[0].items['text/plain']).toBeInstanceOf(Blob)
    expect(items[0].items['text/html'].type).toBe('text/html')
    expect(items[0].items['text/plain'].type).toBe('text/plain')
  })

  test('falls back to plain text when ClipboardItem is missing even if html given', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    const { onCopy } = useArtifactCopy({
      plainText: () => 'plain fallback',
      html: () => '<p>should not be used</p>',
    })
    await onCopy()

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith('plain fallback')
  })

  test('falls back to writeText when rich write() throws', async () => {
    const write = vi.fn().mockRejectedValue(new Error('sandboxed'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ write, writeText })
    window.ClipboardItem = ClipboardItemMock as unknown as typeof ClipboardItem

    const { onCopy } = useArtifactCopy({
      plainText: () => 'recover me',
      html: () => '<p>recover me</p>',
    })
    await onCopy()

    expect(write).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith('recover me')
  })

  test('copying flag resets after 1 second', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    const { copying, onCopy } = useArtifactCopy(() => 'x')
    const promise = onCopy()
    expect(copying.value).toBe(true)
    await promise

    vi.advanceTimersByTime(1000)
    expect(copying.value).toBe(false)
  })

})
