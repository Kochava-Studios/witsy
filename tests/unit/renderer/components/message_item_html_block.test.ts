import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18nMock } from '@tests/mocks'
import { useWindowMock } from '@tests/mocks/window'
import { stubTeleport } from '@tests/mocks/stubs'
import MessageItemHtmlBlock from '@components/MessageItemHtmlBlock.vue'
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

describe('MessageItemHtmlBlock copy', () => {

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

  const mountHtmlArtifactBlock = (content: string) => {
    return mount(MessageItemHtmlBlock, {
      ...stubTeleport,
      props: {
        title: 'HTML Artifact',
        content,
        transient: false,
      },
    })
  }

  test('copies rich html when ClipboardItem support exists', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { write, writeText } })
    window.ClipboardItem = ClipboardItemMock as unknown as typeof ClipboardItem

    const wrapper = mountHtmlArtifactBlock('```html\n<!DOCTYPE html><html><body><h1>Hello</h1><p>World</p></body></html>\n```')

    await wrapper.vm.onCopy()

    expect(write).toHaveBeenCalledTimes(1)
    expect(writeText).not.toHaveBeenCalled()

    const clipboardItems = write.mock.calls[0][0]
    expect(clipboardItems).toHaveLength(1)
    expect(clipboardItems[0]).toBeInstanceOf(ClipboardItemMock)
    expect(clipboardItems[0].items['text/html']).toBeInstanceOf(Blob)
    expect(clipboardItems[0].items['text/plain']).toBeInstanceOf(Blob)
    expect(clipboardItems[0].items['text/html'].type).toBe('text/html')
    expect(clipboardItems[0].items['text/plain'].type).toBe('text/plain')
    expect(clipboardItems[0].items['text/html'].size).toBeGreaterThan(0)
    expect(clipboardItems[0].items['text/plain'].size).toBeGreaterThan(0)
  })

  test('falls back to plain text without raw html when rich clipboard is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const wrapper = mountHtmlArtifactBlock('```html\n<!DOCTYPE html><html><body><h1>Hello</h1><p>World</p></body></html>\n```')

    await wrapper.vm.onCopy()

    expect(writeText).toHaveBeenCalledTimes(1)

    const copiedText = writeText.mock.calls[0][0]
    expect(copiedText).toContain('Hello')
    expect(copiedText).toContain('World')
    expect(copiedText).not.toContain('<html')
    expect(copiedText).not.toContain('<body')
  })
})
