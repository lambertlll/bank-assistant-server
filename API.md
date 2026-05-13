# API 文档

## 基础信息

- **Base URL**: `http://your-server-ip:3000` 或 `https://api.your-domain.com`
- **Content-Type**: `application/json`
- **字符编码**: `UTF-8`

---

## 接口列表

### 1. 健康检查

**请求**
```
GET /api/health
```

**响应**
```json
{
  "status": "ok",
  "timestamp": "2026-05-13T07:00:00.000Z",
  "dailyLimit": 100,
  "used": 5,
  "remaining": 95,
  "activeTasks": 2
}
```

---

### 2. 使用统计

**请求**
```
GET /api/usage
```

**响应**
```json
{
  "remaining": 95,
  "total": 100,
  "used": 5,
  "breakdown": {
    "client-research": 2,
    "financial-report": 2,
    "credit-committee": 1
  },
  "resetTime": "2026-05-14T00:00:00.000Z"
}
```

---

### 3. 客户尽调

**请求**
```
POST /api/client-research
Content-Type: application/json

{
  "clientName": "腾讯",
  "clientType": "enterprise"
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientName | string | 是 | 客户名称 |
| clientType | string | 否 | 客户类型：`enterprise`（企业）或 `individual`（个人），默认 `enterprise` |

**响应**
```json
{
  "success": true,
  "taskId": "abc-123-def-456",
  "status": "processing",
  "message": "任务已创建，正在处理中...",
  "pollUrl": "/api/task/abc-123-def-456"
}
```

---

### 4. 财报分析

**请求**
```
POST /api/financial-report
Content-Type: application/json

{
  "companyName": "腾讯",
  "reportType": "detailed"
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| companyName | string | 是 | 公司名称 |
| reportType | string | 否 | 报告类型：`detailed`（详细版）或 `simple`（简化版），默认 `detailed` |

**响应**
```json
{
  "success": true,
  "taskId": "xyz-789-uvw-012",
  "status": "processing",
  "message": "任务已创建，正在处理中...",
  "pollUrl": "/api/task/xyz-789-uvw-012"
}
```

---

### 5. 审贷会助手

**请求**
```
POST /api/credit-committee
Content-Type: application/json

{
  "companyName": "腾讯",
  "outputFormat": "word"
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| companyName | string | 是 | 公司名称 |
| outputFormat | string | 否 | 输出格式：`word` 或 `text`，默认 `text` |

**响应**
```json
{
  "success": true,
  "taskId": "pqr-345-stu-678",
  "status": "processing",
  "message": "任务已创建，正在处理中...",
  "pollUrl": "/api/task/pqr-345-stu-678"
}
```

---

### 6. 查询任务状态

**请求**
```
GET /api/task/:taskId
```

**响应（处理中）**
```json
{
  "success": true,
  "taskId": "abc-123-def-456",
  "status": "processing",
  "createdAt": "2026-05-13T07:00:00.000Z",
  "updatedAt": "2026-05-13T07:00:05.000Z",
  "message": "正在处理中..."
}
```

**响应（已完成）**
```json
{
  "success": true,
  "taskId": "abc-123-def-456",
  "status": "completed",
  "createdAt": "2026-05-13T07:00:00.000Z",
  "updatedAt": "2026-05-13T07:02:30.000Z",
  "data": "报告内容...",
  "usage": {
    "remaining": 95,
    "total": 100
  }
}
```

**响应（失败）**
```json
{
  "success": true,
  "taskId": "abc-123-def-456",
  "status": "failed",
  "createdAt": "2026-05-13T07:00:00.000Z",
  "updatedAt": "2026-05-13T07:01:00.000Z",
  "error": "OpenClaw 执行失败: timeout"
}
```

---

## 错误码

| HTTP 状态码 | 说明 |
|------------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 任务不存在 |
| 429 | 超过每日限额 |
| 500 | 服务器内部错误 |

---

## 错误响应格式

```json
{
  "success": false,
  "error": "错误信息",
  "details": "详细错误信息（仅开发环境）"
}
```

---

## 使用示例

### cURL

```bash
# 创建客户尽调任务
curl -X POST http://your-server-ip:3000/api/client-research \
  -H "Content-Type: application/json" \
  -d '{"clientName":"腾讯","clientType":"enterprise"}'

# 查询任务状态
curl http://your-server-ip:3000/api/task/abc-123-def-456
```

### JavaScript (Fetch)

```javascript
// 创建任务
const response = await fetch('http://your-server-ip:3000/api/client-research', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    clientName: '腾讯',
    clientType: 'enterprise'
  })
});

const result = await response.json();
console.log(result.taskId);

// 轮询任务状态
const pollTask = async (taskId) => {
  const response = await fetch(`http://your-server-ip:3000/api/task/${taskId}`);
  const task = await response.json();
  
  if (task.status === 'completed') {
    console.log('报告:', task.data);
  } else if (task.status === 'failed') {
    console.error('失败:', task.error);
  } else {
    // 5 秒后重试
    setTimeout(() => pollTask(taskId), 5000);
  }
};

pollTask(result.taskId);
```

### 微信小程序

```javascript
// 创建任务
wx.request({
  url: 'http://your-server-ip:3000/api/client-research',
  method: 'POST',
  data: {
    clientName: '腾讯',
    clientType: 'enterprise'
  },
  success: (res) => {
    const taskId = res.data.taskId;
    
    // 轮询任务状态
    const pollTask = () => {
      wx.request({
        url: `http://your-server-ip:3000/api/task/${taskId}`,
        success: (res) => {
          if (res.data.status === 'completed') {
            console.log('报告:', res.data.data);
          } else if (res.data.status === 'failed') {
            console.error('失败:', res.data.error);
          } else {
            setTimeout(pollTask, 5000);
          }
        }
      });
    };
    
    pollTask();
  }
});
```

---

## 限流规则

- **每日限额**：100 次（可配置）
- **单个任务超时**：10 分钟
- **并发限制**：无限制（取决于服务器性能）

---

## 最佳实践

### 1. 轮询间隔
建议每 5 秒轮询一次任务状态，避免过于频繁。

### 2. 超时处理
如果任务超过 10 分钟仍未完成，视为失败。

### 3. 错误重试
遇到 500 错误时，可以重试 3 次，每次间隔 5 秒。

### 4. 缓存结果
已完成的任务结果可以缓存，避免重复请求。

---

## 安全建议

### 1. 使用 HTTPS
生产环境务必使用 HTTPS，保护数据传输安全。

### 2. 添加认证
建议添加 API Key 认证：

```javascript
// 服务器端
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// 客户端
fetch('https://api.your-domain.com/api/client-research', {
  headers: {
    'X-API-Key': 'your-api-key'
  }
});
```

### 3. 限流
使用 `express-rate-limit` 限制请求频率：

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100 // 最多 100 次请求
});

app.use('/api/', limiter);
```

---

## 更新日志

### v1.0.0 (2026-05-13)
- 初始版本
- 支持客户尽调、财报分析、审贷会助手
- 异步处理 + 轮询模式
- 每日限额控制
