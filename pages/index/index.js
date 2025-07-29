// pages/index/index.js
const stockAPI = require('../../utils/api.js')
const util = require('../../utils/util.js')

Page({
  data: {
    recentSearches: [], // 最近搜索
    loading: false,
    safeAreaTop: 0 // 安全区域顶部高度
  },

  onLoad() {
    // 获取系统信息，设置安全区域
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      safeAreaTop: systemInfo.safeArea?.top || systemInfo.statusBarHeight || 0
    })
    
    this.loadRecentSearches()
  },

  onShow() {
    this.loadRecentSearches()
  },

  // 加载最近搜索
  loadRecentSearches() {
    const recentSearches = util.getStorage('recent_searches', [])
    this.setData({ recentSearches: recentSearches.slice(0, 5) })
  },

  // 点击股票项
  onStockTap(e) {
    const stock = e.currentTarget.dataset.stock
    
    // 添加到最近搜索
    this.addToRecentSearches(stock)
    
    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/detail/detail?symbol=${stock.symbol}&name=${stock.name}`
    })
  },

  // 添加到最近搜索
  addToRecentSearches(stock) {
    let recentSearches = util.getStorage('recent_searches', [])
    
    // 移除重复项
    recentSearches = recentSearches.filter(item => item.symbol !== stock.symbol)
    
    // 添加到开头
    recentSearches.unshift({
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market
    })
    
    // 只保留最近10条
    recentSearches = recentSearches.slice(0, 10)
    
    util.setStorage('recent_searches', recentSearches)
    this.setData({ recentSearches: recentSearches.slice(0, 5) })
  },

  // 点击搜索
  onSearchTap() {
    wx.switchTab({
      url: '/pages/search/search'
    })
  },

  // 清除最近搜索
  clearRecentSearches() {
    wx.showModal({
      title: '提示',
      content: '确定要清除所有搜索记录吗？',
      success: (res) => {
        if (res.confirm) {
          util.removeStorage('recent_searches')
          this.setData({ recentSearches: [] })
          util.showToast('已清除', 'success')
        }
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadHotStocks().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})