App({
  async onLaunch() {
    wx.cloud.init()
    
    // 先加载本地收藏的股票数据
    const favoriteStocks = wx.getStorageSync('favorite_stocks') || []
    this.globalData.favoriteStocks = favoriteStocks
    
    // 异步执行数据迁移，不阻塞小程序启动
    this.syncFavoritesData()
    
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

  // 同步自选股数据到服务端
  async syncFavoritesData() {
    try {
      console.log('开始执行自选股数据迁移')
      
      // 检查是否已经执行过迁移
      const migrationKey = 'favorites_migration_completed'
      const migrationCompleted = wx.getStorageSync(migrationKey)
      
      if (migrationCompleted) {
        console.log('数据迁移已完成，跳过')
        return
      }
      
      const stockAPI = require('./utils/api.js')
      const syncResult = await stockAPI.syncLocalFavorites()
      
      if (syncResult.syncResult) {
        const { uploaded, failed, total, error, fallbackToLocal } = syncResult.syncResult
        
        if (error && fallbackToLocal) {
          console.log('数据迁移失败，继续使用本地数据:', error)
        } else if (total > 0) {
          console.log(`数据迁移完成: 成功上传${uploaded}个，失败${failed}个，共${total}个`)
          
          // 更新全局数据
          this.globalData.favoriteStocks = syncResult.favorites || []
          
          // 显示迁移结果提示（只在有实际上传时显示）
          if (uploaded > 0) {
            setTimeout(() => {
              wx.showToast({
                title: `已同步${uploaded}只自选股到云端`,
                icon: 'success',
                duration: 2000
              })
            }, 1000) // 延迟1秒显示，避免与页面加载冲突
          }
        } else {
          console.log('无需迁移数据，使用服务端现有数据')
          // 更新本地全局数据
          this.globalData.favoriteStocks = syncResult.favorites || []
        }
        
        // 标记迁移完成
        wx.setStorageSync(migrationKey, true)
      }
      
    } catch (error) {
      console.error('自选股数据迁移失败:', error)
      // 迁移失败不影响小程序正常使用，继续使用本地数据
    }
  },
  
  globalData: {
    userInfo: null,
    apiUrl: 'https://api.example.com', // 这里需要替换为实际的API地址
    favoriteStocks: [] // 收藏的股票列表
  }
})