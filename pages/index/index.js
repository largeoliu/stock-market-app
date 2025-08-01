// pages/search/search.js
const stockAPI = require('../../utils/api.js')
const util = require('../../utils/util.js')
const track = require('../../utils/track.js')
const performanceMonitor = require('../../utils/performance.js')

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
    // 开始监控页面加载性能
    performanceMonitor.startTimer('page_load_index')
    console.log('[Index] 首页开始加载')
    
    // 获取系统信息，设置安全区域
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      safeAreaTop: systemInfo.safeArea?.top || systemInfo.statusBarHeight || 0
    })
    
    performanceMonitor.markPhase('page_load_index', 'system_info_ready')
    
    // 并行加载所有数据，提升加载性能
    await this.loadDataInParallel()
    
    performanceMonitor.markPhase('page_load_index', 'data_loaded')
    
    // 设置默认tab
    this.setDefaultTab()
    
    // 创建防抖搜索函数
    this.debouncedSearch = util.debounce(this.performSearch.bind(this), 500)
    
    // 完成页面加载监控
    performanceMonitor.endTimer('page_load_index', {
      pageName: 'index',
      favoriteCount: this.data.favoriteStocks.length,
      hotStockCount: this.data.hotStocks.length
    })
    
    console.log('[Index] 首页加载完成')
    
    // 检查内存使用
    performanceMonitor.checkMemoryUsage('index_load')
  },

  async onShow() {
    this.loadRecentSearches()
    
    // 只在首次加载时重新加载自选股，其他时候依赖缓存或其他页面的通知刷新
    if (this.data.isFirstLoad) {
      await this.loadFavorites()
      this.setDefaultTab()
      this.setData({ isFirstLoad: false })
    } else {
      // 非首次进入时，只检查本地缓存更新UI，不发起网络请求
      this.updateFavoritesFromLocal()
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

  // 加载热门搜索股票 - 简化版本，主要用于重试和其他场景
  async loadHotStocks() {
    try {
      this.setData({ hotStocksLoading: true })
      
      console.log('[Index] 发起热门股票请求')
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

  // 并行加载所有数据 - 简化版本
  async loadDataInParallel() {
    console.log('[Index] 开始并行加载数据')
    
    try {
      // 立即加载本地数据（非异步操作）
      this.loadRecentSearches()
      performanceMonitor.markPhase('page_load_index', 'recent_searches_loaded')
      
      // 并行执行所有异步数据加载任务
      const loadTasks = [
        this.loadFavoritesWithMonitoring(),
        this.loadHotStocksWithMonitoring()
      ]
      
      // 使用Promise.allSettled确保部分失败不影响其他数据加载
      const results = await Promise.allSettled(loadTasks)
      
      // 处理加载结果
      this.handleLoadResults(results)
      
      console.log('[Index] 并行数据加载完成')
      
    } catch (error) {
      console.error('[Index] 并行数据加载失败:', error)
      performanceMonitor.reportPerformance('page_load_error', {
        pageName: 'index',
        error: error.message
      })
    }
  },

  /**
   * 处理数据加载结果
   * @param {Array} results Promise.allSettled的结果
   */
  handleLoadResults(results) {
    const [favoritesResult, hotStocksResult] = results
    
    if (favoritesResult.status === 'rejected') {
      console.error('[Index] 自选股加载失败:', favoritesResult.reason)
    }
    
    if (hotStocksResult.status === 'rejected') {
      console.error('[Index] 热门股票加载失败:', hotStocksResult.reason)
      // 热门股票加载失败时显示重试按钮
      this.setData({ hotStocksLoadFailed: true })
    }
  },

  /**
   * 带性能监控的自选股加载
   */
  async loadFavoritesWithMonitoring() {
    const startTime = Date.now()
    
    try {
      await this.loadFavorites()
      const loadTime = Date.now() - startTime
      console.log('[Index] 自选股加载完成，耗时:', loadTime, 'ms')
      
      performanceMonitor.reportPerformance('data_load_favorites', {
        loadTime,
        count: this.data.favoriteStocks.length,
        success: true
      })
      
    } catch (error) {
      const loadTime = Date.now() - startTime
      console.error('[Index] 自选股加载失败:', error)
      
      performanceMonitor.reportPerformance('data_load_favorites', {
        loadTime,
        success: false,
        error: error.message
      })
      
      throw error
    }
  },

  /**
   * 带性能监控的热门股票加载
   */
  async loadHotStocksWithMonitoring() {
    const startTime = Date.now()
    
    try {
      await this.loadHotStocks()
      const loadTime = Date.now() - startTime
      console.log('[Index] 热门股票加载完成，耗时:', loadTime, 'ms')
      
      performanceMonitor.reportPerformance('data_load_hot_stocks', {
        loadTime,
        count: this.data.hotStocks.length,
        success: true
      })
      
    } catch (error) {
      const loadTime = Date.now() - startTime
      console.error('[Index] 热门股票加载失败:', error)
      
      performanceMonitor.reportPerformance('data_load_hot_stocks', {
        loadTime,
        success: false,
        error: error.message
      })
      
      throw error
    }
  },

  // 从本地缓存更新自选股列表（不发起网络请求）
  updateFavoritesFromLocal() {
    try {
      const localFavorites = util.getStorage('favorite_stocks', [])
      
      // 按自选时间倒序排序（最新自选的在前面）
      const sortedStocks = localFavorites.sort((a, b) => {
        const timeA = a.timestamp || 0
        const timeB = b.timestamp || 0
        return timeB - timeA // 倒序排列
      })
      
      this.setData({
        favoriteStocks: sortedStocks
      })
      
      // 同步全局数据
      const app = getApp()
      app.globalData.favoriteStocks = sortedStocks
      
      console.log('从本地缓存更新自选股列表:', sortedStocks.length, '只')
    } catch (error) {
      console.error('从本地缓存更新自选股失败:', error)
    }
  },

  // 加载自选列表
  async loadFavorites() {
    try {
      console.log('开始加载自选股列表')
      
      // 检查app.js是否已经完成数据迁移
      const app = getApp()
      const migrationCompleted = wx.getStorageSync('favorites_migration_completed')
      const migrationResult = wx.getStorageSync('migration_sync_result')
      
      let favoriteData
      
      if (migrationCompleted && migrationResult) {
        // 如果迁移已完成，直接使用迁移结果，避免重复请求
        console.log('使用app.js迁移结果，避免重复请求')
        favoriteData = migrationResult
        
        // 清除迁移结果缓存，避免下次误用
        wx.removeStorageSync('migration_sync_result')
      } else {
        // 如果迁移未完成或失败，则发起网络请求
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
  async removeFavoriteItem(index) {
    const stock = this.data.favoriteStocks[index]
    
    // 先乐观更新本地UI
    const storedFavorites = util.getStorage('favorite_stocks', [])
    const sortedStored = storedFavorites.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    
    // 删除指定项
    sortedStored.splice(index, 1)
    
    // 立即更新本地存储和UI
    util.setStorage('favorite_stocks', sortedStored)
    const app = getApp()
    app.globalData.favoriteStocks = sortedStored
    
    // 立即刷新UI
    this.setData({
      favoriteStocks: sortedStored
    })
    
    // 调用服务端API删除
    try {
      await stockAPI.removeFavorite(stock.symbol)
      console.log(`服务端删除自选股成功: ${stock.name}`)
      
      // 埋点：删除自选
      track.favoriteRemove(stock.symbol, stock.name, 'index')
      
      util.showToast('已取消自选', 'success')
      
    } catch (error) {
      console.error(`服务端删除自选股失败: ${error.message}`)
      
      // 服务端删除失败，回滚本地状态
      const originalFavorites = util.getStorage('favorite_stocks', [])
      originalFavorites.splice(index, 0, stock) // 重新插入被删除的股票
      
      util.setStorage('favorite_stocks', originalFavorites)
      app.globalData.favoriteStocks = originalFavorites
      
      // 重新刷新UI显示回滚后的数据
      await this.loadFavorites()
      
      util.showToast('取消自选失败，请重试', 'error')
    }
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
  }
})