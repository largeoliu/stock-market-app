// pages/search/search.js
const stockAPI = require('../../utils/api.js')
const util = require('../../utils/util.js')
const track = require('../../utils/track.js')

Page({
  data: {
    keyword: '',
    searchResults: [],
    recentSearches: [],
    favoriteStocks: [], // 自选的股票
    loading: false,
    showResults: false,
    hotStocks: [],
    hotStocksLoading: true,
    hotStocksLoadFailed: false, // 热门搜索是否加载失败
    currentTab: 'hot', // 默认显示热门搜索
    currentTabIndex: 0, // 当前tab的索引，用于swiper
    safeAreaTop: 0, // 安全区域顶部高度
    isFirstLoad: true, // 标记是否首次加载
    tabList: ['hot', 'recent', 'favorites'] // tab列表，对应swiper的索引
  },

  async onLoad() {
    // 获取系统信息，设置安全区域
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      safeAreaTop: systemInfo.safeArea?.top || systemInfo.statusBarHeight || 0
    })
    
    this.loadRecentSearches()
    this.loadHotStocks()
    await this.loadFavorites()
    
    // 检查自选股，如果有自选股则默认显示自选tab
    this.setDefaultTab()
    
    // 创建防抖搜索函数
    this.debouncedSearch = util.debounce(this.performSearch.bind(this), 500)
  },

  async onShow() {
    this.loadRecentSearches()
    await this.loadFavorites()
    // 只在首次加载时设置默认tab
    if (this.data.isFirstLoad) {
      this.setDefaultTab()
      this.setData({ isFirstLoad: false })
    }
  },

  // 设置默认Tab
  setDefaultTab() {
    const favoriteStocks = util.getStorage('favorite_stocks', [])
    if (favoriteStocks.length > 0) {
      // 如果有自选股，默认显示自选tab
      const tabIndex = this.data.tabList.indexOf('favorites')
      this.setData({
        currentTab: 'favorites',
        currentTabIndex: tabIndex
      })
    }
    // 如果没有自选股，保持默认的热门搜索tab
  },

  // 加载最近搜索
  loadRecentSearches() {
    const recentSearches = util.getStorage('recent_searches', [])
    this.setData({ recentSearches: recentSearches.slice(0, 20) })
  },

  // 加载热门搜索股票
  async loadHotStocks() {
    try {
      this.setData({ hotStocksLoading: true })
      
      const response = await stockAPI.getHotSearchStocks()
      console.log('热门搜索数据:', response)
      
      if (response && response.results) {
        // API已经格式化了数据，直接使用
        console.log('热门股票数据已格式化:', response.results.slice(0, 3))
        
        this.setData({ 
          hotStocks: response.results,
          hotStocksLoading: false,
          hotStocksLoadFailed: false // 成功加载后重置失败状态
        })
      } else {
        throw new Error('数据格式错误')
      }
    } catch (error) {
      console.error('加载热门股票失败:', error)
      this.setData({ 
        hotStocksLoading: false,
        hotStocksLoadFailed: true, // 标记加载失败
        hotStocks: [] // 设置为空数组，避免显示错误
      })
      // 不显示错误提示，静默失败
    }
  },

  // 重试加载热门搜索
  retryLoadHotStocks() {
    console.log('用户手动重试热门搜索')
    this.loadHotStocks()
  },

  // 标签页切换
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    const currentTab = this.data.currentTab
    
    // 埋点：Tab切换
    if (currentTab !== tab) {
      track.tabSwitch(currentTab, tab)
    }
    
    const tabIndex = this.data.tabList.indexOf(tab)
    this.setData({ 
      currentTab: tab,
      currentTabIndex: tabIndex
    })
    
    // 触觉反馈
    wx.vibrateShort({
      type: 'light',
      fail: () => {}
    })

    // 如果切换到热门搜索，且之前加载失败或没有数据，则重新加载
    if (tab === 'hot' && (this.data.hotStocksLoadFailed || this.data.hotStocks.length === 0)) {
      console.log('重新加载热门搜索数据')
      this.loadHotStocks()
    }
  },

  // swiper滑动事件
  onSwiperChange(e) {
    const currentIndex = e.detail.current
    const tab = this.data.tabList[currentIndex]
    const currentTab = this.data.currentTab
    
    // 埋点：Tab切换（通过滑动）
    if (currentTab !== tab) {
      track.tabSwitch(currentTab, tab)
    }
    
    this.setData({
      currentTab: tab,
      currentTabIndex: currentIndex
    })

    // 如果滑动到热门搜索，且之前加载失败或没有数据，则重新加载
    if (tab === 'hot' && (this.data.hotStocksLoadFailed || this.data.hotStocks.length === 0)) {
      console.log('重新加载热门搜索数据')
      this.loadHotStocks()
    }
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
      
      // 埋点：搜索提交
      track.searchSubmit(keyword, results.length)
      
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
    const index = e.currentTarget.dataset.index || 0
    
    // 埋点：点击搜索结果
    track.searchResultClick(stock.symbol, stock.name, index)
    
    this.selectStock(stock, 'search')
  },

  // 点击热门股票
  onHotStockTap(e) {
    const hotStock = e.currentTarget.dataset.stock
    const index = e.currentTarget.dataset.index || 0
    
    // 直接使用热门股票数据跳转到详情页，不调用搜索接口
    const stock = {
      name: hotStock.name,
      symbol: hotStock.symbol || hotStock.name, // 使用symbol，如果没有则使用name
      market: hotStock.market || 'A股'
    }
    
    // 埋点：点击热门股票
    track.hotStockClick(stock.symbol, stock.name, index)
    
    console.log('热门股票点击跳转:', stock)
    this.selectStock(stock, 'hot')
  },

  // 点击最近搜索
  onRecentTap(e) {
    const stock = e.currentTarget.dataset.stock
    
    // 埋点：点击历史搜索
    track.recentSearchClick(stock.symbol, stock.name)
    
    this.selectStock(stock, 'recent')
  },

  // 选择股票
  selectStock(stock, from = '') {
    // 添加到最近搜索
    this.addToRecentSearches(stock)
    
    // 跳转到详情页，传递来源信息
    const fromParam = from ? `&from=${from}` : ''
    wx.navigateTo({
      url: `/pages/detail/detail?symbol=${stock.symbol}&name=${stock.name}&market=${stock.market || ''}${fromParam}`
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
    const historyCount = this.data.recentSearches.length
    
    wx.showModal({
      title: '提示',
      content: '确定要清除所有搜索记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 埋点：清空搜索历史
          track.clearSearchHistory(historyCount)
          
          util.removeStorage('recent_searches')
          this.setData({ recentSearches: [] })
          util.showToast('已清除', 'success')
        }
      }
    })
  },

  // 删除单个搜索记录
  deleteRecentItem(e) {
    
    const index = e.currentTarget.dataset.index
    const recentSearches = util.getStorage('recent_searches', [])
    
    recentSearches.splice(index, 1)
    util.setStorage('recent_searches', recentSearches)
    
    this.setData({ recentSearches: recentSearches.slice(0, 20) })
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

  // 加载自选列表
  async loadFavorites() {
    try {
      console.log('开始加载自选股列表')
      
      // 优先从服务端获取数据
      let favoriteData
      try {
        favoriteData = await stockAPI.getFavorites()
        console.log('从服务端获取自选股成功:', favoriteData.count, '只')
        
        // 更新本地存储作为缓存
        if (favoriteData.favorites && favoriteData.favorites.length > 0) {
          util.setStorage('favorite_stocks', favoriteData.favorites)
        }
      } catch (error) {
        console.error('从服务端获取自选股失败，使用本地数据:', error.message)
        
        // 降级到本地数据
        const localFavorites = util.getStorage('favorite_stocks', [])
        favoriteData = {
          count: localFavorites.length,
          favorites: localFavorites
        }
      }
      
      // 按自选时间倒序排序（最新自选的在前面）
      const sortedStocks = favoriteData.favorites.sort((a, b) => {
        const timeA = a.timestamp || 0
        const timeB = b.timestamp || 0
        return timeB - timeA // 倒序排列
      })
      
      console.log('自选列表排序后:', sortedStocks.map(s => ({ name: s.name, time: s.timestamp })))
      
      this.setData({
        favoriteStocks: sortedStocks
      })
      
      // 同步全局数据
      app.globalData.favoriteStocks = sortedStocks
      
    } catch (error) {
      console.error('加载自选列表失败:', error)
      
      // 最后的降级方案：使用本地数据
      const localFavorites = util.getStorage('favorite_stocks', [])
      const sortedStocks = localFavorites.sort((a, b) => {
        const timeA = a.timestamp || 0
        const timeB = b.timestamp || 0
        return timeB - timeA
      })
      
      this.setData({
        favoriteStocks: sortedStocks
      })
    }
  },

  // 点击自选项
  onFavoriteTap(e) {
    const stock = e.currentTarget.dataset.stock
    
    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/detail/detail?symbol=${stock.symbol}&name=${stock.name}&market=${stock.market}&from=favorites`
    })
  },

  // 删除自选
  deleteFavoriteItem(e) {
    
    const index = e.currentTarget.dataset.index
    const stock = this.data.favoriteStocks[index]
    
    wx.showModal({
      title: '确认删除',
      content: `确定要取消自选 ${stock.name} 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.removeFavoriteItem(index)
        }
      }
    })
  },

  // 删除自选项
  removeFavoriteItem(index) {
    // 从存储中获取原始数据
    const storedFavorites = util.getStorage('favorite_stocks', [])
    const sortedStored = storedFavorites.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    
    // 删除指定项
    sortedStored.splice(index, 1)
    
    // 更新存储
    util.setStorage('favorite_stocks', sortedStored)
    
    // 更新全局数据
    const app = getApp()
    app.globalData.favoriteStocks = sortedStored
    
    // 重新加载自选列表
    this.loadFavorites()
    
    util.showToast('已取消自选', 'success')
  },

  // 清空所有自选
  clearAllFavorites() {
    if (this.data.favoriteStocks.length === 0) {
      util.showToast('自选列表为空')
      return
    }
    
    const favoriteCount = this.data.favoriteStocks.length
    
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有自选吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          // 埋点：清空自选股
          track.clearFavorites(favoriteCount)
          
          util.removeStorage('favorite_stocks')
          
          const app = getApp()
          app.globalData.favoriteStocks = []
          
          this.setData({
            favoriteStocks: []
          })
          
          util.showToast('已清空自选', 'success')
        }
      }
    })
  },

  // 删除单个搜索记录
  deleteRecentItem(e) {
    const index = e.currentTarget.dataset.index
    const recentSearches = util.getStorage('recent_searches', [])
    
    recentSearches.splice(index, 1)
    util.setStorage('recent_searches', recentSearches)
    
    this.setData({ recentSearches: recentSearches.slice(0, 20) })
    util.showToast('已删除', 'success')
  },

  // 删除自选
  deleteFavoriteItem(e) {
    
    const index = e.currentTarget.dataset.index
    const stock = this.data.favoriteStocks[index]
    
    wx.showModal({
      title: '确认删除',
      content: `确定要取消自选 ${stock.name} 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.removeFavoriteItem(index)
        }
      }
    })
  },

  // 删除自选项
  removeFavoriteItem(index) {
    // 从存储中获取原始数据
    const storedFavorites = util.getStorage('favorite_stocks', [])
    const sortedStored = storedFavorites.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    
    // 删除指定项
    sortedStored.splice(index, 1)
    
    // 更新存储
    util.setStorage('favorite_stocks', sortedStored)
    
    // 更新全局数据
    const app = getApp()
    app.globalData.favoriteStocks = sortedStored
    
    // 重新加载自选列表
    this.loadFavorites()
    
    util.showToast('已取消自选', 'success')
  }
})