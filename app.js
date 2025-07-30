App({
  onLaunch() {
    wx.cloud.init()
    
    // 加载收藏的股票数据
    const favoriteStocks = wx.getStorageSync('favorite_stocks') || []
    this.globalData.favoriteStocks = favoriteStocks
    
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log('登录成功', res.code)
      }
    })

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res)
              }
            }
          })
        }
      }
    })
  },
  
  globalData: {
    userInfo: null,
    apiUrl: 'https://api.example.com', // 这里需要替换为实际的API地址
    favoriteStocks: [] // 收藏的股票列表
  }
})