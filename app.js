const appInstance = {
  async onLaunch() {
    wx.cloud.init()
    
    // 先加载本地收藏的股票数据
    const favoriteStocks = wx.getStorageSync('favorite_stocks') || []
    this.globalData.favoriteStocks = favoriteStocks
    
    // 异步执行数据迁移，不阻塞小程序启动
    this.syncFavoritesData()
    
    // 检查小程序更新
    this.checkForUpdate()
    
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
          
          // 更新全局数据和本地存储
          this.globalData.favoriteStocks = syncResult.favorites || []
          wx.setStorageSync('favorite_stocks', syncResult.favorites || [])
          
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
          // 更新本地全局数据和存储
          this.globalData.favoriteStocks = syncResult.favorites || []
          wx.setStorageSync('favorite_stocks', syncResult.favorites || [])
        }
        
        // 标记迁移完成，并存储迁移结果供页面使用
        wx.setStorageSync(migrationKey, true)
        wx.setStorageSync('migration_sync_result', syncResult)
        
        // 通知首页数据已准备好
        this.globalData.favoritesReady = true
      }
      
    } catch (error) {
      console.error('自选股数据迁移失败:', error)
      // 迁移失败不影响小程序正常使用，继续使用本地数据
      this.globalData.favoritesReady = true
    }
  },

  // 检查小程序更新
  checkForUpdate() {
    // 检查微信版本是否支持更新管理器
    if (!wx.canIUse('getUpdateManager')) {
      console.log('当前微信版本过低，无法使用更新管理器')
      return
    }

    const updateManager = wx.getUpdateManager()

    // 检查是否有新版本
    updateManager.onCheckForUpdate(function (res) {
      console.log('检查更新结果:', res.hasUpdate)
      if (res.hasUpdate) {
        console.log('发现新版本，准备下载')
      }
    })

    // 新版本下载成功
    updateManager.onUpdateReady(function () {
      console.log('新版本下载完成，提示用户重启')
      
      wx.showModal({
        title: '更新提示',
        content: '新版本已准备好，是否重启应用？',
        confirmText: '立即重启',
        cancelText: '稍后重启',
        success: function (res) {
          if (res.confirm) {
            console.log('用户确认重启应用')
            // 新版本已经下载好，调用 applyUpdate 应用新版本并重启
            updateManager.applyUpdate()
          } else {
            console.log('用户选择稍后重启')
            // 可以记录用户选择，在下次启动时再次提示
            wx.setStorageSync('pending_update', true)
          }
        }
      })
    })

    // 新版本下载失败
    updateManager.onUpdateFailed(function () {
      console.error('新版本下载失败')
      
      wx.showToast({
        title: '更新失败，请检查网络',
        icon: 'none',
        duration: 2000
      })
    })

    // 检查是否有待重启的更新
    this.checkPendingUpdate()
  },

  // 检查是否有待重启的更新
  checkPendingUpdate() {
    const pendingUpdate = wx.getStorageSync('pending_update')
    
    if (pendingUpdate) {
      // 延迟3秒显示，避免与启动流程冲突
      setTimeout(() => {
        wx.showModal({
          title: '更新提醒',
          content: '检测到有新版本等待应用，建议立即重启以获得最佳体验',
          confirmText: '立即重启',
          cancelText: '继续使用',
          success: function (res) {
            if (res.confirm) {
              // 清除待更新标记
              wx.removeStorageSync('pending_update')
              
              const updateManager = wx.getUpdateManager()
              updateManager.applyUpdate()
            }
            // 如果用户选择继续使用，保留标记，下次启动时继续提醒
          }
        })
      }, 3000)
    }
  },
  
  globalData: {
    userInfo: null,
    apiUrl: 'https://api.example.com', // 这里需要替换为实际的API地址
    favoriteStocks: [] // 收藏的股票列表
  }
}

App(appInstance)

// 导出供测试使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = appInstance
}