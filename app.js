const performanceMonitor = require('./utils/performance.js')

const appInstance = {
  async onLaunch() {
    // 开始监控应用启动性能
    performanceMonitor.startTimer('app_launch')
    
    console.log('[App] 小程序启动开始')
    
    // 立即执行关键初始化操作
    await this.initCriticalData()
    performanceMonitor.markPhase('app_launch', 'critical_data_ready')
    
    // 并行执行非阻塞操作
    const parallelTasks = [
      this.initCloud(),
      this.initUserAuth(),
      this.checkForUpdate()
    ]
    
    await Promise.allSettled(parallelTasks)
    performanceMonitor.markPhase('app_launch', 'parallel_tasks_done')
    
    // 延迟执行非关键操作
    setTimeout(() => {
      this.initBackgroundTasks()
    }, 100)
    
    // 完成启动监控
    const appLaunchResult = performanceMonitor.endTimer('app_launch', {
      launchType: this.getLaunchType(),
      pageName: 'app'
    })
    
    console.log('[App] 小程序启动完成，耗时:', appLaunchResult.totalTime, 'ms')
  },

  /**
   * 初始化关键数据 - 必须同步完成的操作
   */
  async initCriticalData() {
    try {
      // 加载本地收藏股票数据
      const favoriteStocks = wx.getStorageSync('favorite_stocks') || []
      this.globalData.favoriteStocks = favoriteStocks
      
      // 记录访问日志
      const logs = wx.getStorageSync('logs') || []
      logs.unshift(Date.now())
      wx.setStorageSync('logs', logs)
      
      console.log('[App] 关键数据初始化完成')
      
    } catch (error) {
      console.error('[App] 关键数据初始化失败:', error)
      performanceMonitor.reportPerformance('app_error', {
        errorType: 'critical_data_init_failed',
        error: error.message
      })
    }
  },

  /**
   * 初始化云开发
   */
  async initCloud() {
    try {
      performanceMonitor.startTimer('cloud_init')
      wx.cloud.init()
      performanceMonitor.endTimer('cloud_init')
      console.log('[App] 云开发初始化完成')
    } catch (error) {
      console.error('[App] 云开发初始化失败:', error)
    }
  },

  /**
   * 初始化用户认证
   */
  async initUserAuth() {
    try {
      performanceMonitor.startTimer('user_auth')
      
      // 登录
      const loginResult = await new Promise((resolve) => {
        wx.login({
          success: res => {
            console.log('[App] 登录成功', res.code)
            resolve(res)
          },
          fail: err => {
            console.error('[App] 登录失败:', err)
            resolve(null)
          }
        })
      })

      // 获取用户信息
      if (loginResult) {
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
      }
      
      performanceMonitor.endTimer('user_auth')
      console.log('[App] 用户认证完成')
    } catch (error) {
      console.error('[App] 用户认证失败:', error)
    }
  },

  /**
   * 初始化后台任务
   */
  initBackgroundTasks() {
    console.log('[App] 开始执行后台任务')
    
    // 异步执行数据迁移
    this.syncFavoritesData()
    
    // 内存使用检测
    performanceMonitor.checkMemoryUsage('app_launch')
  },

  /**
   * 获取启动类型
   */
  getLaunchType() {
    // 检查是否为冷启动
    const lastExitTime = wx.getStorageSync('last_exit_time')
    const now = Date.now()
    
    if (!lastExitTime || (now - lastExitTime) > 5 * 60 * 1000) { // 5分钟后认为是冷启动
      return 'cold'
    }
    return 'hot'
  },

  /**
   * 应用显示时
   */
  onShow() {
    console.log('[App] 小程序显示')
    performanceMonitor.checkMemoryUsage('app_show')
  },

  /**
   * 应用隐藏时
   */
  onHide() {
    console.log('[App] 小程序隐藏')
    // 记录退出时间，用于判断下次启动类型
    wx.setStorageSync('last_exit_time', Date.now())
  },

  // 同步自选股数据到服务端 - 优化版
  async syncFavoritesData() {
    performanceMonitor.startTimer('data_migration')
    
    try {
      console.log('[App] 开始执行自选股数据迁移')
      
      // 检查是否已经执行过迁移
      const migrationKey = 'favorites_migration_completed'
      const migrationCompleted = wx.getStorageSync(migrationKey)
      
      if (migrationCompleted) {
        console.log('[App] 数据迁移已完成，跳过')
        performanceMonitor.endTimer('data_migration', { skipped: true })
        return
      }
      
      const stockAPI = require('./utils/api.js')
      
      // 使用性能监控包装API调用
      const syncResult = await performanceMonitor.monitorApiCall(
        '/sync_favorites',
        () => stockAPI.syncLocalFavorites()
      )
      
      if (syncResult.syncResult) {
        const { uploaded, failed, total, error, fallbackToLocal } = syncResult.syncResult
        
        if (error && fallbackToLocal) {
          console.log('[App] 数据迁移失败，继续使用本地数据:', error)
        } else if (total > 0) {
          console.log(`[App] 数据迁移完成: 成功上传${uploaded}个，失败${failed}个，共${total}个`)
          
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
            }, 1500) // 延迟显示，避免与启动流程冲突
          }
        } else {
          console.log('[App] 无需迁移数据，使用服务端现有数据')
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
      
      performanceMonitor.endTimer('data_migration', {
        success: true,
        uploaded: syncResult.syncResult?.uploaded || 0
      })
      
    } catch (error) {
      console.error('[App] 自选股数据迁移失败:', error)
      
      performanceMonitor.endTimer('data_migration', {
        success: false,
        error: error.message
      })
      
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