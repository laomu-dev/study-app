# 手动认证 NotebookLM MCP 指南

## ✅ 已完成
- 配置文件已创建：`notebooklm-config.json`
- 配置包含您的笔记本 ID：`9225bed2-dd9e-48f5-bec3-fd2b9898c39a`

---

## 🔐 方式 1：使用 Cookie 认证（推荐）

### 步骤 1：提取 NotebookLM 的 Cookie

1. 在您已经登录的浏览器中（Chrome/Edge），按 `F12` 打开开发者工具
2. 切换到 **Network（网络）** 标签
3. 刷新 NotebookLM 页面
4. 点击任意一个请求（选择第一个即可）
5. 在右侧找到 **Request Headers** → **Cookie**
6. 复制完整的 Cookie 内容

### 步骤 2：保存 Cookie

在 `/workspace/` 目录下创建文件 `cookies.txt`，粘贴您的 Cookie：

```bash
cd /workspace
# 创建 cookies.txt 并粘贴您的 Cookie
```

### 步骤 3：更新配置文件

修改 [notebooklm-config.json](file:///workspace/notebooklm-config.json)：

```json
{
  "headless": false,
  "debug": false,
  "timeout": 60,
  "default_notebook_id": "9225bed2-dd9e-48f5-bec3-fd2b9898c39a",
  "base_url": "https://notebooklm.google.com",
  "server_name": "notebooklm-mcp",
  "stdio_mode": true,
  "streaming_timeout": 60,
  "response_stability_checks": 3,
  "retry_attempts": 3,
  "auth": {
    "cookies_path": "./cookies.txt",
    "profile_dir": "./chrome_profile_notebooklm",
    "use_persistent_session": true,
    "auto_login": false
  }
}
```

---

## 🔐 方式 2：在您的本地环境中设置

如果您想在本地环境中使用：

### 在您的本地电脑上：

```bash
# 1. 安装 notebooklm-mcp
uv tool install notebooklm-mcp

# 2. 初始化（这会在您的本地打开浏览器）
uv run notebooklm-mcp init https://notebooklm.google.com/notebook/9225bed2-dd9e-48f5-bec3-fd2b9898c39a

# 3. 测试连接
uv run notebooklm-mcp test

# 4. 启动服务器
uv run notebooklm-mcp --config notebooklm-config.json server
```

---

## 📋 可用的 notebooklm-mcp 命令

查看所有可用命令：

```bash
cd /workspace
uv run notebooklm-mcp --help
```

常用命令：

| 命令 | 说明 |
|---|---|
| `notebooklm-mcp init <URL>` | 初始化配置 |
| `notebooklm-mcp test` | 测试连接 |
| `notebooklm-mcp server` | 启动服务器 |
| `notebooklm-mcp chat` | 交互式聊天 |
| `notebooklm-mcp config-show` | 显示当前配置 |

---

## 🎯 验证是否成功

一旦配置好认证后，运行：

```bash
cd /workspace
uv run notebooklm-mcp test
```

如果成功，您将看到连接确认信息！
