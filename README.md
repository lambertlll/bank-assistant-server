# 银行助手小程序后端服务

## 项目简介

为银行从业人员提供智能助手服务，支持客户尽调、财报分析、审贷会准备等功能。

## 技术栈

- **后端**：Node.js + Express
- **AI**：OpenClaw + Claude
- **部署**：Docker + 境内云服务器
- **前端**：微信小程序

## 架构

```
微信小程序 → 境内云服务器（Docker） → OpenClaw → Claude API
```

## 优势

✅ **稳定** - 境内云服务器，无网络连接问题  
✅ **简单** - 单服务器部署，易于维护  
✅ **成本低** - 无需云托管，只需一台服务器  
✅ **性能好** - 本地调用 OpenClaw，延迟低  

## 功能

### 1. 客户尽调
- 企业客户背景调查
- 个人客户（高管/企业家）背景调查
- 自动生成结构化尽调报告

### 2. 财报分析
- 上市公司财报深度分析
- 从信贷/授信视角评估财务健康度
- 自动生成 Word 格式报告

### 3. 审贷会助手
- 预测审贷会可能的提问
- 提供建议回答
- 分析财务数据和战略调整

## 快速开始

### 1. 环境要求

- Node.js 18+
- Docker & Docker Compose
- OpenClaw 已安装并配置

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 到 `.env`，配置：

```
PORT=3000
DAILY_LIMIT=100
NODE_ENV=production
```

### 4. 启动服务

#### 开发模式
```bash
npm run dev
```

#### 生产模式（Docker）
```bash
docker-compose up -d
```

## API 文档

### 1. 客户尽调

```
POST /api/client-research
Content-Type: application/json

{
  "clientName": "腾讯",
  "clientType": "enterprise"  // 或 "individual"
}

返回：
{
  "success": true,
  "taskId": "abc-123",
  "status": "processing",
  "pollUrl": "/api/task/abc-123"
}
```

### 2. 财报分析

```
POST /api/financial-report
Content-Type: application/json

{
  "companyName": "腾讯",
  "reportType": "detailed"  // 或 "simple"
}
```

### 3. 审贷会助手

```
POST /api/credit-committee
Content-Type: application/json

{
  "companyName": "腾讯",
  "outputFormat": "word"  // 或 "text"
}
```

### 4. 查询任务状态

```
GET /api/task/:taskId

返回：
{
  "success": true,
  "taskId": "abc-123",
  "status": "completed",  // 或 "processing", "failed"
  "data": "报告内容..."
}
```

## 部署

### 方式 1：Docker Compose（推荐）

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 方式 2：直接运行

```bash
# 安装依赖
npm install

# 启动
npm start
```

## 目录结构

```
.
├── src/
│   ├── server.js           # 主服务器
│   ├── routes/             # API 路由
│   ├── services/           # 业务逻辑
│   └── utils/              # 工具函数
├── skills/                 # OpenClaw Skills
│   ├── client-research/    # 客户尽调
│   ├── financial-report/   # 财报分析
│   └── credit-committee/   # 审贷会助手
├── docker-compose.yml      # Docker 编排
├── Dockerfile              # Docker 镜像
├── package.json            # 依赖管理
└── README.md               # 本文件
```

## 监控

### 健康检查

```bash
curl http://localhost:3000/api/health
```

### 使用统计

```bash
curl http://localhost:3000/api/usage
```

## 故障排查

### 问题 1：OpenClaw 命令未找到

**解决方案**：
```bash
# 检查 OpenClaw 是否安装
which openclaw

# 如果未安装
npm install -g openclaw
```

### 问题 2：端口被占用

**解决方案**：
```bash
# 修改 .env 中的 PORT
PORT=3001
```

### 问题 3：任务处理超时

**解决方案**：
- 检查 OpenClaw 配置
- 检查网络连接
- 查看日志：`docker-compose logs -f`

## 安全

- ✅ 每日请求限额（默认 100 次）
- ✅ 异步处理，避免超时
- ✅ 错误处理和日志记录
- ⚠️ 建议添加 API Key 认证
- ⚠️ 建议配置 HTTPS

## 成本估算

| 项目 | 成本 |
|------|------|
| 境内云服务器（2核4G） | ~¥100/月 |
| 域名（可选） | ~¥50/年 |
| **总计** | **~¥100/月** |

## 许可证

MIT

## 联系方式

- GitHub: lambertlll/bank-assistant-server
- 飞书: ou_217502778b65ad6364f06f164cc940ac
