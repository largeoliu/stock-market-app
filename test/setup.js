// Jest 测试环境设置文件

// 模拟微信小程序全局对象和API
global.wx = {
  // 界面交互
  showToast: jest.fn(),
  showModal: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  
  // 数据存储
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  
  // 页面导航
  navigateTo: jest.fn(),
  navigateBack: jest.fn(),
  setNavigationBarTitle: jest.fn(),
  
  // 系统信息
  getSystemInfoSync: jest.fn(() => ({
    windowWidth: 375,
    windowHeight: 667,
    safeArea: { top: 44, bottom: 0 },
    statusBarHeight: 44
  })),
  
  // 设备功能
  vibrateShort: jest.fn(),
  
  // 数据分析
  reportEvent: jest.fn(),
  
  // 下拉刷新
  stopPullDownRefresh: jest.fn(),
  
  // 选择器查询
  createSelectorQuery: jest.fn(() => ({
    in: jest.fn(() => ({
      select: jest.fn(() => ({
        boundingClientRect: jest.fn((callback) => {
          if (callback) {
            callback({ width: 300, height: 50 })
          }
          return {
            exec: jest.fn()
          }
        })
      }))
    }))
  }))
}

// 模拟小程序页面构造函数
global.Page = jest.fn()

// 模拟小程序应用实例
global.getApp = jest.fn(() => ({
  globalData: {
    favoriteStocks: []
  }
}))

// 模拟页面栈
global.getCurrentPages = jest.fn(() => [
  { route: 'pages/index/index' }
])

// 模拟 console 方法，避免测试输出过多日志
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}