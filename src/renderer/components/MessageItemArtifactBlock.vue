<template>
  <div class="artifact panel">
    <div class="panel-header">
      <ChevronDownIcon class="icon toggle" @click.stop="togglePanel" />
      <label>{{ title }}</label>
      <ButtonIcon>
        <ClipboardCheckIcon v-if="copying" />
        <ClipboardIcon @click="onCopy" v-else />
      </ButtonIcon>
      <ContextMenuTrigger class="download" position="below-right" ref="downloadButton">
        <template #trigger>
          <DownloadIcon />
        </template>
        <template #menu>
          <div class="item" @click="onDownloadFormat('text')">Text</div>
          <div class="item" @click="onDownloadFormat('raw')">Markdown</div>
          <div class="item" @click="onDownloadFormat('docx')">Word</div>
          <div class="item" @click="onDownloadFormat('pdf')">PDF</div>
        </template>
      </ContextMenuTrigger>
    </div>
    <div class="panel-body variable-font-size" ref="panelBody">
      <MessageItemBody :message="message" tool-calls-display="none" />
    </div>

  </div>
</template>

<script setup lang="ts">

import { removeMarkdown } from '@excalidraw/markdown-to-text'
import { ChevronDownIcon, ClipboardCheckIcon, ClipboardIcon, DownloadIcon } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useArtifactCopy } from '@composables/artifact_copy'
import { togglePanel } from '@renderer/utils/panel'
import Message from '@models/message'
import { exportToDocx, saveDocxBlob } from '@services/docx'
import { addExtension, extractCodeBlockContent } from '@services/markdown'
import { exportToPdf, stripLeadingBodyTitle } from '@services/pdf'
import ButtonIcon from './ButtonIcon.vue'
import ContextMenuTrigger from './ContextMenuTrigger.vue'
import MessageItemBody from './MessageItemBody.vue'

const content = () => extractCodeBlockContent(props.content)
const { copying, onCopy } = useArtifactCopy({
  plainText: content,
  html: () => window.api.markdown.render(content()),
})

const downloadButton = ref<HTMLElement>(null)
const panelBody = ref<HTMLElement>(null)

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  transient: {
    type: Boolean,
    required: true,
  },
})

const message = computed(() => new Message('assistant', props.content))

const onDownloadFormat = async (action: string) => {

  let filename = props.title
  let fileContent = ''

  switch (action) {
    case 'text':
      fileContent = removeMarkdown(content(), {
        listUnicodeChar: false,
        gfm: true,
        useImgAltText: true,
      })
      const index = filename.lastIndexOf('.')
      if (index === -1 || index < filename.length - 5) {
        filename = addExtension(filename, '.txt')
      }
      break

    case 'raw':
      fileContent = content()
      filename = addExtension(filename, '.md')
      break

    case 'docx':
      try {
        const blob = await exportToDocx({
          title: props.title,
          content: content(),
        })
        saveDocxBlob(blob, filename.replace(/\.[^.]+$/, ''))
      } catch (error) {
        console.error('Failed to generate DOCX:', error)
      }
      return

    case 'pdf':
      try {
        if (!panelBody.value) return

        // For markdown content, create proper message structure
        const message = panelBody.value.closest('.message') as HTMLElement
        if (!message) return
        const classList = Array.from(message.classList)

        // dummy message
        const msg = document.createElement('div')
        classList.forEach(cls => msg.classList.add(cls))
        const body = msg.appendChild(document.createElement('div'))
        body.classList.add('body')
        const messageContent = body.appendChild(document.createElement('div'))
        messageContent.classList.add('message-content')

        const bodyClone = panelBody.value.cloneNode(true) as HTMLElement
        stripLeadingBodyTitle(bodyClone, props.title)
        messageContent.appendChild(bodyClone)

        await exportToPdf({
          title: filename.replace(/\.[^.]+$/, ''),
          element: msg,
        })

      } catch (error) {
        console.error('Failed to generate PDF:', error)
        return
      }

      // exportToPdf is already doing the save
      return
  }

  // Save file using the API for text and markdown
  window.api.file.save({
    contents: window.api.base64.encode(fileContent),
    properties: {
      filename,
      prompt: true
    }
  })
}

defineExpose({ onCopy })

</script>

<style scoped>

.artifact {
  user-select: text;
}

</style>
