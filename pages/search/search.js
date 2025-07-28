// pages/search/search.js
const stockAPI = require('../../utils/api.js')
const util = require('../../utils/util.js')

Page({
  data: {
    keyword: '',
    searchResults: [],
    recentSearches: [],
    loading: false,
    showResults: false,
    hotStocks: [
      { symbol: '000001.SZ', name: '平安银行', market: 'A股' },
      { symbol: '00700.HK', name: '腾讯控股', market: '港股' },
      { symbol: 'AAPL', name: '苹果公司', market: '美股' },
      { symbol: '000002.SZ', name: '万科A', market: 'A股' },
      { symbol: '00941.HK', name: '中国移动', market: '港股' },
      { symbol: 'TSLA', name: '特斯拉', market: '美股' }
    ]
  },

  onLoad() {
    this.loadRecentSearches()
    // 创建防抖搜索函数
    this.debouncedSearch = util.debounce(this.performSearch.bind(this), 500)
  },

  onShow() {
    this.loadRecentSearches()
  },

  // 加载最近搜索
  loadRecentSearches() {
    const recentSearches = util.getStorage('recent_searches', [])
    this.setData({ recentSearches: recentSearches.slice(0, 8) })
  },

  // 输入框变化
  onInputChange(e) {
    const keyword = e.detail.value.trim()
    this.setData({ keyword })
    
    if (keyword) {
      this.debouncedSearch(keyword)
    } else {
      this.setData({ 
        searchResults: [], 
        showResults: false 
      })
    }
  },

  // 执行搜索
  async performSearch(keyword) {
    if (!keyword) return
    
    try {
      this.setData({ loading: true })
      
      const results = await stockAPI.searchStock(keyword)
      
      this.setData({
        searchResults: results,
        showResults: true,
        loading: false
      })
    } catch (error) {
      console.error('搜索失败:', error)
      util.showToast('搜索失败，请重试')
      this.setData({ loading: false })
    }
  },

  // 点击搜索结果
  onResultTap(e) {
    const stock = e.currentTarget.dataset.stock
    this.selectStock(stock)
  },

  // 点击热门股票
  onHotStockTap(e) {
    const stock = e.currentTarget.dataset.stock
    this.selectStock(stock)
  },

  // 点击最近搜索
  onRecentTap(e) {
    const stock = e.currentTarget.dataset.stock
    this.selectStock(stock)
  },

  // 选择股票
  selectStock(stock) {
    // 添加到最近搜索
    this.addToRecentSearches(stock)
    
    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/detail/detail?symbol=${stock.symbol}&name=${stock.name}&market=${stock.market || ''}`
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
      market: stock.market || '',
      timestamp: Date.now()
    })
    
    // 只保留最近20条
    recentSearches = recentSearches.slice(0, 20)
    
    util.setStorage('recent_searches', recentSearches)
  },

  // 清空搜索
  onClearInput() {
    this.setData({
      keyword: '',
      searchResults: [],
      showResults: false
    })
  },

  // 清除所有搜索记录
  clearAllRecentSearches() {
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

  // 删除单个搜索记录
  deleteRecentItem(e) {
    e.stopPropagation() // 阻止事件冒泡
    
    const index = e.currentTarget.dataset.index
    const recentSearches = util.getStorage('recent_searches', [])
    
    recentSearches.splice(index, 1)
    util.setStorage('recent_searches', recentSearches)
    
    this.setData({ recentSearches: recentSearches.slice(0, 8) })
    util.showToast('已删除', 'success')
  },

  // 取消搜索
  onCancel() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})