// pages/result/result.js
const api = require('../../utils/api.js');

Page({
  data: {
    taskId: '',
    result: '',
    loading: true,
    error: ''
  },

  onLoad(options) {
    const taskId = options.taskId;
    if (taskId) {
      this.setData({ taskId });
      this.loadResult(taskId);
    } else {
      this.setData({
        loading: false,
        error: '任务ID不存在'
      });
    }
  },

  // 加载结果
  loadResult(taskId) {
    api.getTaskStatus(taskId)
      .then((task) => {
        if (task.status === 'completed') {
          this.setData({
            loading: false,
            result: task.data
          });
        } else if (task.status === 'failed') {
          this.setData({
            loading: false,
            error: task.error || '任务失败'
          });
        } else {
          // 继续轮询
          setTimeout(() => {
            this.loadResult(taskId);
          }, 5000);
        }
      })
      .catch((err) => {
        this.setData({
          loading: false,
          error: err.message || '加载失败'
        });
      });
  },

  // 复制结果
  copyResult() {
    wx.setClipboardData({
      data: this.data.result,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 返回首页
  backToHome() {
    wx.navigateBack();
  }
});
