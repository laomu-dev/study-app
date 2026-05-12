
# 学习助手应用部署指南

## 当前状态
您的学习助手应用已经开发完成，具备以下特性：
- ✅ 前后端分离架构
- ✅ 响应式设计（支持手机和电脑）
- ✅ 用户认证系统
- ✅ 记忆曲线复习算法
- ✅ 题库管理功能

## 如何实现手机和电脑数据互通？

要实现真正的手机和电脑数据互通，您需要将应用部署到云服务器上。以下是几种部署方案：

### 方案一：使用免费云平台部署（推荐新手）

#### 1. 部署前端 - Vercel（免费）
```bash
# 构建前端
npm run build

# 使用 Vercel CLI 部署
npm i -g vercel
vercel --prod
```

#### 2. 部署后端 - Railway 或 Render（免费额度）

**Railway 部署步骤：**
1. 访问 https://railway.app
2. 使用 GitHub 登录
3. 创建新项目，选择 "Deploy from GitHub repo"
4. 连接您的代码仓库
5. Railway 会自动检测并部署

**Render 部署步骤：**
1. 访问 https://render.com
2. 使用 GitHub 登录
3. 创建 "Web Service"
4. 连接 GitHub 仓库
5. 设置构建命令：`npm run build`
6. 设置启动命令：`npm start`

### 方案二：使用 Docker 部署（适合有服务器的用户）

#### 创建 Dockerfile
```dockerfile
# 前端
FROM node:18-alpine as frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 后端
FROM node:18-alpine as backend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY api ./api
COPY shared ./shared
EXPOSE 3001
CMD ["npm", "run", "server:dev"]
```

#### 使用 Docker Compose
```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - backend

  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=root
      - DB_PASSWORD=your_password
      - DB_NAME=study_app

  mysql:
    image: mysql:8
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=your_password
      - MYSQL_DATABASE=study_app
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

部署命令：
```bash
docker-compose up -d
```

### 方案三：传统 VPS 部署（阿里云/腾讯云）

#### 1. 安装 Node.js 和 MySQL
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y mysql-server

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### 2. 配置 MySQL 数据库
```bash
sudo mysql
```
在 MySQL 中执行：
```sql
CREATE DATABASE study_app;
CREATE USER 'studyapp'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON study_app.* TO 'studyapp'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 3. 部署应用
```bash
# 克隆代码
git clone your_repo_url
cd your_repo

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接

# 初始化数据库
npm run init-db

# 构建前端
npm run build

# 启动服务
npm start
```

#### 4. 使用 Nginx 反向代理
```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 环境变量配置

创建 `.env` 文件：
```env
# 服务器端口
PORT=3001
NODE_ENV=production

# 会话密钥（请使用随机字符串）
SESSION_SECRET=your-super-secret-session-key-generate-with-openssl-rand-base64-32

# 数据库配置（使用 MySQL 时）
DB_HOST=localhost
DB_PORT=3306
DB_USER=studyapp
DB_PASSWORD=your_strong_password
DB_NAME=study_app
```

## HTTPS 配置（重要！）

对于生产环境，强烈建议使用 HTTPS：
1. 申请 SSL 证书（Let's Encrypt 免费）
2. 使用 Certbot 自动配置
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

## 测试部署

部署完成后，测试以下功能：
1. ✅ 在电脑上访问应用
2. ✅ 在手机上访问应用（使用同一 URL）
3. ✅ 登录账号
4. ✅ 在一个设备上学习
5. ✅ 在另一个设备上查看进度是否同步

## 数据备份

定期备份数据库：
```bash
# MySQL 备份
mysqldump -u studyapp -p study_app > backup_$(date +%Y%m%d).sql

# 恢复数据
mysql -u studyapp -p study_app < backup_20240101.sql
```

## 监控和维护

建议设置：
1. 日志管理（使用 PM2）
2. 进程监控（使用 Monit 或 PM2）
3. 自动重启（PM2 ecosystem）
4. 性能监控（New Relic 或 Grafana）

## 获取帮助

如果遇到问题，请检查：
1. 服务器防火墙是否开放 80/443 端口
2. 数据库连接是否正常
3. 环境变量是否正确配置
4. 日志文件中的错误信息
