<div align="center">

  <img src="assets/icon.png" width="128" alt="Witsy Logo">
  <div><b>Witsy</b></div>
  <div>桌面AI助手<br/>通用MCP客户端</div>

</div>

<p></p>
<div align="center">

[![版本徽章](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/nbonamy/8febadb1ecb32078db4c003d0c09f565/raw/version.json)](https://github.com/nbonamy/witsy/releases)
[![下载徽章](https://img.shields.io/github/downloads/nbonamy/witsy/total.svg?color=orange)](https://tooomm.github.io/github-release-stats/?username=nbonamy&repository=witsy)
[![测试徽章](https://github.com/nbonamy/witsy/actions/workflows/test.yml/badge.svg)](https://github.com/nbonamy/witsy/blob/main/.github/workflows/test.yml)

</div>

---

## 目录

- [下载安装](#下载安装)
- [项目简介](#项目简介)
- [技术架构](#技术架构)
- [支持的AI提供商](#支持的ai提供商)
- [核心功能](#核心功能)
- [快速开始](#快速开始)
- [API密钥配置](#api密钥配置)
- [功能详解](#功能详解)
- [HTTP API](#http-api)
- [命令行界面](#命令行界面)
- [Agent Webhooks](#agent-webhooks)
- [开发指南](#开发指南)
- [项目结构](#项目结构)

---

## 下载安装

从 [Releases](https://github.com/nbonamy/witsy/releases) 页面下载 Witsy。

macOS 用户也可以使用 Homebrew 安装：
```bash
brew install --cask witsy
```

---

## 项目简介

Witsy 是一款 **BYOK (Bring Your Own Keys)** AI 应用程序：您需要为自己想使用的 LLM 提供商准备 API 密钥。或者，您可以使用 [Ollama](https://ollama.com) 在本地免费运行模型。

Witsy 是首批通用 MCP 客户端之一：<br/>**Witsy 允许您在几乎所有 LLM 上运行 MCP 服务器！**

---

## 技术架构

| 技术 | 说明 |
|------|------|
| **Electron** | 跨平台桌面应用框架 |
| **Vue 3** | 渐进式 JavaScript 框架 |
| **TypeScript** | 类型安全的 JavaScript 超集 |
| **Vite** | 下一代前端构建工具 |
| **Electron Forge** | Electron 应用打包发布工具 |

---

## 支持的AI提供商

| 能力 | 提供商 |
|------|--------|
| **聊天对话** | OpenAI, Anthropic, Google (Gemini), xAI (Grok), Meta (Llama), Ollama, LM Studio, MistralAI, DeepSeek, OpenRouter, Groq, Cerebras, Azure OpenAI, 以及任何支持 OpenAI API 标准的提供商 |
| **图像生成** | OpenAI, Google, xAI, Replicate, fal.ai, HuggingFace, Stable Diffusion WebUI |
| **视频生成** | OpenAI, Google, Replicate, fal.ai |
| **文字转语音** | OpenAI, ElevenLabs, Groq, fal.ai |
| **语音转文字** | OpenAI (Whisper), fal.ai, Fireworks.ai, Gladia, Groq, nVidia, Speechmatics, 本地 Whisper, Soniox |
| **搜索引擎** | Perplexity, Tavily, Brave, Exa, 本地 Google 搜索 |
| **MCP 仓库** | Smithery.ai |
| **向量嵌入** | OpenAI, Ollama |

---

## 核心功能

- 💬 **聊天对话** - 支持视觉模型（图像描述）
- 🎨 **文生图/文生视频** - 多种 AI 模型支持
- ✏️ **图像编辑/视频编辑** - 图生图、图生视频
- 🔌 **LLM 插件系统** - 执行 Python 代码、网络搜索等
- 🖥️ **MCP 服务器支持** - Anthropic Model Context Protocol
- 📝 **Scratchpad** - 交互式内容创作工作台
- ⌨️ **Prompt Anywhere** - 在任意应用中生成内容
- ⚡ **AI 命令** - 对选中文本执行快捷 AI 操作
- 🎯 **专家系统** - 领域专用的提示词模板
- 🧠 **长期记忆** - 提升 LLM 回答相关性
- 📖 **朗读功能** - 朗读助手消息或任意应用中的文本
- 📚 **文档对话 (RAG)** - 与本地文件和文档聊天
- 🎤 **语音转文字/听写** - 多种语音识别模型支持
- 🗣️ **实时聊天/语音模式** - 实时语音交互
- 🤖 **Computer Use** - Anthropic 电脑操作支持
- 💾 **本地历史记录** - 自动生成对话标题
- 📄 **PDF 导出** - 对话导出功能

<p align="center">
  <img src="doc/main1.jpg" height="250" />&nbsp;&nbsp;
  <img src="doc/main2.jpg" height="250" />&nbsp;&nbsp;
  <img src="doc/studio.jpg" height="250" />
</p>

---

## 快速开始

### 从发布版下载

从 [Releases](https://github.com/nbonamy/witsy/releases) 页面下载对应平台的安装包。

### 从源码构建

```bash
npm ci
npm start
```

---

## API密钥配置

使用以下 AI 服务需要配置对应的 API 密钥：

| 服务 | 获取地址 |
|------|----------|
| OpenAI | https://platform.openai.com/api-keys |
| Anthropic | https://console.anthropic.com/settings/keys |
| Google | https://aistudio.google.com/app/apikey |
| xAI | https://console.x.ai/team/ |
| Meta | https://llama.developer.meta.com/api-keys/ |
| MistralAI | https://console.mistral.ai/api-keys |
| DeepSeek | https://platform.deepseek.com/api_keys |
| OpenRouter | https://openrouter.ai/settings/keys |
| Groq | https://console.groq.com/keys |
| Cerebras | https://cloud.cerebras.ai/platform/ |

**本地模型**: 安装 [Ollama](https://ollama.com) 并下载 [模型](https://ollama.com/search)。

**语音服务**: 
- [Fal.ai API Key](https://fal.ai/dashboard/keys)
- [Fireworks.ai API Key](https://app.fireworks.ai/settings/users/api-keys)
- [Speechmatics API Key](https://portal.speechmatics.com/settings/api-keys)
- [Gladia API Key](https://app.gladia.io/account)

**网络搜索**: [Tavily API Key](https://app.tavily.com/home)

<p align="center">
  <img src="doc/settings.jpg" height="250" />&nbsp;&nbsp;
</p>

---

## 功能详解

### Prompt Anywhere（随处提示）

在任意应用中生成内容：
1. 在任意应用的可编辑内容中
2. 按下 Prompt Anywhere 快捷键（Shift+Control+Space / ^⇧Space）
3. 在弹出的窗口中输入提示词
4. 观察 Witsy 直接将文本输入到您的应用中！

**macOS 特性**: 可以定义根据前台应用自动触发的专家。例如，如果有一个用于生成 Linux 命令的专家，可以在 Terminal 应用中触发时自动选中它！

### AI 命令

AI 命令是通过快捷键访问的快速助手，利用 LLM 提升您的生产力：
1. 在任意应用中选择文本
2. 按下 AI 命令快捷键（Alt+Control+Space / ⌃⌥Space）
3. 选择一个命令，让 LLM 发挥魔力！

您也可以创建自定义命令，使用您喜欢的提示词！

<p align="center">
  <img src="doc/commands1.jpg" height="200" />&nbsp;&nbsp;
  <img src="doc/commands2.jpg" height="200" />&nbsp;&nbsp;
  <img src="doc/commands3.jpg" height="200" />
</p>

### 专家系统

来自 [awesome-chatgpt-prompts](https://github.com/f/awesome-chatgpt-prompts) 的精选提示词集合。

### Scratchpad（便笺本）

交互式内容创作工作台，支持多种模型切换，实时预览效果。

### 文档对话 (RAG)

您可以将每个聊天与文档仓库连接：Witsy 会首先在本地文件中搜索相关文档，并将这些信息提供给 LLM。

使用方法：
1. 点击提示词左侧的数据库图标
2. 点击"管理"，然后创建文档仓库
3. OpenAI 嵌入需要 API 密钥，Ollama 需要嵌入模型
4. 点击窗口右侧的 + 按钮添加文档
5. 创建完成后，再次点击数据库图标选择要使用的文档仓库

### 语音转文字/听写

支持多种先进的语音转文字模型：
- GPT4o-Transcribe
- Gladia
- Speechmatics（标准版 + 增强版）
- Groq Whisper V3
- Fireworks.ai 实时转录
- fal.ai Wizper V3
- nVidia Microsoft Phi-4 Multimodal

转录后的文本可以：
- 复制到剪贴板
- 总结
- 翻译成任意语言
- 插入到激活听写前运行的应用中

### Anthropic Computer Use

支持 Anthropic 的 Computer Use 功能，允许 AI 控制您的电脑执行任务。

---

## HTTP API

Witsy 提供本地 HTTP API，允许外部应用触发各种命令和功能。API 服务器默认在 `localhost` 的 **8090** 端口运行。

### 查找服务器端口

当前 HTTP 服务器端口显示在托盘菜单中：
- **macOS/Linux**: 查看菜单栏中的钢笔图标
- **Windows**: 查看系统托盘中的钢笔图标

### 可用端点

| 端点 | 描述 | 可选参数 |
|------|------|----------|
| `GET /api/health` | 服务器健康检查 | - |
| `GET/POST /api/chat` | 打开主窗口聊天视图 | `text` - 预填充聊天输入 |
| `GET/POST /api/scratchpad` | 打开便笺本 | - |
| `GET/POST /api/settings` | 打开设置窗口 | - |
| `GET/POST /api/studio` | 打开设计工作室 | - |
| `GET/POST /api/forge` | 打开代理工作台 | - |
| `GET/POST /api/realtime` | 打开实时聊天（语音模式） | - |
| `GET/POST /api/prompt` | 触发 Prompt Anywhere | `text` - 预填充提示词 |
| `GET/POST /api/command` | 触发 AI 命令选择器 | `text` - 预填充命令文本 |
| `GET/POST /api/transcribe` | 开始转录/听写 | - |
| `GET/POST /api/readaloud` | 开始朗读 | - |
| `GET /api/engines` | 列出可用的 AI 引擎 | - |
| `GET /api/models/:engine` | 列出引擎的模型 | - |
| `POST /api/complete` | 运行聊天补全 | `stream`, `engine`, `model`, `thread` |
| `GET/POST /api/agent/run/:token` | 通过 webhook 触发代理执行 | 查询参数作为提示词输入 |
| `GET /api/agent/status/:token/:runId` | 检查代理执行状态 | - |

### 示例用法

```bash
# 健康检查
curl http://localhost:8090/api/health

# 打开聊天并预填充文本
curl "http://localhost:8090/api/chat?text=Hello%20World"

# 触发 Prompt Anywhere
curl "http://localhost:8090/api/prompt?text=Write%20a%20poem"

# 列出可用引擎
curl http://localhost:8090/api/engines

# 运行聊天补全
curl -X POST http://localhost:8090/api/complete \
  -H "Content-Type: application/json" \
  -d '{
    "stream": "false",
    "engine": "openai",
    "model": "gpt-4",
    "thread": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'
```

---

## 命令行界面

Witsy 包含命令行界面，允许您直接从终端与 AI 助手交互。

### 安装

首次启动 Witsy 时会自动安装 CLI：
- **macOS**: 在 `/usr/local/bin/witsy` 创建符号链接（需要管理员密码）
- **Windows**: 将 CLI 添加到用户 PATH（重启终端生效）
- **Linux**: 在 `/usr/local/bin/witsy` 创建符号链接

### 使用

```bash
witsy
```

### 可用命令

| 命令 | 描述 |
|------|------|
| `/help` | 显示可用命令 |
| `/model` | 选择引擎和模型 |
| `/port` | 更改服务器端口（默认：4321） |
| `/clear` | 清除对话历史 |
| `/history` | 显示对话历史 |
| `/exit` | 退出 CLI |

### 要求

- Witsy 桌面应用必须运行
- HTTP API 服务器已启用

---

## Agent Webhooks

Agent Webhooks 允许您通过 HTTP 请求触发代理执行，实现与外部系统的集成。

### 设置 Webhook

1. 打开 Agent Forge 并选择或创建代理
2. 导航到 "Invocation" 标签页
3. 勾选 "🌐 Webhook" 复选框
4. 自动生成唯一的 8 字符令牌
5. 复制显示的 webhook URL

### 使用 Webhook

```bash
# 使用 GET 请求
curl "http://localhost:8090/api/agent/run/abc12345?task=backup&user=john&priority=high"

# 使用 POST 请求
curl -X POST http://localhost:8090/api/agent/run/abc12345 \
  -H "Content-Type: application/json" \
  -d '{"task":"backup","user":"john","priority":"high"}'
```

### 检查执行状态

```bash
curl "http://localhost:8090/api/agent/status/abc12345/run-uuid-here"
```

---

## 开发指南

### 环境要求

- Node.js 18+
- npm 9+

### 开发命令

```bash
# 安装依赖
npm ci

# 启动开发服务器
npm start

# 运行测试
npm test

# 代码检查
npm run lint

# 打包应用
npm run package

# 构建发布版
npm run make
```

### 项目脚本

| 脚本 | 描述 |
|------|------|
| `npm start` | 启动开发服务器 |
| `npm test` | 运行测试 |
| `npm run lint` | 代码检查（ESLint + TypeScript + Stylelint） |
| `npm run package` | 打包应用 |
| `npm run make` | 构建安装包 |
| `npm run publish` | 发布到 GitHub |

---

## 项目结构

```
witsy/
├── assets/                 # 静态资源（图标、字体等）
├── build/                  # 构建脚本和配置
├── css/                    # 样式文件
│   └── themes/            # 主题样式
├── defaults/              # 默认配置文件
├── doc/                   # 文档图片
├── locales/               # 国际化语言文件
├── patches/               # 依赖补丁
├── src/
│   ├── cli/               # 命令行界面
│   ├── main/              # Electron 主进程
│   │   ├── automations/   # 自动化模块
│   │   ├── migrations/    # 数据迁移
│   │   ├── rag/          # RAG 文档处理
│   │   └── windows/      # 窗口管理
│   ├── models/           # 数据模型
│   └── renderer/         # Vue 渲染进程
│       ├── agent/        # Agent 相关组件
│       ├── audio/        # 音频处理
│       ├── components/   # Vue 组件
│       ├── composables/  # Vue 组合式函数
│       ├── directives/   # Vue 指令
│       ├── docrepo/      # 文档仓库
│       ├── mcp/          # MCP 相关
│       ├── onboarding/   # 引导流程
│       ├── scratchpad/   # 便笺本
│       ├── screens/      # 页面组件
│       ├── services/     # 服务层
│       │   ├── llms/    # LLM 服务
│       │   ├── plugins/ # 插件系统
│       │   └── realtime/# 实时通信
│       └── settings/     # 设置页面
├── tests/                 # 测试文件
└── tools/                 # 工具脚本
```

---

## 许可证

本项目采用 [AGPL-3.0-or-later](LICENSE) 许可证。

---

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

---

## 致谢

感谢所有贡献者和开源项目的支持。查看 [CREDITS.md](CREDITS.md) 了解详情。
