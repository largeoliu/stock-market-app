// 启动页逻辑
Page({
  data: {
    loadingText: '正在初始化...'
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
    
    // 如果应用已经初始化完成，直接跳转
    if (app && app.globalData && app.globalData.initReady) {
      this.navigateToHome()
      return
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
      
      // 检查初始化是否完成
      if (app && app.globalData && app.globalData.initReady) {
        clearInterval(checkInterval)
        // 延迟一点跳转，确保动画流畅
        setTimeout(() => {
          this.navigateToHome()
        }, 300)
        return
      }
      
      // 超时处理
      if (checkCount >= maxChecks) {
        clearInterval(checkInterval)
        console.warn('[Launch] 初始化超时，强制跳转')
        this.navigateToHome()
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
  }
})