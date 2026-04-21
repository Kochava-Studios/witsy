import { ref } from 'vue'

export interface ArtifactCopySource {
  plainText: () => string
  html?: () => string
}

export function useArtifactCopy(source: ArtifactCopySource | (() => string)) {
  const copying = ref(false)

  const resolve = (): ArtifactCopySource => {
    return typeof source === 'function' ? { plainText: source } : source
  }

  const onCopy = async () => {
    copying.value = true

    const { plainText, html } = resolve()
    const plainContent = plainText()
    const htmlContent = html?.()

    try {
      if (htmlContent && window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([plainContent], { type: 'text/plain' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(plainContent)
      }
    } catch {
      try {
        await navigator.clipboard.writeText(plainContent)
      } catch {
        // copying state is reset in finally
      }
    } finally {
      setTimeout(() => {
        copying.value = false
      }, 1000)
    }
  }

  return {
    copying,
    onCopy,
  }
}
