# 学习助手 - 快速部署指南

## 📋 部署前准备

### 您需要准备：
1. **GitHub 账号**（免费）
   - 访问 https://github.com
   - 注册并登录

2. **Railway 账号**（免费，每月500小时）
   - 访问 https://railway.app
   - 使用 GitHub 账号登录

3. **Vercel 账号**（免费）
   - 访问 https://vercel.com
   - 使用 GitHub 账号登录

---

## 🎯 第一阶段：代码准备（约5分钟）

### 步骤 1.1：在本地初始化 Git 仓库

打开终端，进入项目目录：

```bash
cd /workspace
git init
git add .
git commit -m "Initial commit: 学习助手应用"
```

### 步骤 1.2：创建 GitHub 仓库

1. 访问 https://github.com/new
2. 填写仓库名称：`study-app`
3. 选择 "Private"（私有）
4. 点击 "Create repository"

### 步骤 1.3：推送代码到 GitHub

```bash
git remote add origin https://github.com/您的用户名/study-app.git
git branch -M main
git push -u origin main
```

⚠️ **提示**：首次推送可能需要输入 GitHub 用户名和密码（或 Personal Access Token）

---

## 🎯 第二阶段：Railway 后端部署（约10分钟）

### 步骤 2.1：创建 Railway 项目

1. 访问 https://railway.app
2. 点击 "New Project"
3. 选择 **"Deploy from GitHub repo"**
4. 授权 GitHub 访问
5. 选择 `study-app` 仓库
6. Railway 会自动检测 Node.js 项目

### 步骤 2.2：配置数据库

Railway 会自动创建 MySQL 数据库！

1. 在 Railway 项目面板中，点击 "New Variable"
2. 添加以下环境变量：

```
NODE_ENV=production
SESSION_SECRET=随机字符串（生成方法见下方）
```

#### 生成安全的 SESSION_SECRET：

```bash
# 在终端执行：
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制生成的字符串，粘贴到 Railway 环境变量中。

### 步骤 2.3：配置构建命令

1. 在 Railway 项目设置中，找到 **"Start Command"**
2. 设置为：
```bash
npx tsx api/server.ts
```

### 步骤 2.4：获取后端 URL

部署完成后，Railway 会提供一个 URL，类似：
```
https://study-app.railway.app
```

**记录下这个 URL**，后面的前端配置会用到！

---

## 🎯 第三阶段：Vercel 前端部署（约5分钟）

### 步骤 3.1：创建 Vercel 项目

1. 访问 https://vercel.com
2. 点击 "Add New..." → "Project"
3. 导入 `study-app` GitHub 仓库
4. Vercel 会自动检测为 React 项目

### 步骤 3.2：配置环境变量

在 Vercel 项目设置中添加：

```
# API 地址（替换为您的 Railway 后端 URL）
VITE_API_URL=https://study-app.railway.app
```

### 步骤 3.3：修改前端 API 配置

创建或修改 `src/lib/api.ts`，使用环境变量：

```typescript
const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  // ... 其他 API 调用保持不变
};
```

### 步骤 3.4：推送更新

```bash
git add .
git commit -m "Add environment variable support"
git push
```

Vercel 会自动检测到 Git 更新并重新部署！

---

## 🎯 第四阶段：测试部署（约2分钟）

### 步骤 4.1：访问应用

1. 打开 Vercel 给您的预览 URL（类似：`https://study-app.vercel.app`）
2. 这个就是您应用的正式地址！

### 步骤 4.2：测试登录

使用以下账号登录：
- **管理员**：`admin` / `admin123`
- **普通用户**：`testuser` / `admin123`

### 步骤 4.3：验证数据互通

现在您可以：
1. ✅ 在电脑上打开应用网址学习
2. ✅ 在手机上打开**同一个网址**学习
3. ✅ 两边数据完全同步！

---

## 🔧 常见问题解决

### 问题 1：Railway 部署失败
**解决**：检查构建日志，确保：
- Start Command 正确设置为 `npx tsx api/server.ts`
- Node.js 版本兼容（建议 v18+）

### 问题 2：前端无法连接后端
**解决**：
1. 确认 Railway 后端 URL 正确
2. 检查 Railway 的 CORS 设置
3. 确认环境变量 `VITE_API_URL` 已配置

### 问题 3：数据库连接失败
**解决**：
- Railway 会自动配置 `DATABASE_URL` 环境变量
- 确保 `database-simple.ts` 正确读取该变量

### 问题 4：Session 不生效
**解决**：
- 确保 `SESSION_SECRET` 已设置且足够长（32+ 字符）
- 检查浏览器是否阻止了第三方 Cookie

---

## 📱 分享应用给同事

部署成功后，您可以：

1. **分享网址**：`https://study-app.vercel.app`
2. **告诉他们注册新账号**（需要在数据库中添加，或使用现有账号）
3. **大家一起学习，数据各自独立**

---

## 💰 成本说明

- **Railway**：免费额度足够个人或小团队使用
- **Vercel**：免费额度支持无限项目
- **总计**：**完全免费** 🎉

---

## 🔄 后续更新

当您修改代码后：
```bash
git add .
git commit -m "您的修改说明"
git push
```

Vercel 和 Railway 会**自动检测并重新部署**！

---

## 📞 需要帮助？

如果在部署过程中遇到任何问题，请：
1. 查看各个平台的部署日志
2. 检查环境变量配置
3. 确认代码是否正确推送到 GitHub

祝您部署成功！🚀
