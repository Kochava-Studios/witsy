import { HarmCategory } from '@google/genai'
import GoogleEngine from '@services/llms/google'
import { ChatModel, Google, LlmCompletionOpts } from 'multi-llm-ts'
import { afterEach, describe, expect, test, vi } from 'vitest'

const model: ChatModel = {
  id: 'gemini-2.5-pro',
  name: 'Gemini 2.5 Pro',
  capabilities: {
    vision: false,
    tools: true,
    reasoning: true,
    caching: false,
  },
} as ChatModel

const createEngine = (config: Record<string, unknown> = {}) => new GoogleEngine({
  apiKey: 'test-api-key',
  ...config,
} as any)

const getGenerationConfig = (engine: GoogleEngine, opts?: LlmCompletionOpts) => {
  return (engine as any).getGenerationConfig(model, opts)
}

describe('GoogleEngine', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('uses configured default thinking budget and applies safety settings', async () => {
    const superGetGenerationConfig = vi.spyOn(Google.prototype as any, 'getGenerationConfig').mockImplementation(async (_model, opts) => ({
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: opts?.thinkingBudget,
      },
    }))

    const config = await getGenerationConfig(createEngine({
      defaultThinkingBudget: 1024,
      safetySettings: 'BLOCK_NONE',
    }))

    expect(superGetGenerationConfig).toHaveBeenCalledWith(model, expect.objectContaining({ thinkingBudget: 1024 }))
    expect(config).toMatchObject({
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: 1024,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: 'BLOCK_NONE' },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: 'BLOCK_NONE' },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: 'BLOCK_NONE' },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: 'BLOCK_NONE' },
      ],
    })
  })

  test('falls back to automatic thinking budget when no default is configured', async () => {
    const superGetGenerationConfig = vi.spyOn(Google.prototype as any, 'getGenerationConfig').mockImplementation(async (_model, opts) => ({
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: opts?.thinkingBudget,
      },
    }))

    const config = await getGenerationConfig(createEngine())

    expect(superGetGenerationConfig).toHaveBeenCalledWith(model, expect.objectContaining({ thinkingBudget: -1 }))
    expect(config).toMatchObject({
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: -1,
      },
    })
  })

  test('preserves an explicit thinking budget override', async () => {
    const superGetGenerationConfig = vi.spyOn(Google.prototype as any, 'getGenerationConfig').mockImplementation(async (_model, opts) => ({
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: opts?.thinkingBudget,
      },
    }))

    const config = await getGenerationConfig(createEngine({ defaultThinkingBudget: 1024 }), { thinkingBudget: 256 })

    expect(superGetGenerationConfig).toHaveBeenCalledWith(model, expect.objectContaining({ thinkingBudget: 256 }))
    expect(config).toMatchObject({
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: 256,
      },
    })
  })

  test('returns undefined when the base engine returns no config', async () => {
    vi.spyOn(Google.prototype as any, 'getGenerationConfig').mockResolvedValue(undefined)

    await expect(getGenerationConfig(createEngine({
      safetySettings: 'BLOCK_NONE',
    }))).resolves.toBeUndefined()
  })
})