// utils/task-store.js
// 任务持久化存储 - 基于文件系统

const fs = require('fs');
const path = require('path');

const TASKS_DIR = path.join(__dirname, '../../data/tasks');
const INDEX_FILE = path.join(__dirname, '../../data/tasks-index.json');

// 确保目录存在
function ensureDir() {
  if (!fs.existsSync(TASKS_DIR)) {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  }
}

// 获取任务文件路径
function getTaskPath(taskId) {
  return path.join(TASKS_DIR, `${taskId}.json`);
}

// 保存任务
function saveTask(taskId, task) {
  ensureDir();
  const filePath = getTaskPath(taskId);
  fs.writeFileSync(filePath, JSON.stringify(task, null, 2), 'utf8');
  updateIndex(taskId, task);
}

// 读取任务
function getTask(taskId) {
  const filePath = getTaskPath(taskId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`读取任务 ${taskId} 失败:`, e.message);
    return null;
  }
}

// 删除任务
function deleteTask(taskId) {
  const filePath = getTaskPath(taskId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  let index = loadIndex();
  index = index.filter(item => item.id !== taskId);
  saveIndex(index);
}

// 列出所有任务（从索引）
function listTasks(limit = 50, offset = 0) {
  const index = loadIndex();
  // 按创建时间倒序
  index.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return {
    total: index.length,
    tasks: index.slice(offset, offset + limit)
  };
}

// 更新索引文件（轻量级，用于列表查询）
function updateIndex(taskId, task) {
  let index = loadIndex();
  const entry = {
    id: taskId,
    type: task.type,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    params: task.params
  };

  const existingIdx = index.findIndex(item => item.id === taskId);
  if (existingIdx !== -1) {
    index[existingIdx] = entry;
  } else {
    index.unshift(entry);
  }
  saveIndex(index);
}

// 加载索引
function loadIndex() {
  ensureDir();
  if (!fs.existsSync(INDEX_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(INDEX_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// 保存索引
function saveIndex(index) {
  ensureDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
}

module.exports = {
  saveTask,
  getTask,
  deleteTask,
  listTasks
};
