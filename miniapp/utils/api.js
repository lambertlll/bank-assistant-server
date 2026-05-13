// utils/api.js
const app = getApp();

// 创建任务
function createTask(endpoint, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/${endpoint}`,
      method: 'POST',
      data: data,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          resolve(res.data);
        } else {
          reject(new Error(res.data.error || '请求失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

// 查询任务状态
function getTaskStatus(taskId) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/task/${taskId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          resolve(res.data);
        } else {
          reject(new Error(res.data.error || '查询失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

// 轮询任务状态
function pollTask(taskId, onProgress) {
  return new Promise((resolve, reject) => {
    const poll = () => {
      getTaskStatus(taskId)
        .then((task) => {
          if (task.status === 'completed') {
            resolve(task);
          } else if (task.status === 'failed') {
            reject(new Error(task.error || '任务失败'));
          } else {
            // 通知进度
            if (onProgress) {
              onProgress(task);
            }
            // 5 秒后重试
            setTimeout(poll, 5000);
          }
        })
        .catch(reject);
    };
    
    poll();
  });
}

// 获取使用统计
function getUsage() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/usage`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('获取统计失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

module.exports = {
  createTask,
  getTaskStatus,
  pollTask,
  getUsage
};
