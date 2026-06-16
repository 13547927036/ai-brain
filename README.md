# 项目复盘工具 - 后端

## 📦 技术栈

- **Node.js** + **Express** - 后端框架
- **Supabase** - 云端 PostgreSQL 数据库
- **CORS** - 跨域支持

---

## 🚀 快速开始

### 1. 创建 Supabase 项目

1. 访问 https://supabase.com
2. 注册/登录账号
3. 点击 "New Project"
4. 填写项目名、数据库密码（记住密码！）
5. 选择就近区域（推荐 Asia - Singapore）
6. 等待创建完成（约 2 分钟）

### 2. 获取 API 密钥

在 Supabase 控制台：
1. 进入 **Settings** → **API**
2. 复制：
   - **Project URL** → `https://xxxxx.supabase.co`
   - **anon public** → `eyJhbGc...`（以 ey 开头的长字符串）

### 3. 配置环境变量

编辑 `.env` 文件：

```env
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_KEY=你的匿名密钥
PORT=3001
```

### 4. 创建数据库表

在 Supabase **SQL Editor** 中执行 `supabase-schema.sql` 文件内容：

1. 进入 **SQL Editor**
2. 点击 "New Query"
3. 粘贴 `supabase-schema.sql` 内容
4. 点击 "Run"

### 5. 安装依赖

```bash
npm install
```

### 6. 启动服务器

```bash
npm start
```

访问 http://localhost:3001 预览

---

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `server.js` | 后端主程序 |
| `.env` | 环境变量配置（不要上传到 Git！） |
| `supabase-schema.sql` | 数据库表结构 |
| `index.html` | 前端页面 |
| `package.json` | 依赖配置 |

---

## 🔐 安全提示

- `.env` 文件包含敏感信息，**不要上传到 GitHub**
- `.gitignore` 已配置自动忽略 `.env`
- Supabase 匿名密钥可以暴露在前端（有行级安全保护）

---

## 📊 API 接口

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/api/games` | 获取所有项目 |
| POST | `/api/games` | 创建项目 |
| DELETE | `/api/games/:id` | 删除项目 |
| GET | `/api/games/:id/tags` | 获取标签和选项 |
| POST | `/api/games/:id/options` | 添加选项 |
| DELETE | `/api/options/:id` | 删除选项 |
| GET | `/api/games/:id/records` | 获取记录 |
| POST | `/api/games/:id/records` | 添加记录 |
| DELETE | `/api/records/:id` | 删除记录 |
| DELETE | `/api/games/:id/records` | 清空记录 |
| GET | `/api/games/:id/stats` | 获取统计 |

---

## 🆘 常见问题

### Q: 连接 Supabase 失败
A: 检查 `.env` 配置是否正确，确保 URL 和 Key 复制完整

### Q: 表不存在
A: 确保在 Supabase SQL Editor 中执行了建表语句

### Q: 端口被占用
A: 修改 `.env` 中的 `PORT` 为其他端口（如 3002）

---

## 📝 后续优化

- [ ] 添加用户登录系统
- [ ] 启用行级安全（RLS）
- [ ] 添加数据备份功能
- [ ] 部署到云服务器
