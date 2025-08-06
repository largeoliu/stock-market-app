// 启动页逻辑
Page({
  data: {
    loadingText: '正在初始化...',
    loadError: false,
    errorMsg: '网络连接失败'
  },

  onLoad() {
    console.log('[Launch] 启动页加载')
    
    // 检查应用是否已经初始化完成
    this.checkAppReady()
  },

  /**
   * 检查应用初始化状态
   */
  checkAppReady() {
    const app = getApp()
    
    // 检查两个条件：基础初始化和数据预加载
    if (app && app.globalData) {
      // 如果数据准备好了
      if (app.globalData.homeDataReady) {
        // 检查是否有严重错误（所有数据都失败）
        const homeData = app.globalData.homeData
        if (homeData && homeData.hasError && 
            !homeData.hotStocks && !homeData.favorites) {
          // 显示错误状态
          this.setData({
            loadError: true,
            errorMsg: homeData.errorMsg || '网络连接失败，请检查网络设置'
          })
          return
        }
        // 至少有部分数据成功，或者没有错误，可以进入首页
        this.navigateToHome()
        return
      }
    }
    
    // 否则等待初始化完成
    this.waitForInit()
  },

  /**
   * 等待应用初始化完成
   */
  waitForInit() {
    const app = getApp()
    let checkCount = 0
    const maxChecks = 100 // 最多检查10秒（100次 * 100ms）
    
    const checkInterval = setInterval(() => {
      checkCount++
      
      // 检查数据预加载是否完成
      if (app && app.globalData && app.globalData.homeDataReady) {
        clearInterval(checkInterval)
        
        // 检查是否有严重错误
        const homeData = app.globalData.homeData
        if (homeData && homeData.hasError && 
            !homeData.hotStocks && !homeData.favorites) {
          // 显示错误状态
          this.setData({
            loadError: true,
            errorMsg: homeData.errorMsg || '网络连接失败，请检查网络设置'
          })
          return
        }
        
        // 延迟一点跳转，确保动画流畅
        setTimeout(() => {
          this.navigateToHome()
        }, 300)
        return
      }
      
      // 超时处理
      if (checkCount >= maxChecks) {
        clearInterval(checkInterval)
        console.warn('[Launch] 初始化超时，显示错误')
        this.setData({
          loadError: true,
          errorMsg: '加载超时，请检查网络连接'
        })
      }
    }, 100)
  },

  /**
   * 跳转到主页
   */
  navigateToHome() {
    console.log('[Launch] 跳转到主页')
    
    // 使用 reLaunch 替换整个页面栈
    wx.reLaunch({
      url: '/pages/index/index',
      success: () => {
        console.log('[Launch] 成功跳转到主页')
      },
      fail: (err) => {
        console.error('[Launch] 跳转失败:', err)
        // 跳转失败时的备用方案
        wx.switchTab({
          url: '/pages/index/index'
        })
      }
    })
  },

  onShow() {
    // 页面显示时重新检查
    this.checkAppReady()
  },

  /**
   * 重试按钮处理
   */
  async onRetry() {
    console.log('[Launch] 用户点击重试')
    
    this.setData({
      loadError: false
    })
    
    const app = getApp()
    if (app) {
      // 重置标志
      app.globalData.homeDataReady = false
      
      // 重新加载数据
      await app.preloadHomeData()
      
      // 重新检查状态
      this.checkAppReady()
    }
  },

  /**
   * 跳过按钮处理
   */
  onSkip() {
    console.log('[Launch] 用户选择跳过，使用本地数据或空数据')
    
    // 设置空数据，让首页自己处理
    const app = getApp()
    if (app && app.globalData) {
      app.globalData.homeData = {
        hotStocks: null,
        favorites: null,
        hasError: true,
        skipped: true
      }
      app.globalData.homeDataReady = true
    }
    
    // 直接进入首页
    this.navigateToHome()
  }
})