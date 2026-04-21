import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18nMock } from '@tests/mocks'
import { useWindowMock } from '@tests/mocks/window'
import { stubTeleport } from '@tests/mocks/stubs'
import MessageItemArtifactBlock from '@components/MessageItemArtifactBlock.vue'
import { store } from '@services/store'

vi.mock('@services/i18n', async () => {
  return createI18nMock()
})

class ClipboardItemMock {
  items: Record<string, Blob>
  constructor(items: Record<string, Blob>) {
    this.items = items
  }
}

const blobText = (b: Blob & { __text?: string }): string => b.__text ?? ''

const installBlobCapture = () => {
  const OriginalBlob = window.Blob
  window.Blob = class CapturingBlob extends OriginalBlob {
    __text: string
    constructor(parts: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options)
      this.__text = parts.map(p => typeof p === 'string' ? p : '').join('')
    }
  } as unknown as typeof Blob
  return () => { window.Blob = OriginalBlob }
}

describe('MessageItemArtifactBlock copy', () => {

  beforeAll(() => {
    useWindowMock()
    store.loadSettings()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete (window as Window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem
  })

  const mountArtifactBlock = (content: string) => {
    return mount(MessageItemArtifactBlock, {
      ...stubTeleport,
      props: {
        title: 'Markdown Artifact',
        content,
        transient: false,
      },
    })
  }

  test('copies rendered html + raw markdown when ClipboardItem is available', async () => {
    const restoreBlob = installBlobCapture()
    try {
      const write = vi.fn().mockResolvedValue(undefined)
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { write, writeText } })
      window.ClipboardItem = ClipboardItemMock as unknown as typeof ClipboardItem

      const wrapper = mountArtifactBlock('```\n# Heading\n\n**bold** text\n```')

      await wrapper.vm.onCopy()

      expect(write).toHaveBeenCalledTimes(1)
      expect(writeText).not.toHaveBeenCalled()

      const items = write.mock.calls[0][0]
      const htmlBlob = items[0].items['text/html'] as Blob
      const plainBlob = items[0].items['text/plain'] as Blob
      expect(htmlBlob.type).toBe('text/html')
      expect(plainBlob.type).toBe('text/plain')

      const htmlText = blobText(htmlBlob)
      const plainText = blobText(plainBlob)
      expect(htmlText).toContain('<h1>')
      expect(htmlText).toContain('<strong>bold</strong>')
      expect(plainText).toContain('# Heading')
      expect(plainText).toContain('**bold**')
    } finally {
      restoreBlob()
    }
  })

  test('falls back to raw markdown as plain text when rich clipboard is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const wrapper = mountArtifactBlock('```\n# Heading\n\n**bold** text\n```')

    await wrapper.vm.onCopy()

    expect(writeText).toHaveBeenCalledTimes(1)
    const copied = writeText.mock.calls[0][0]
    expect(copied).toContain('# Heading')
    expect(copied).toContain('**bold**')
  })
})
