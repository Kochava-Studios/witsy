<template>
  <div class="form form-vertical form-large">
    <!-- <div class="form-field">
      <label>{{  t('settings.engines.google.api') }}</label>
      <select name="vertexai" v-model="vertexai" @change="save">
        <option :value="false">{{ t('settings.engines.google.gemini') }}</option>
        <option :value="true">{{ t('settings.engines.google.vertexai') }}</option>
      </select>
    </div> -->
    
    <div class="form-field">
      <label>{{ t('settings.engines.apiKey') }}</label>
      <div class="form-subgroup">
        <InputObfuscated v-model="apiKey" @blur="onKeyChange" />
        <a href="https://aistudio.google.com/app/apikey" target="_blank">{{ t('settings.engines.getApiKey') }}</a>
      </div>
    </div>
    
    <template v-if="vertexai">
      <div class="form-field">
        <label>{{ t('settings.engines.google.project') }}</label>
        <div class="form-subgroup">
          <input type="text" v-model="project" autocapitalize="false" autocomplete="false" autocorrect="false" @blur="onKeyChange" />
        </div>
      </div>
      <div class="form-field">
        <label>{{ t('settings.engines.google.location') }}</label>
        <div class="form-subgroup">
          <input type="text" v-model="location" autocapitalize="false" autocomplete="false" autocorrect="false" @blur="onKeyChange" />
        </div>
      </div>
    </template>
    
    <div class="form-field">
      <label>{{ t('settings.engines.chatModel') }}</label>
      <div class="form-subgroup">
        <div class="control-group">
          <ModelSelectPlus v-model="chat_model" :models="chat_models" :height="300" :disabled="chat_models.length == 0" @change="save" />
          <RefreshButton :on-refresh="getModels" />
        </div>
        <a href="https://ai.google.dev/gemini-api/docs/models/gemini" target="_blank">{{ t('settings.engines.google.aboutModels') }}</a><br/>
        <a href="https://ai.google.dev/pricing" target="_blank">{{ t('settings.engines.google.pricing') }}</a>
      </div>
    </div>
    <div class="form-field">
      <label>{{ t('settings.engines.vision.model') }}</label>
      <ModelSelectPlus v-model="vision_model" :models="vision_models" :disabled="vision_models.length == 0" @change="save" />
    </div>
    <div class="form-field">
      <label>{{ t('settings.engines.apiBaseURL') }}</label>
      <input name="baseURL" v-model="baseURL" placeholder="https://generativelanguage.googleapis.com" @keydown.enter.prevent="save" @change="save"/>
    </div>
    <div class="form-field">
      <label>{{ t('settings.engines.requestCooldown') }}</label>
      <input type="number" name="requestCooldown" v-model.number="requestCooldown" min="0" step="100" :placeholder="t('settings.engines.requestCooldownHint')" @change="save"/>
    </div>
    <div class="form-field">
      <label>{{ t('settings.engines.google.safetySettings') }}</label>
      <div class="form-subgroup">
        <select name="safetySettings" v-model="safetySettings" @change="save">
          <option value="">{{ t('settings.engines.google.safetyDefault') }}</option>
          <option value="BLOCK_LOW_AND_ABOVE">{{ t('settings.engines.google.safetyBlockMost') }}</option>
          <option value="BLOCK_MEDIUM_AND_ABOVE">{{ t('settings.engines.google.safetyBlockSome') }}</option>
          <option value="BLOCK_ONLY_HIGH">{{ t('settings.engines.google.safetyBlockFew') }}</option>
          <option value="BLOCK_NONE">{{ t('settings.engines.google.safetyBlockNone') }}</option>
          <option value="OFF">{{ t('settings.engines.google.safetyOff') }}</option>
        </select>
        <span class="hint">{{ t('settings.engines.google.safetySettingsHint') }}</span>
      </div>
    </div>
    <div class="form-field">
      <label>{{ t('settings.engines.google.defaultThinkingBudget') }}</label>
      <div class="form-subgroup">
        <input type="number" name="defaultThinkingBudget" v-model.number="defaultThinkingBudget" min="-1" step="1" :placeholder="t('settings.engines.google.defaultThinkingBudgetHint')" @change="save"/>
        <span class="hint">{{ t('settings.engines.google.defaultThinkingBudgetExplain') }}</span>
      </div>
    </div>
    <div class="form-field horizontal">
      <input type="checkbox" id="google-disable-tools" name="disableTools" v-model="disableTools" @change="save" />
      <label for="google-disable-tools">{{  t('settings.engines.disableTools') }}</label>
    </div>
  </div>
</template>

<script setup lang="ts">

import { computed, ref } from 'vue'
import { store } from '@services/store'
import { t } from '@services/i18n'
import LlmFactory from '@services/llms/llm'
import Dialog from '@renderer/utils/dialog'
import RefreshButton from '@components/RefreshButton.vue'
import ModelSelectPlus from '@components/ModelSelectPlus.vue'
import InputObfuscated from '@components/InputObfuscated.vue'
import { ChatModel, defaultCapabilities } from 'multi-llm-ts'
import { GoogleEngineConfig } from 'types/config'

const vertexai = ref(false)
const apiKey = ref(null)
const baseURL = ref(null)
const project = ref('')
const location = ref('')
const disableTools = ref(false)
const requestCooldown = ref<number>(null)
const safetySettings = ref<string>('')
const defaultThinkingBudget = ref<number>(null)
const chat_model = ref<string>(null)
const vision_model = ref<string>(null)
const chat_models = ref<ChatModel[]>([])

const vision_models = computed(() => {
  return [
    { id: '', name: t('settings.engines.vision.noFallback'), ...defaultCapabilities },
    ...chat_models.value.filter(model => model.capabilities?.vision)
  ]
})

const load = () => {
  // vertexai.value = store.config.engines.google?.googleVertexAI || false
  apiKey.value = store.config.engines.google?.apiKey || ''
  baseURL.value = store.config.engines.google?.baseURL || ''
  // project.value = store.config.engines.google?.googleVertexProject || ''
  // location.value = store.config.engines.google?.googleVertexLocation || ''
  chat_models.value = store.config.engines.google?.models?.chat || []
  chat_model.value = store.config.engines.google?.model?.chat || ''
  vision_model.value = store.config.engines.google?.model?.vision || ''
  disableTools.value = store.config.engines.google?.disableTools || false
  requestCooldown.value = store.config.engines.google?.requestCooldown || null
  safetySettings.value = (store.config.engines.google as GoogleEngineConfig)?.safetySettings || ''
  defaultThinkingBudget.value = (store.config.engines.google as GoogleEngineConfig)?.defaultThinkingBudget ?? null
}

const getModels = async (): Promise<boolean> => {

  // load
  const llmManager = LlmFactory.manager(store.config)
  let success = await llmManager.loadModels('google')
  if (!success) {
    Dialog.alert(t('common.errorModelRefresh'))
    return false
  }

  // reload
  load()

  // done
  return true

}

const onKeyChange = () => {
  if (chat_models.value.length === 0 && apiKey.value.length > 0) {
    store.config.engines.google.apiKey = apiKey.value
    getModels()
  }
  save()
}

const save = () => {
  // store.config.engines.google.googleVertexAI = vertexai.value
  store.config.engines.google.apiKey = apiKey.value
  store.config.engines.google.baseURL = baseURL.value
  // store.config.engines.google.googleVertexProject = project.value
  // store.config.engines.google.googleVertexLocation = location.value
  store.config.engines.google.model.chat = chat_model.value
  store.config.engines.google.model.vision = vision_model.value
  store.config.engines.google.disableTools = disableTools.value
  store.config.engines.google.requestCooldown = requestCooldown.value || undefined
  ;(store.config.engines.google as GoogleEngineConfig).safetySettings = safetySettings.value || undefined
  ;(store.config.engines.google as GoogleEngineConfig).defaultThinkingBudget = defaultThinkingBudget.value ?? undefined
  store.saveSettings()
}

defineExpose({ load })

</script>

