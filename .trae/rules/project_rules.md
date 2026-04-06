# Witsy 项目规则

## 项目概述

Witsy 是一个基于 Electron + Vue 3 + TypeScript 的跨平台桌面 AI 助手应用，支持多种 AI 提供商（OpenAI、Anthropic、Google、Mistral 等）的集成。

## 技术栈

- **运行时**: Electron 38 + Node.js 22
- **前端框架**: Vue 3 + TypeScript 5.9
- **构建工具**: Vite 5 + Electron Forge 7
- **测试框架**: Vitest + Playwright
- **代码规范**: ESLint 9 + Stylelint 16

## 目录结构

```
src/
├── main/           # Electron 主进程代码
│   ├── automations/    # 自动化模块（跨平台操作）
│   ├── migrations/     # 数据迁移
│   ├── rag/            # RAG 检索增强生成
│   └── windows/        # 窗口管理
├── renderer/       # Vue 渲染进程代码
│   ├── components/     # 可复用 Vue 组件
│   ├── composables/    # Vue 组合式函数
│   ├── screens/        # 页面级组件
│   └── services/       # 前端服务层
├── models/         # 数据模型定义
├── cli/            # 命令行工具
└── consts.ts       # 全局常量
```

## 路径别名

项目使用以下路径别名（定义于 tsconfig.json）：

| 别名 | 路径 |
|------|------|
| `@/*` | src/* |
| `@main/*` | src/main/* |
| `@renderer/*` | src/renderer/* |
| `@components/*` | src/renderer/components/* |
| `@composables/*` | src/renderer/composables/* |
| `@screens/*` | src/renderer/screens/* |
| `@services/*` | src/renderer/services/* |
| `@models/*` | src/models/* |
| `@tests/*` | tests/* |

## 代码规范

### 命名约定

- **文件命名**: PascalCase 用于 Vue 组件（如 `ChatArea.vue`），camelCase 用于 TypeScript 模块
- **组件命名**: PascalCase，使用多词名称避免与 HTML 元素冲突
- **变量/函数**: camelCase
- **常量**: UPPER_SNAKE_CASE 用于全局常量，camelCase 用于局部常量
- **类型/接口**: PascalCase，以 `I` 前缀表示接口（可选）

### TypeScript 规范

- 禁止使用 `any` 类型（项目已关闭 `@typescript-eslint/no-explicit-any` 规则，但仍应避免）
- 使用 ES 模块导入语法
- 优先使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型、交叉类型

### Vue 组件规范

- 使用 `<script setup lang="ts">` 语法
- 组件 Props 必须定义类型
- 使用 `defineProps` 和 `defineEmits` 宏
- 组件内使用的组件必须在模板中定义或导入

### 样式规范

- 使用 Stylelint 进行 CSS 规范检查
- Vue 组件内使用 `<style scoped>` 封装样式

## 开发命令

```bash
# 开发模式启动
npm run start

# 代码检查（ESLint + TypeScript + Stylelint）
npm run lint

# 类型检查
npm run typecheck

# 运行测试
npm run test

# E2E 测试
npm run test:e2e

# 打包应用
npm run package

# 构建安装程序
npm run make
```

## 关键依赖

### AI 相关
- `@langchain/core` - LangChain 核心库
- `@modelcontextprotocol/sdk` - MCP 协议 SDK
- `@openai/agents` - OpenAI Agents
- `@google/genai` - Google Generative AI
- `@mistralai/mistralai` - Mistral AI

### 编辑器
- `@tiptap/*` - 富文本编辑器

### Electron
- `electron-store` - 持久化存储
- `electron-log` - 日志记录

## 补丁管理

项目使用 `patch-package` 管理第三方依赖补丁，补丁文件位于 `patches/` 目录：

- `@excalidraw+markdown-to-text+0.1.2.patch` - 修复 listUnicodeChar 默认值
- `@modelcontextprotocol+sdk+1.25.2.patch` - Windows 平台兼容性
- `fix-webm-duration+1.0.6.patch` - 音频 MIME 类型修复

## 国际化

- 语言文件位于 `locales/` 目录
- 使用 i18n 进行多语言支持
- 主语言文件：`en.json`（英文）、`zh.json`（中文）

## 安全规范

- API 密钥等敏感信息禁止硬编码，使用环境变量或安全存储
- 禁止在日志中输出敏感信息
- 用户数据存储于用户目录，遵循操作系统规范

## Git 规范

- 提交信息使用约定式提交格式
- 分支命名：`feature/*`、`fix/*`、`refactor/*`

## 注意事项

1. **跨平台兼容**: 代码需考虑 Windows、macOS、Linux 三平台兼容性
2. **Electron 安全**: 启用 contextIsolation，禁用 nodeIntegration
3. **性能优化**: 避免主进程阻塞，大文件处理使用 Worker
4. **内存管理**: 及时释放资源，避免内存泄漏
