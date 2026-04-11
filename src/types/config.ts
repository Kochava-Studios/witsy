
import { ChatModel, EngineCreateOpts, Model, LlmModelOpts } from 'multi-llm-ts'
import { CustomInstruction, DesignStudioMediaType, Shortcut, strDict, TTSVoice } from './index'
import { PluginConfig } from '../renderer/services/plugins/plugin'
import { McpClaudeServer, McpServer, McpServerState, McpOAuthConfig } from './mcp'
import { ToolSelection } from './llm'

export type Configuration = {
  workspaceId: string
  general: GeneralConfig
  llm: LLMConfig
  prompt: PromptConfig
  commands: CommandsConfig
  automation: AutomationConfig
  instructions: InstructionsConfig
  deepresearch: DeepResearchConfig
  appearance: AppearanceConfig
  studio: DesignStudioConfig
  shortcuts: ShortcutsConfig
  scratchpad: ScratchpadConfig
  skills: SkillsConfig
  engines: Record<string, EngineConfig|CustomEngineConfig>
  plugins: Record<string, PluginConfig>
  stt: STTConfig
  tts: TTSConfig
  rag: RagConfig
  realtime: RealtimeConfig
  mcp: McpConfig
  mcpServers: Record<string, McpClaudeServer>
  features?: Record<string, any>
  migrations?: string[]
}

export type WitsyEngineCreateOpts = EngineCreateOpts & {
  keepAlive?: string
  providerOrder?: string
}

export type EngineConfig = WitsyEngineCreateOpts & {
  models: ModelsConfig
  model: ModelConfig
  realtime?: EngineRealtimeConfig
  hideDatedModels?: boolean
  disableTools?: boolean
  voices?: TTSVoice[]
}

export type CustomEngineConfig = EngineConfig & {
  label: string
  api: string
}

export type GoogleEngineConfig = EngineConfig & {
  safetySettings?: string
  defaultThinkingBudget?: number
}

export type ProxyMode = 'default' | 'bypass' | 'custom'

export type GeneralConfig = {
  firstRun: boolean
  safeKeys: boolean
  onboardingDone: boolean
  hideOnStartup: boolean
  keepRunning: boolean
  proxyMode: ProxyMode
  customProxy: string
  locale: string
  tips: {[key: string]: boolean}
  confirm: {[key: string]: boolean}
  webappEvictionMinutes: number
  enableHttpEndpoints: boolean
  cliInstallError: boolean
  httpPort?: number
}

export type FavoriteModel = {
  id: string
  engine: string
  model: string
}

export type ModelDefaults = {
  engine: string
  model: string
  disableStreaming: boolean
  disableTools?: boolean // backwards compatibility
  tools: ToolSelection
  locale?: string
  instructions?: string
  expert?: string
  docrepo?: string
  modelOpts?: LlmModelOpts
}

export type InstructionsType = 'standard' | 'structured' | 'playful' | 'empathic' | 'uplifting' | 'reflective' | 'visionary' | string

export type CodeExecutionMode = 'disabled' | 'proxy' | 'program'

export type LLMConfig = {
  instructions: InstructionsType  
  engine: string
  locale: string
  forceLocale: boolean
  favorites: FavoriteModel[]
  conversationLength: number
  imageResize: number
  defaults: ModelDefaults[]
  customInstructions: CustomInstruction[]
  codeExecution: CodeExecutionMode
  additionalInstructions: {
    toolRetry: boolean
    datetime: boolean
    mermaid: boolean
    artifacts: boolean
  }
}

export type InstructionsConfig = {
  chat: strDict
  scratchpad: strDict
  utils: {
    titling: string
    titlingUser: string
  }
}

export type DeepResearchRuntime = 'ma' | 'ms' | 'al'

export type DeepResearchConfig = {
  runtime: DeepResearchRuntime
  breadth: number
  depth: number
  searchResults: number
}

export type AppearanceConfig = {
  theme: 'light' | 'dark' | 'system'
  lightTint: 'white' | 'gray'
  darkTint: 'black' | 'blue'
  chatList: ChatListAppearance
  chat: ChatAppearance
}

export type PromptConfig = {
  engine: string
  model: string
  disableStreaming: boolean
  tools: ToolSelection
  autosave: boolean
}

export type DesignStudioModel = {
  engine: string
  model: string
}

export type DesignStudioModelDefaults = DesignStudioModel & {
  params: Record<string, string>
}

export type DesignStudioConfig = {
  type: DesignStudioMediaType
  engines: Record<DesignStudioMediaType, string>
  favorites: DesignStudioModel[]
  defaults: DesignStudioModelDefaults[]
}

export type CommandsConfig = {
  engine: string
  model: string
}

export type AutomationConfig = {
  altWinCopyPaste: boolean
}

export type ChatTheme = 'openai' | 'conversation'

export type ToolCallsDisplay = 'none' | 'summary' | 'details'

export type TextFormat = 'text' | 'markdown'

export type SendKey = 'enter' | 'shiftEner'

export type ChatAppearance = {
  showReasoning: boolean
  theme: ChatTheme
  fontFamily: string
  fontSize: number
  sendKey: SendKey
  autoPreview: {
    html: boolean
  }
  toolCallsDisplay: ToolCallsDisplay
  copyFormat: TextFormat
}

export type ChatListMode = 'timeline' | 'folder'

export type ChatListLayout = 'normal' | 'compact'

export type ChatListAppearance = {
  mode: ChatListMode
  layout: ChatListLayout
}

export type ShortcutsConfig = {
  main: Shortcut
  prompt: Shortcut
  scratchpad: Shortcut
  command: Shortcut
  readaloud: Shortcut
  dictation: Shortcut
  audioBooth: Shortcut
  realtime: Shortcut
  studio: Shortcut
  forge: Shortcut
}

export type ScratchpadConfig = {
  engine: string
  model: string
  fontFamily: string
  fontSize: string
  autoSave: boolean
}

export type SkillsConfig = {
  locations: string[]
}

export type STTVocabulary = {
  text: string
}

//export type SilenceAction = 'nothing' | 'stop_transcribe' | 'stop_execute' | 'execute_continue'

export type ShortcutActivation = 'tap' | 'doubleTap' | 'hold'

export type STTConfig = {
  locale: string
  vocabulary: STTVocabulary[]
  engine: string
  model: string
  autoStart: boolean
  pushToTalk: boolean
  silenceDetection: boolean
  silenceDuration: number
  customOpenAI: {
    baseURL: string
  }
  nvidia: {
    prompt: string
  }
  mistralai: {
    prompt: string
  }
  whisper: {
    gpu: boolean
  }
  parakeet?: {
    gpu: boolean
  }
  soniox?: {
    cleanup?: boolean
    audioFormat?: string
  }
  quickDictation: {
    appearance: 'bottom' | 'top' | 'notch'
    copyToClipboard: boolean
    activation: ShortcutActivation
  }
  //silenceAction: SilenceAction
}

export type TTSConfig = {
  engine: string
  model: string
  voice: string
  customOpenAI: {
    baseURL: string
  }
}

export type RealtimeConfig = {
  engine: string
  tools: string[]
}

export type ModelType = 'chat' | 'image' | 'video' | 'embedding' | 'realtime' | 'computer' | 'tts' | 'stt' | 'imageEdit' | 'videoEdit'

export type ModelsConfig = {
  chat: ChatModel[]
  image?: Model[]
  imageEdit?: Model[]
  video?: Model[]
  videoEdit?: Model[]
  embedding?: Model[]
  realtime?: Model[]
  computer?: Model[]
  tts?: Model[]
  stt?: Model[]
}

export type ModelConfig = {
  chat?: string
  image?: string
  imageEdit?: string
  video?: string
  videoEdit?: string
  vision?: string
}

export type EngineRealtimeConfig = {
  model: string
  voice: string
}

export type RagConfig = {
  maxDocumentSizeMB?: number
  chunkSize?: number
  chunkOverlap?: number
  searchResultCount?: number
  relevanceCutOff?: number
  excludePatterns?: string
}

export type McpServerExtra = {
  label?: string
  state?: McpServerState
  oauth?: McpOAuthConfig
  toolSelection?: ToolSelection
  toolMappings?: Record<string, string>
}

export type McpConfig = {
  servers: McpServer[]
  //disabledMcpServers: string[]
  mcpServersExtra: Record<string, McpServerExtra>
  smitheryApiKey: string
}
