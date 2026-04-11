import { GenerateContentConfig, HarmBlockThreshold, HarmCategory } from '@google/genai'
import { ChatModel, Google, LlmCompletionOpts } from 'multi-llm-ts'
import { GoogleEngineConfig } from 'types/config'

export default class GoogleEngine extends Google {

  protected async getGenerationConfig(model: ChatModel, opts?: LlmCompletionOpts): Promise<GenerateContentConfig|undefined> {

    // we need opts
    if (!opts) opts = {} 

    // default thinking budget from engine config, or automatic
    if (typeof opts.thinkingBudget === 'undefined') {
      const googleConfig = this.config as unknown as GoogleEngineConfig
      opts.thinkingBudget = typeof googleConfig.defaultThinkingBudget !== 'undefined'
        ? googleConfig.defaultThinkingBudget
        : -1
    }

    // use default
    const config = await super.getGenerationConfig(model, opts)

    // apply engine-level safety settings to all content categories
    if (config) {
      const googleConfig = this.config as unknown as GoogleEngineConfig
      if (googleConfig.safetySettings) {
        const threshold = googleConfig.safetySettings as HarmBlockThreshold
        config.safetySettings = [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold },
        ]
      }
    }

    return config

  }
  
}
