# NotebookLM MCP 配置指南

## 📋 前置条件

- 已安装 notebooklm-mcp (已完成 ✅)
- Google NotebookLM 账号
- Chrome 浏览器用于首次认证

## 🚀 快速开始

### 1. 获取您的 NotebookLM URL

1. 访问 https://notebooklm.google.com
2. 创建或选择一个笔记本
3. 复制浏览器地址栏中的 URL

示例 URL: 
```
https://notebooklm.google.com/notebook/abc123xyz
```

### 2. 初始化 NotebookLM MCP

在终端中运行：

```bash
cd /workspace
uv run notebooklm-mcp init https://notebooklm.google.com/notebook/YOUR_NOTEBOOK_ID
```

### 3. 完成认证

初始化命令会：
- 创建配置文件 `notebooklm-config.json`
- 打开 Chrome 浏览器让您登录 Google 账号
- 保存会话信息以便后续使用

### 4. 测试连接

```bash
uv run notebooklm-mcp test
```

## 📁 配置文件

配置文件将自动创建在 `/workspace/notebooklm-config.json`

## 🔧 启动 MCP 服务器

### 方式 1: STDIO 模式（推荐）

```bash
uv run notebooklm-mcp --config notebooklm-config.json server
```

### 方式 2: HTTP 模式

```bash
uv run notebooklm-mcp --config notebooklm-config.json server --transport http --port 8001
```

## 🎯 NotebookLM MCP 功能

### 可用工具

| 工具 | 描述 |
|---|---|
| `notebook_list` | 列出所有笔记本 |
| `notebook_create` | 创建新笔记本 |
| `notebook_get` | 获取笔记本详情和源文件 |
| `notebook_describe` | 获取 AI 生成的笔记本内容摘要 |
| `source_describe` | 获取 AI 生成的源文件摘要和关键词 |
| `source_get_content` | 获取源文件的原始文本内容 |
| `notebook_query` | 查询问题并获取 AI 答案 |
| `notebook_add_url` | 添加 URL/YouTube 作为源文件 |
| `notebook_add_text` | 添加粘贴的文本作为源文件 |
| `notebook_add_drive` | 添加 Google Drive 文档作为源文件 |
| `audio_overview_create` | 生成音频播客 |
| `video_overview_create` | 生成视频概览 |
| `infographic_create` | 生成信息图表 |
| `slide_deck_create` | 生成幻灯片 |
| `research_start` | 开始网络或 Drive 研究 |
| `research_status` | 查询研究进度 |
| `research_import` | 导入发现的源文件 |

## 📝 集成到 Trae

要在 Trae 中使用这个 MCP 服务器，您需要配置 MCP 客户端。

**注意：** 此项目是一个学习助手应用，但您可以独立使用 NotebookLM MCP 进行研究和笔记管理。

## ⚠️ 注意事项

- 此工具使用 NotebookLM 的内部 API，可能会在无通知的情况下更改
- 仅供个人/实验使用
- 需要定期更新认证状态
