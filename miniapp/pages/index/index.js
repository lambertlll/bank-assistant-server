// pages/index/index.js
const api = require('../../utils/api.js');

Page({
  data: {
    selectedFunction: '',
    clientName: '',
    clientType: 'enterprise',
    companyName: '',
    reportType: 'detailed',
    outputFormat: 'text',
    loading: false,
    error: '',
    usage: {
      used: 0,
      remaining: 100,
      total: 100
    }
  },

  onLoad() {
    this.loadUsage();
  },

  onShow() {
    this.loadUsage();
  },

  // 加载使用统计
  loadUsage() {
    api.getUsage()
      .then((usage) => {
        this.setData({ usage });
      })
      .catch((err) => {
        console.error('获取使用统计失败:', err);
      });
  },

  // 选择功能
  selectFunction(e) {
    const func = e.currentTarget.dataset.function;
    this.setData({
      selectedFunction: func,
      error: ''
    });
  },

  // 输入框变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  // 单选框变化
  onRadioChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.currentTarget.dataset.value;
    this.setData({
      [field]: value
    });
  },

  // 提交
  submit() {
    const { selectedFunction, clientName, clientType, companyName, reportType, outputFormat } = this.data;

    // 验证输入
    if (selectedFunction === 'client-research' && !clientName) {
      this.setData({ error: '请输入客户名称' });
      return;
    }
    if ((selectedFunction === 'financial-report' || selectedFunction === 'credit-committee') && !companyName) {
      this.setData({ error: '请输入公司名称' });
      return;
    }

    // 构建请求数据
    let data = {};
    let endpoint = '';

    if (selectedFunction === 'client-research') {
      endpoint = 'client-research';
      data = { clientName, clientType };
    } else if (selectedFunction === 'financial-report') {
      endpoint = 'financial-report';
      data = { companyName, reportType };
    } else if (selectedFunction === 'credit-committee') {
      endpoint = 'credit-committee';
      data = { companyName, outputFormat };
    }

    // 显示加载
    this.setData({ loading: true, error: '' });
    wx.showLoading({ title: '创建任务中...' });

    // 创建任务
    api.createTask(endpoint, data)
      .then((result) => {
        wx.hideLoading();
        wx.showLoading({ title: '分析中，请稍候...' });

        // 轮询任务状态
        return api.pollTask(result.taskId, (task) => {
          console.log('任务状态:', task.status);
        });
      })
      .then((task) => {
        wx.hideLoading();
        this.setData({ loading: false });

        // 跳转到结果页
        wx.navigateTo({
          url: `/pages/result/result?taskId=${task.taskId}`
        });
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({
          loading: false,
          error: err.message || '处理失败，请重试'
        });
      });
  }
});
