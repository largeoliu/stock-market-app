// pages/search/search.js
const stockAPI = require('../../utils/api.js')
const util = require('../../utils/util.js')

Page({
  data: {
    keyword: '',
    searchResults: [],
    recentSearches: [],
    favoriteStocks: [], // 收藏的股票
    loading: false,
    showResults: false,
    hotStocks: [],
    hotStocksLoading: true,
    currentTab: 'hot', // 默认显示热门搜索
    safeAreaTop: 0 // 安全区域顶部高度
  },

  onLoad() {
    // 获取系统信息，设置安全区域
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      safeAreaTop: systemInfo.safeArea?.top || systemInfo.statusBarHeight || 0
    })
    
    this.loadRecentSearches()
    this.loadHotStocks()
    this.loadFavorites()
    // 创建防抖搜索函数
    this.debouncedSearch = util.debounce(this.performSearch.bind(this), 500)
  },

  onShow() {
    this.loadRecentSearches()
    this.loadFavorites()
  },

  // 加载最近搜索
  loadRecentSearches() {
    const recentSearches = util.getStorage('recent_searches', [])
    this.setData({ recentSearches: recentSearches.slice(0, 8) })
  },

  // 加载热门搜索股票
  async loadHotStocks() {
    try {
      this.setData({ hotStocksLoading: true })
      
      const response = await stockAPI.getHotSearchStocks()
      console.log('热门搜索数据:', response)
      
      if (response && response.results) {
        // 处理API返回的数据格式
        const hotStocks = response.results.map((item, index) => ({
          name: item.name,
          rank: item.rank || index + 1,
          changePercent: item.change_percent,
          heatScore: item.heat_score,
          // 注意：API返回的数据中没有symbol，可能需要后续通过name搜索获取
          symbol: '', // 暂时为空，后续可能需要额外处理
          market: 'A股' // 默认为A股
        }))
        
        this.setData({ 
          hotStocks: hotStocks,
          hotStocksLoading: false 
        })
      } else {
        throw new Error('数据格式错误')
      }
    } catch (error) {
      console.error('加载热门股票失败:', error)
      this.setData({ 
        hotStocksLoading: false,
        hotStocks: [] // 设置为空数组，避免显示错误
      })
      // 不显示错误提示，静默失败
    }
  },

  // 标签页切换
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    
    // 触觉反馈
    wx.vibrateShort({
      type: 'light',
      fail: () => {}
    })
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
  async onHotStockTap(e) {
    const hotStock = e.currentTarget.dataset.stock
    
    try {
      // 显示加载状态
      util.showLoading('搜索中...')
      
      // 通过股票名称搜索获取完整信息
      const searchResults = await stockAPI.searchStock(hotStock.name)
      
      if (searchResults && searchResults.length > 0) {
        // 找到匹配的股票，使用第一个结果
        const stock = searchResults[0]
        this.selectStock(stock)
      } else {
        // 如果搜索不到，使用热门股票的基本信息
        const stock = {
          name: hotStock.name,
          symbol: hotStock.name, // 临时使用name作为symbol
          market: hotStock.market || 'A股'
        }
        this.selectStock(stock)
      }
      
      util.hideLoading()
    } catch (error) {
      console.error('搜索热门股票失败:', error)
      util.hideLoading()
      util.showToast('搜索失败，请重试')
    }
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
    this.setData({
      keyword: '',
      searchResults: [],
      showResults: false
    })
  },

  // 加载收藏列表
  loadFavorites() {
    try {
      const favoriteStocks = util.getStorage('favorite_stocks', [])
      
      // 格式化时间显示
      const formattedStocks = favoriteStocks.map(stock => ({
        ...stock,
        formatTime: stock.timestamp ? new Date(stock.timestamp).toLocaleDateString() : '--'
      }))
      
      this.setData({
        favoriteStocks: formattedStocks
      })
    } catch (error) {
      console.error('加载收藏列表失败:', error)
    }
  },

  // 点击收藏项
  onFavoriteTap(e) {
    const stock = e.currentTarget.dataset.stock
    
    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/detail/detail?symbol=${stock.symbol}&name=${stock.name}&market=${stock.market}`
    })
  },

  // 删除收藏
  deleteFavoriteItem(e) {
    e.stopPropagation() // 阻止事件冒泡
    
    const index = e.currentTarget.dataset.index
    const stock = this.data.favoriteStocks[index]
    
    wx.showModal({
      title: '确认删除',
      content: `确定要取消收藏 ${stock.name} 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.removeFavoriteItem(index)
        }
      }
    })
  },

  // 删除收藏项
  removeFavoriteItem(index) {
    const favoriteStocks = [...this.data.favoriteStocks]
    favoriteStocks.splice(index, 1)
    
    // 更新存储
    util.setStorage('favorite_stocks', favoriteStocks)
    
    // 更新全局数据
    const app = getApp()
    app.globalData.favoriteStocks = favoriteStocks
    
    // 更新页面
    this.setData({
      favoriteStocks: favoriteStocks
    })
    
    util.showToast('已取消收藏', 'success')
  },

  // 清空所有收藏
  clearAllFavorites() {
    if (this.data.favoriteStocks.length === 0) {
      util.showToast('收藏列表为空')
      return
    }
    
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有收藏吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          util.removeStorage('favorite_stocks')
          
          const app = getApp()
          app.globalData.favoriteStocks = []
          
          this.setData({
            favoriteStocks: []
          })
          
          util.showToast('已清空收藏', 'success')
        }
      }
    })
  }
})