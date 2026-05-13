// app.js
App({
  globalData: {
    // 修改为你的服务器地址
    apiBaseUrl: 'http://your-server-ip:3000'
    // 如果配置了域名，使用：
    // apiBaseUrl: 'https://api.your-domain.com'
  },

  onLaunch() {
    console.log('银行助手小程序启动');
  }
});
