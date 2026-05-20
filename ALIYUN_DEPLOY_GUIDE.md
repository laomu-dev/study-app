
# 阿里云域名部署指南 - csyhm.fun

## 📋 部署方案概述

我们将使用以下方案部署您的应用：
- **前端**：Vercel（免费）- 负责提供网站访问
- **后端**：Railway（免费额度）- 负责 API 和数据库
- **域名**：阿里云 csyhm.fun - 自定义域名访问

---

## 🎯 第一步：阿里云域名解析配置

### 1.1 登录阿里云控制台
1. 访问 https://dsw-console.aliyun.com/
2. 使用您的阿里云账号登录
3. 进入「云解析 DNS」控制台

### 1.2 配置域名解析

找到您的域名 `csyhm.fun`，添加以下解析记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|-------|-----|
| CNAME | www | cname.vercel-dns.com | 600 |
| CNAME | @ | cname.vercel-dns.com | 600 |

**说明**：
- `www` 记录：用于 www.csyhm.fun
- `@` 记录：用于 csyhm.fun（根域名）

---

## 🎯 第二步：准备代码仓库

### 2.1 初始化 Git 仓库

在终端执行：

```bash
cd /workspace
git init
git add .
git commit -m "Initial commit: 传输通信知识学习助手"
```

### 2.2 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 填写仓库名称：`study-app`
3. 选择 **Public** 或 **Private**（都可以）
4. 点击 **Create repository**

### 2.3 推送代码到 GitHub

```bash
# 替换为您的 GitHub 用户名
git remote add origin https://github.com/您的用户名/study-app.git
git branch -M main
git push -u origin main
```

---

## 🎯 第三步：部署后端到 Railway

### 3.1 创建 Railway 项目

1. 访问 https://railway.app
2. 使用 GitHub 账号登录
3. 点击 **New Project**
4. 选择 **Deploy from GitHub repo**
5. 授权并选择 `study-app` 仓库

### 3.2 配置环境变量

在 Railway 项目设置中，添加以下环境变量：

```
NODE_ENV=production
SESSION_SECRET=您的随机密钥（见下方生成方法）
```

**生成安全的 SESSION_SECRET**：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制输出的字符串作为 SESSION_SECRET 的值。

### 3.3 配置启动命令

在 Railway 项目设置中：
- **Build Command**：`npm install`
- **Start Command**：`npx tsx api/server.ts`

### 3.4 获取后端 URL

部署完成后，Railway 会提供一个 URL，例如：
```
https://study-app-production.up.railway.app
```

**记录下这个 URL**，后面配置前端需要用到！

---

## 🎯 第四步：部署前端到 Vercel

### 4.1 创建 Vercel 项目

1. 访问 https://vercel.com
2. 使用 GitHub 账号登录
3. 点击 **Add New...** → **Project**
4. 导入 `study-app` 仓库

### 4.2 配置环境变量

在 Vercel 项目设置 → Environment Variables 中添加：

```
VITE_API_URL=https://您的Railway后端URL
```

例如：
```
VITE_API_URL=https://study-app-production.up.railway.app
```

### 4.3 修改 API 配置文件

✅ 已完成！API 配置已更新为支持环境变量。

### 4.4 部署到 Vercel

1. 在 Vercel 项目页面，点击 **Deploy**
2. 等待部署完成（约2-3分钟）
3. 部署完成后，您会获得一个 Vercel 提供的 URL，例如：
   ```
   https://study-app-abc123.vercel.app
   ```

---

## 🎯 第五步：配置自定义域名 csyhm.fun

### 5.1 在 Vercel 中添加域名

1. 进入 Vercel 项目设置
2. 点击 **Domains** 选项卡
3. 输入您的域名：`csyhm.fun`
4. 点击 **Add**

### 5.2 验证域名所有权

Vercel 会提供几种验证方式，选择最方便的一种：

**方式一：通过阿里云 DNS 验证（推荐）**
- Vercel 会给出一个 TXT 记录
- 在阿里云云解析中添加该 TXT 记录

**方式二：通过文件验证**
- Vercel 会给出一个验证文件
- 将文件放置在您的项目中

### 5.3 配置域名

域名验证通过后，Vercel 会自动配置：
- `csyhm.fun`
- `www.csyhm.fun`

### 5.4 配置 HTTPS

Vercel 会自动为您的域名申请免费的 SSL 证书！

---

## 🎯 第六步：测试部署

### 6.1 访问应用

打开浏览器访问：
- `https://csyhm.fun`
- `https://www.csyhm.fun`

### 6.2 测试登录

使用以下账号登录：
- **管理员**：`admin` / `admin123`
- **普通用户**：`testuser` / `admin123`

### 6.3 测试功能

1. ✅ 登录系统
2. ✅ 查看首页统计
3. ✅ 开始学习
4. ✅ 管理题库（管理员）
5. ✅ 导入题目

---

## 📋 完整部署检查清单

- [ ] 阿里云域名解析已配置（CNAME 到 Vercel）
- [ ] GitHub 代码仓库已创建并推送
- [ ] Railway 后端已部署并运行
- [ ] Railway 环境变量已配置（SESSION_SECRET）
- [ ] Vercel 前端已部署
- [ ] Vercel 环境变量已配置（VITE_API_URL）
- [ ] Vercel 自定义域名已添加
- [ ] HTTPS 证书已生效
- [ ] 应用可以正常访问
- [ ] 登录功能正常
- [ ] API 调用正常

---

## 🔧 常见问题解决

### 问题 1：域名无法访问

**解决**：
1. 检查阿里云 DNS 解析是否生效
2. 在终端执行：`nslookup csyhm.fun`
3. 确认解析到 Vercel 的服务器

### 问题 2：前端无法连接后端

**解决**：
1. 确认 Vercel 的 VITE_API_URL 环境变量正确
2. 检查 Railway 后端服务是否正常运行
3. 查看浏览器控制台的网络请求

### 问题 3：Session 失效

**解决**：
1. 确认 Railway 的 SESSION_SECRET 已配置
2. 检查浏览器是否允许 Cookie
3. 确认 HTTPS 已启用

### 问题 4：部署后代码更新

**解决**：
```bash
git add .
git commit -m "更新说明"
git push
```
Vercel 和 Railway 会自动重新部署！

---

## 💰 成本说明

- **Vercel**：完全免费
- **Railway**：免费额度 500 小时/月（足够个人使用）
- **阿里云域名**：您已付费，首年通常很便宜
- **总计**：几乎零成本！🎉

---

## 📞 需要帮助？

如果遇到问题，请检查：
1. Railway 部署日志
2. Vercel 部署日志
3. 浏览器控制台错误信息
4. 网络请求是否正常

祝您部署成功！🚀

