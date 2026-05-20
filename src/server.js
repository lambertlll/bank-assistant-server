const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { generateAndSaveDocx } = require('./utils/docx-generator');

const app = express();
const PORT = process.env.PORT || 3000;
const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT) || 100;

// 邀请码配置
const VALID_INVITE_CODES = ['CMB'];

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 静态文件服务（报告下载）
const reportsDir = path.join(__dirname, '../reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}
app.use('/reports', express.static(reportsDir));

// 任务存储
const tasks = new Map();
const TaskStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// 使用统计
const usageStats = {
  totalRequests: 0,
  requestsByType: {
    'client-research': 0,
    'financial-report': 0,
    'credit-committee': 0
  },
  dailyLimit: DAILY_LIMIT,
  lastResetDate: new Date().toDateString()
};

// 检查使用限制
function checkUsageLimit() {
  const today = new Date().toDateString();
  
  if (usageStats.lastResetDate !== today) {
    usageStats.totalRequests = 0;
    Object.keys(usageStats.requestsByType).forEach(key => {
      usageStats.requestsByType[key] = 0;
    });
    usageStats.lastResetDate = today;
  }
  
  if (usageStats.totalRequests >= usageStats.dailyLimit) {
    return {
      allowed: false,
      message: `今日免费额度已用完（${usageStats.dailyLimit}次），请明天再试`
    };
  }
  
  return { allowed: true };
}

// 执行 OpenClaw 命令
function executeOpenClaw(message) {
  return new Promise((resolve, reject) => {
    // 转义单引号
    const escapedMessage = message.replace(/'/g, "'\\''");
    const command = `openclaw agent --local --agent main --message '${escapedMessage}'`;
    
    console.log(`[${new Date().toISOString()}] 执行命令: ${command.substring(0, 100)}...`);
    
    exec(command, {
      timeout: 600000, // 10 分钟超时
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] 执行失败:`, error.message);
        return reject(new Error(`OpenClaw 执行失败: ${error.message}`));
      }
      
      if (stderr) {
        console.warn(`[${new Date().toISOString()}] 警告:`, stderr);
      }
      
      console.log(`[${new Date().toISOString()}] 执行成功，输出长度: ${stdout.length}`);
      resolve(stdout);
    });
  });
}

// 构建提示词
function buildPrompt(taskType, params) {
  let prompt = '';
  
  switch (taskType) {
    case 'client-research':
      const typeText = params.clientType === 'individual' ? '个人客户（高管/企业家）' : '企业客户';
      prompt = `请帮我做 ${params.clientName} 的客户尽调报告，客户类型：${typeText}。【重要】请直接输出报告正文内容，使用Markdown格式。不要包含任何开场白、寒暄、解释说明或结束语。直接从报告标题开始输出。`;
      break;
    case 'financial-report':
      const reportTypeText = params.reportType === 'detailed' ? '详细版' : '简化版';
      prompt = `请帮我做 ${params.companyName} 的财报分析，${reportTypeText}。【重要】请直接输出报告正文内容，使用Markdown格式。不要包含任何开场白、寒暄、解释说明或结束语。直接从报告标题开始输出。`;
      break;
    case 'credit-committee':
      const formatText = params.outputFormat === 'word' ? '，输出Word格式' : '';
      prompt = `请帮我准备 ${params.companyName} 的审贷会材料${formatText}。【重要】请直接输出报告正文内容，使用Markdown格式。不要包含任何开场白、寒暄、解释说明或结束语。直接从报告标题开始输出。`;
      break;
  }
  
  return prompt;
}

// 异步处理任务
async function processTask(taskId, taskType, params) {
  const task = tasks.get(taskId);
  if (!task) return;
  
  try {
    task.status = TaskStatus.PROCESSING;
    task.updatedAt = new Date().toISOString();
    tasks.set(taskId, task);
    
    console.log(`[任务 ${taskId}] 开始处理: ${taskType}`);
    
    // 构建提示词
    const prompt = buildPrompt(taskType, params);
    console.log(`[任务 ${taskId}] 提示词: ${prompt}`);
    
    // 执行 OpenClaw
    const result = await executeOpenClaw(prompt);
    
    // 生成 Word 文档
    console.log(`[任务 ${taskId}] 正在生成 Word 文档...`);
    let docxInfo = null;
    try {
      docxInfo = await generateAndSaveDocx(result, taskType, params, taskId);
      console.log(`[任务 ${taskId}] Word 文档已生成: ${docxInfo.filename}`);
    } catch (docxError) {
      console.error(`[任务 ${taskId}] Word 生成失败:`, docxError.message);
      // Word 生成失败不影响任务完成，仍返回文本结果
    }

    // 更新任务状态
    task.status = TaskStatus.COMPLETED;
    task.result = result;
    task.docx = docxInfo; // { filePath, filename }
    task.updatedAt = new Date().toISOString();
    tasks.set(taskId, task);
    
    // 更新统计
    usageStats.totalRequests++;
    usageStats.requestsByType[taskType]++;
    
    console.log(`[任务 ${taskId}] 处理完成`);
  } catch (error) {
    console.error(`[任务 ${taskId}] 处理失败:`, error);
    
    task.status = TaskStatus.FAILED;
    task.error = error.message;
    task.updatedAt = new Date().toISOString();
    tasks.set(taskId, task);
  }
}

// API 路由

// 1. 客户尽调
app.post('/api/client-research', async (req, res) => {
  try {
    const limitCheck = checkUsageLimit();
    if (!limitCheck.allowed) {
      return res.status(429).json({ 
        success: false,
        error: limitCheck.message 
      });
    }
    
    const { clientName, clientType } = req.body;
    
    if (!clientName) {
      return res.status(400).json({ 
        success: false,
        error: '请提供客户名称' 
      });
    }
    
    const taskId = uuidv4();
    const task = {
      id: taskId,
      type: 'client-research',
      params: { clientName, clientType },
      status: TaskStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: null,
      error: null
    };
    
    tasks.set(taskId, task);
    
    // 异步处理
    processTask(taskId, 'client-research', { clientName, clientType });
    
    res.json({
      success: true,
      taskId: task.id,
      status: task.status,
      message: '任务已创建，正在处理中...',
      pollUrl: `/api/task/${task.id}`
    });
  } catch (error) {
    console.error('[客户尽调] 错误:', error);
    res.status(500).json({ 
      success: false,
      error: '创建任务失败', 
      details: error.message 
    });
  }
});

// 2. 财报分析
app.post('/api/financial-report', async (req, res) => {
  try {
    const limitCheck = checkUsageLimit();
    if (!limitCheck.allowed) {
      return res.status(429).json({ 
        success: false,
        error: limitCheck.message 
      });
    }
    
    const { companyName, reportType } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ 
        success: false,
        error: '请提供公司名称' 
      });
    }
    
    const taskId = uuidv4();
    const task = {
      id: taskId,
      type: 'financial-report',
      params: { companyName, reportType },
      status: TaskStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: null,
      error: null
    };
    
    tasks.set(taskId, task);
    
    // 异步处理
    processTask(taskId, 'financial-report', { companyName, reportType });
    
    res.json({
      success: true,
      taskId: task.id,
      status: task.status,
      message: '任务已创建，正在处理中...',
      pollUrl: `/api/task/${task.id}`
    });
  } catch (error) {
    console.error('[财报分析] 错误:', error);
    res.status(500).json({ 
      success: false,
      error: '创建任务失败', 
      details: error.message 
    });
  }
});

// 3. 审贷会助手
app.post('/api/credit-committee', async (req, res) => {
  try {
    const limitCheck = checkUsageLimit();
    if (!limitCheck.allowed) {
      return res.status(429).json({ 
        success: false,
        error: limitCheck.message 
      });
    }
    
    const { companyName, outputFormat } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ 
        success: false,
        error: '请提供公司名称' 
      });
    }
    
    const taskId = uuidv4();
    const task = {
      id: taskId,
      type: 'credit-committee',
      params: { companyName, outputFormat },
      status: TaskStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: null,
      error: null
    };
    
    tasks.set(taskId, task);
    
    // 异步处理
    processTask(taskId, 'credit-committee', { companyName, outputFormat });
    
    res.json({
      success: true,
      taskId: task.id,
      status: task.status,
      message: '任务已创建，正在处理中...',
      pollUrl: `/api/task/${task.id}`
    });
  } catch (error) {
    console.error('[审贷会助手] 错误:', error);
    res.status(500).json({ 
      success: false,
      error: '创建任务失败', 
      details: error.message 
    });
  }
});

// 4. 查询任务状态
app.get('/api/task/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      error: '任务不存在'
    });
  }
  
  const response = {
    success: true,
    taskId: task.id,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
  
  if (task.status === TaskStatus.COMPLETED) {
    response.data = task.result;
    response.usage = {
      remaining: usageStats.dailyLimit - usageStats.totalRequests,
      total: usageStats.dailyLimit
    };
    // 附带 Word 文档下载信息
    if (task.docx) {
      response.docx = {
        url: `/api/download/${taskId}`,
        filename: task.docx.filename
      };
    }
  } else if (task.status === TaskStatus.FAILED) {
    response.error = task.error;
  } else {
    response.message = task.status === TaskStatus.PROCESSING ? '正在处理中...' : '等待处理...';
  }
  
  res.json(response);
});

// 5. 文件下载
app.get('/api/download/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  if (!task.docx || !task.docx.filePath) {
    return res.status(404).json({ success: false, error: '文档尚未生成' });
  }
  
  const filePath = task.docx.filePath;
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: '文件不存在' });
  }
  
  // 设置下载头
  const filename = encodeURIComponent(task.docx.filename);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
  
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// 6. 验证邀请码
app.post('/api/verify-code', (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({
      success: false,
      valid: false,
      error: '请提供邀请码'
    });
  }
  
  const isValid = VALID_INVITE_CODES.includes(code.trim().toUpperCase());
  
  res.json({
    success: true,
    valid: isValid,
    message: isValid ? '验证成功' : '邀请码无效'
  });
});

// 获取使用统计
app.get('/api/usage', (req, res) => {
  const today = new Date().toDateString();
  
  if (usageStats.lastResetDate !== today) {
    usageStats.totalRequests = 0;
    Object.keys(usageStats.requestsByType).forEach(key => {
      usageStats.requestsByType[key] = 0;
    });
    usageStats.lastResetDate = today;
  }
  
  res.json({
    remaining: usageStats.dailyLimit - usageStats.totalRequests,
    total: usageStats.dailyLimit,
    used: usageStats.totalRequests,
    breakdown: usageStats.requestsByType,
    resetTime: new Date(usageStats.lastResetDate + ' 00:00:00').toISOString()
  });
});

// 健康检查
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'bank-assistant-server',
    version: '1.0.0',
    mode: 'standalone'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    dailyLimit: usageStats.dailyLimit,
    used: usageStats.totalRequests,
    remaining: usageStats.dailyLimit - usageStats.totalRequests,
    activeTasks: tasks.size
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 银行助手服务器已启动');
  console.log('='.repeat(50));
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`📊 每日免费额度: ${usageStats.dailyLimit} 次`);
  console.log(`⚡ 模式: 独立服务器`);
  console.log('='.repeat(50));
});

process.on('SIGTERM', () => {
  console.log('\n收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});
