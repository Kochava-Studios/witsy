<template>
  <div class="tab-content">
    <header>
      <div class="title">{{ t('settings.tabs.general') }}</div>
    </header>
    <main class="form form-vertical form-large">
      <div class="form-field appearance" v-if="store.isFeatureEnabled('appearance')">
        <label>{{ t('settings.general.theme') }}</label>
        <div class="form-subgroup">
          <div @click="setAppearanceTheme('light')" :class="{ selected: appearance == 'light' }">
            <img src="/assets/appearance-light.png" />
            {{ t('settings.general.themes.light') }}
          </div>
          <div @click="setAppearanceTheme('dark')" :class="{ selected: appearance == 'dark' }">
            <img src="/assets/appearance-dark.png" />
            {{ t('settings.general.themes.dark') }}
          </div>
          <div @click="setAppearanceTheme('system')" :class="{ selected: appearance == 'system' }">
            <img src="/assets/appearance-system.png" />
            {{ t('settings.general.themes.system') }}
          </div>
        </div>
      </div>
      <div class="form-field darkTint" v-if="store.isFeatureEnabled('appearance')">
        <label>{{ t('settings.general.darkTint') }}</label>
        <select v-model="darkTint" @change="save">
          <option value="black">{{ t('settings.general.tints.black') }}</option>
          <option value="blue">{{ t('settings.general.tints.blue') }}</option>
        </select>
      </div>
      <div class="form-field localeUI">
        <label>{{ t('settings.general.localeUI') }}</label>
        <LangSelect v-model="localeUI" default-text="common.language.system" :filter="locales" @change="save" />
      </div>
      <div class="form-field reset-settings">
        <label>{{ t('settings.general.resetSettings') }}</label>
        <button @click.prevent="onResetSettings" class="secondary">{{ t('common.reset') }}</button>
      </div>
      <div class="form-field horizontal run-at-login">
        <input type="checkbox" id="run-at-login" v-model="runAtLogin" @change="save" />
        <label for="run-at-login">{{ t('settings.general.runAtLogin') }}</label>
      </div>
      <div class="form-field horizontal hide-on-startup">
        <input type="checkbox" id="hide-on-startup" v-model="hideOnStartup" @change="save" />
        <label for="hide-on-startup">{{ t('settings.general.hideOnStartup') }}</label>
      </div>
      <div class="form-field horizontal keep-running">
        <input type="checkbox" id="keep-running" v-model="keepRunning" @change="save" />
        <label for="keep-running">{{ t('settings.general.keepInStatusBar') }}</label>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">

import LangSelect from '@components/LangSelect.vue'
import { t } from '@services/i18n'
import { store } from '@services/store'
import { ref } from 'vue'
import Dialog from '@renderer/utils/dialog'
import defaults from '@root/defaults/settings.json'

const appearance = ref(null)
const darkTint = ref(null)
const lightTint = ref(null)
const locales = ref([])
const localeUI = ref(null)
const runAtLogin = ref(false)
const hideOnStartup = ref(false)
const keepRunning = ref(false)

const resetOptions = [
  { key: 'tips', label: t('settings.general.resetOptions.tips') },
  { key: 'llm', label: t('settings.general.resetOptions.llm') },
  { key: 'appearance', label: t('settings.general.resetOptions.appearance') },
  { key: 'shortcuts', label: t('settings.general.resetOptions.shortcuts') },
  { key: 'plugins', label: t('settings.general.resetOptions.plugins') },
  { key: 'stt', label: t('settings.general.resetOptions.stt') },
  { key: 'tts', label: t('settings.general.resetOptions.tts') },
  { key: 'rag', label: t('settings.general.resetOptions.rag') },
  { key: 'language', label: t('settings.general.resetOptions.language') },
]

const setAppearanceTheme = (value: string) => {
  appearance.value = value
  window.api.app.setAppearanceTheme(value)
  save()
}

const load = () => {
  appearance.value = store.config.appearance.theme || 'system'
  lightTint.value = store.config.appearance.lightTint || 'white'
  darkTint.value = store.config.appearance.darkTint || 'black'
  locales.value = Object.keys(window.api.config.getI18nMessages())
  localeUI.value = store.config.general.locale
  runAtLogin.value = window.api.runAtLogin.get()
  hideOnStartup.value = store.config.general.hideOnStartup
  keepRunning.value = store.config.general.keepRunning
}

const onResetSettings = async () => {
  const html = `
    <div class="reset-options">
      <p style="margin-bottom: 16px; text-align: left;">${t('settings.general.resetSettingsDescription')}</p>
      ${resetOptions.map(opt => `
        <label class="reset-option">
          <input type="checkbox" name="reset-${opt.key}" value="${opt.key}" checked>
          <span>${opt.label}</span>
        </label>
      `).join('')}
    </div>
  `

  const result = await Dialog.show({
    title: t('settings.general.resetSettings'),
    html,
    showCancelButton: true,
    confirmButtonText: t('common.reset'),
    preConfirm: () => {
      const checkboxes = document.querySelectorAll('.reset-option input[type="checkbox"]:checked') as NodeListOf<HTMLInputElement>
      return Array.from(checkboxes).map(cb => cb.value)
    }
  })

  if (result.isConfirmed && (result as any).value?.length > 0) {
    const confirmResult = await Dialog.show({
      title: t('settings.general.resetSettings'),
      text: t('settings.general.resetConfirm'),
      showCancelButton: true,
      confirmButtonText: t('common.ok'),
    })

    if (confirmResult.isConfirmed) {
      const selectedKeys = (result as any).value as string[]
      resetSelectedSettings(selectedKeys)
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }
  }
}

const resetSelectedSettings = (keys: string[]) => {
  for (const key of keys) {
    switch (key) {
      case 'tips':
        store.config.general.tips = { ...defaults.general.tips }
        break
      case 'llm':
        store.config.llm = JSON.parse(JSON.stringify(defaults.llm))
        store.config.engines.__favorites__ = JSON.parse(JSON.stringify(defaults.engines.__favorites__))
        break
      case 'appearance':
        store.config.appearance = JSON.parse(JSON.stringify(defaults.appearance))
        break
      case 'shortcuts':
        store.config.shortcuts = JSON.parse(JSON.stringify(defaults.shortcuts))
        break
      case 'plugins':
        store.config.plugins = JSON.parse(JSON.stringify(defaults.plugins))
        break
      case 'stt':
        store.config.stt = JSON.parse(JSON.stringify(defaults.stt))
        break
      case 'tts':
        store.config.tts = JSON.parse(JSON.stringify(defaults.tts))
        break
      case 'rag':
        store.config.rag = JSON.parse(JSON.stringify(defaults.rag))
        break
      case 'language':
        store.config.general.locale = defaults.general.locale
        store.config.llm.locale = defaults.llm.locale
        break
    }
  }
  store.saveSettings()
}

const save = () => {
  store.config.appearance.theme = appearance.value
  store.config.appearance.lightTint = lightTint.value
  store.config.appearance.darkTint = darkTint.value
  store.config.general.locale = localeUI.value
  window.api.runAtLogin.set(runAtLogin.value)
  store.config.general.hideOnStartup = hideOnStartup.value
  store.config.general.keepRunning = keepRunning.value
  store.saveSettings()
}

defineExpose({ load })

</script>


<style scoped>

dialog.settings .sp-main {
  width: 480px;
}

.form .form-field label {
  min-width: 170px;
}

.appearance {
  padding-bottom: 8px;
  margin-top: 0px;
}

.appearance .form-subgroup {
  margin-top: 1rem;
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 3rem;
}

.appearance .form-subgroup div {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.appearance img {
  height: auto;
  width: 64px;
  object-fit: contain;
  padding: 1px;
  border: 3px solid transparent;
}

.appearance div {
  text-align: center;
}

.appearance div.selected img {
  border: 3px solid var(--highlight-color);
  border-radius: 8px;
}

</style>

<style>

.reset-options {
  text-align: left;
}

.reset-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  cursor: pointer;
}

.reset-option input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.reset-option span {
  user-select: none;
}

</style>
