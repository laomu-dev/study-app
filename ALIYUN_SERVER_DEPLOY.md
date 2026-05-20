
# 阿里云轻量应用服务器部署指南

## 📋 前提条件

- ✅ 已购买阿里云轻量应用服务器
- ✅ 实例 ID：`3e1642b206184c9a8f1bfb55b3870646`
- ✅ 代码已推送到 GitHub：https://github.com/laomu-dev/study-app

---

## 🎯 第一步：确认服务器配置

### 1.1 登录阿里云控制台
访问：https://swasnext.console.aliyun.com/servers/

### 1.2 查看您的服务器
找到实例 ID 为 `3e1642b206184c9a8f1bfb55b3870646` 的服务器

### 1.3 确认镜像信息
请确认您的服务器使用的是哪个镜像：
- BT-Panel（推荐）
- 1Panel
- 系统镜像（Alibaba Cloud Linux / Ubuntu）

---

## 🚀 方案一：使用宝塔面板部署（推荐）

### 前提：您的服务器已安装宝塔面板

如果还没安装，请先重置系统选择 BT-Panel 镜像。

### 步骤 1：获取宝塔面板登录信息

1. 进入服务器详情页
2. 点击「应用详情」标签
3. 获取宝塔面板地址、用户名和密码
4. 点击「一键放通」放行所需端口

### 步骤 2：登录宝塔面板

在浏览器访问宝塔面板地址，使用获取的账号密码登录。

### 步骤 3：安装运行环境

在宝塔面板中安装：
- **Node.js**：选择 18.x 或 20.x 版本
- **MySQL**：选择 8.0 版本
- **PM2 管理器**：在软件商店安装
- **Nginx**：（通常已预装）

### 步骤 4：创建网站

1. 点击「网站」→「添加站点」
2. 域名：填写您的域名 `csyhm.fun` 和 `www.csyhm.fun`
3. 数据库：选择 MySQL，创建数据库
4. 记录数据库名、用户名、密码

### 步骤 5：上传代码

**方式一：使用 Git（推荐）**

1. 在宝塔面板安装「Git」插件
2. 进入网站根目录（通常是 `/www/wwwroot/csyhm.fun`）
3. 打开终端，执行：
```bash
cd /www/wwwroot/csyhm.fun
git clone https://github.com/laomu-dev/study-app.git .
```

**方式二：宝塔文件管理器**

1. 点击「文件」进入网站目录
2. 上传本地压缩包或手动上传文件

### 步骤 6：安装依赖

在宝塔终端中执行：

```bash
cd /www/wwwroot/csyhm.fun
npm install
```

### 步骤 7：配置环境变量

在项目根目录创建 `.env` 文件：

```env
# 服务器配置
PORT=3001
NODE_ENV=production

# 会话密钥（使用随机字符串）
SESSION_SECRET=your-super-secret-key-here-change-this

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

### 步骤 8：构建前端

```bash
npm run build
```

### 步骤 9：使用 PM2 启动后端

在宝塔 PM2 管理器中：
1. 点击「添加项目」
2. 项目名称：`study-app`
3. 启动文件：`/www/wwwroot/csyhm.fun/api/server.ts`
4. 项目目录：`/www/wwwroot/csyhm.fun`
5. 使用 `npm run server:dev` 或 `npx tsx api/server.ts`

或在终端执行：
```bash
cd /www/wwwroot/csyhm.fun
npm install -g pm2
pm2 start npx --name "study-app" -- tsx api/server.ts
pm2 save
pm2 startup
```

### 步骤 10：配置 Nginx 反向代理

在宝塔网站设置中：
1. 点击「配置文件」
2. 添加或修改配置：

```nginx
server {
    listen 80;
    server_name csyhm.fun www.csyhm.fun;
    
    # 前端静态文件
    location / {
        root /www/wwwroot/csyhm.fun/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 步骤 11：配置 HTTPS

在宝塔面板中：
1. 点击网站设置 →「SSL」
2. 选择「Let's Encrypt」免费证书
3. 勾选域名，点击申请
4. 开启「强制 HTTPS」

---

## 🐳 方案二：使用 Docker 部署

### 前提：服务器已安装 Docker

如果使用 Docker 应用镜像，Docker 已预装。

### 步骤 1：创建 docker-compose.yml

在项目根目录创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: study-app-mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: study_app
      MYSQL_USER: studyapp
      MYSQL_PASSWORD: studyapppassword
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - study-app-network

  app:
    build: .
    container_name: study-app
    ports:
      - "3001:3001"
    depends_on:
      - mysql
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: studyapp
      DB_PASSWORD: studyapppassword
      DB_NAME: study_app
      SESSION_SECRET: your-super-secret-key-here
    volumes:
      - ./uploads:/app/uploads
    networks:
      - study-app-network

  nginx:
    image: nginx:alpine
    container_name: study-app-nginx
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./dist:/usr/share/nginx/html:ro
      - ./ssl:/etc/nginx/ssl:ro
    networks:
      - study-app-network

volumes:
  mysql-data:

networks:
  study-app-network:
    driver: bridge
```

### 步骤 2：创建 Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api
COPY --from=builder /app/shared ./shared

EXPOSE 3001
CMD ["npx", "tsx", "api/server.ts"]
```

### 步骤 3：创建 nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name csyhm.fun www.csyhm.fun;

        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        location /api {
            proxy_pass http://app:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

### 步骤 4：构建并启动

```bash
# 构建前端
npm run build

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

---

## 📋 部署检查清单

- [ ] 服务器已购买并运行
- [ ] 安全组/防火墙已放行端口（80、443、3001）
- [ ] 域名已解析到服务器 IP
- [ ] 代码已上传到服务器
- [ ] Node.js 环境已安装
- [ ] 数据库已创建并配置
- [ ] 依赖已安装
- [ ] 前端已构建
- [ ] 后端已启动（PM2 或 Docker）
- [ ] Nginx 配置已完成
- [ ] HTTPS 证书已配置
- [ ] 应用可以正常访问
- [ ] 登录功能正常
- [ ] 数据库连接正常

---

## 🔧 常见问题

### 问题 1：无法访问宝塔面板
**解决**：
- 检查安全组是否放行宝塔面板端口（通常是 8888）
- 在阿里云控制台「防火墙」中添加规则

### 问题 2：PM2 进程自动退出
**解决**：
- 查看日志：`pm2 logs study-app`
- 检查环境变量配置
- 确认数据库连接正常

### 问题 3：Nginx 502 错误
**解决**：
- 确认后端服务正常运行
- 检查 Nginx 配置中的代理地址
- 查看 Nginx 错误日志

### 问题 4：数据库连接失败
**解决**：
- 确认 MySQL 服务运行
- 检查数据库账号密码
- 确认数据库已创建

---

## 📞 获取帮助

如果遇到问题：
1. 查看宝塔面板日志
2. 查看 PM2 日志：`pm2 logs`
3. 查看 Nginx 日志：`/www/wwwlogs/`
4. 查看应用日志

---

## 🎉 部署完成

部署成功后，访问：
- 主站：https://csyhm.fun
- www：https://www.csyhm.fun

默认测试账号：
- 管理员：admin / admin123
- 用户：testuser / admin123

祝您使用愉快！
