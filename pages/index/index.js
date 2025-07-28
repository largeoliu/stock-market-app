// pages/index/index.js
const stockAPI = require('../../utils/api.js')
const util = require('../../utils/util.js')

Page({
  data: {
    hotStocks: [], // 热门股票
    recentSearches: [], // 最近搜索
    loading: true
  },

  onLoad() {
    this.loadHotStocks()
    this.loadRecentSearches()
  },

  onShow() {
    this.loadRecentSearches()
  },

  // 加载热门股票
  async loadHotStocks() {
    try {
      util.showLoading('加载中...')
      
      // 模拟热门股票数据
      const hotStocks = [
        {
          symbol: '000001.SZ',
          name: '平安银行',
          market: 'A股',
          price: 12.50,
          change: 0.15,
          changePercent: 1.22
        },
        {
          symbol: '00700.HK',
          name: '腾讯控股',
          market: '港股',
          price: 368.20,
          change: -5.80,
          changePercent: -1.55
        },
        {
          symbol: 'AAPL',
          name: '苹果公司',
          market: '美股',
          price: 175.43,
          change: 2.15,
          changePercent: 1.24
        },
        {
          symbol: '000002.SZ',
          name: '万科A',
          market: 'A股',
          price: 8.95,
          change: -0.12,
          changePercent: -1.32
        }
      ]
      
      this.setData({
        hotStocks: hotStocks,
        loading: false
      })
      
      util.hideLoading()
    } catch (error) {
      console.error('加载热门股票失败:', error)
      util.hideLoading()
      util.showToast('加载失败，请重试')
      this.setData({ loading: false })
    }
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