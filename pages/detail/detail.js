// pages/detail/detail.js
const stockAPI = require('../../utils/api.js')
const util = require('../../utils/util.js')
const track = require('../../utils/track.js')
const performanceMonitor = require('../../utils/performance.js')

Page({
  data: {
    stock: {
      symbol: '',
      name: '',
      market: ''
    },
    screenWidth: 375, // 默认屏幕宽度
    isFavorited: false, // 收藏状态
    currentPeriod: '1y', // 当前选择的时间范围
    periods: [
      { key: '1y', label: '1年', active: true },
      { key: '3y', label: '3年', active: false },
      { key: '5y', label: '5年', active: false },
      { key: '10y', label: '10年', active: false },
      { key: 'max', label: '全部', active: false }
    ],
    // 数据类型切换
    currentDataType: 'marketCap', // 当前数据类型: 'marketCap' | 'actualTurnover'
    dataTypes: [
      { key: 'marketCap', label: '总市值', active: true },
      { key: 'actualTurnover', label: '实际换手率', active: false }
    ],
    // 滑动指示器位置和宽度（初始值基于5个等分的估算）
    indicatorPosition: 0, // 初始在第一个位置，完全贴合左边
    indicatorWidth: 130, // 大概的宽度，会在页面渲染后重新计算
    historyData: [],
    loading: false,
    chartLoading: false,
    chartError: false,
    
    // 图表数据
    chartData: [],
    chartXData: [],
    
    // 统计信息
    stats: {
      currentMarketCap: 0,
      maxMarketCap: 0,
      minMarketCap: 0,
      avgMarketCap: 0,
      changePercent: 0,
      totalChange: 0
    },
    
    // 实际换手率数据
    turnoverData: {
      symbol: '',
      stable_ratio: 0,
      data: []
    },
    
    // 实际换手率统计信息
    turnoverStats: {
      currentTurnover: 0,
      maxTurnover: 0,
      minTurnover: 0,
      avgTurnover: 0,
      stableRatio: 0
    },
    
    // 稳定股东信息
    stableShareholders: {
      loading: false,
      data: null,
      error: false
    }
  },

  onLoad(options) {
    // 开始监控详情页加载性能
    performanceMonitor.startTimer('page_load_detail')
    
    const { symbol, name, market, from } = options
    
    // 获取屏幕宽度
    const windowInfo = wx.getWindowInfo()
    const screenWidth = windowInfo.windowWidth
    
    this.setData({
      stock: {
        symbol: symbol || '',
        name: name || '',
        market: market || ''
      },
      screenWidth: screenWidth,
      fromPage: from || '' // 记录来源页面
    })

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: name || symbol || '股票详情'
    })
    
    performanceMonitor.markPhase('page_load_detail', 'basic_info_ready')

    // 并行加载数据，提升加载性能
    this.loadDataInParallel()
    
  },

  onReady() {
    // 页面渲染完成后计算指示器位置
    setTimeout(() => {
      this.calculateIndicatorPosition()
    }, 100)
  },

  onShow() {
    // 页面显示时重新计算指示器位置，处理横竖屏切换等情况
    setTimeout(() => {
      this.calculateIndicatorPosition()
    }, 50)
    
    // 更新收藏状态，以防从其他页面返回时状态发生变化
    this.updateFavoriteState()
  },

  // 并行加载所有数据 - 详情页性能优化版
  async loadDataInParallel() {
    
    try {
      // 立即更新收藏状态（同步操作）
      this.updateFavoriteState()
      performanceMonitor.markPhase('page_load_detail', 'favorite_state_ready')
      
      // 并行执行所有数据加载任务
      const loadTasks = [
        this.loadStockDataWithMonitoring(),
        this.loadStableShareholdersWithMonitoring()
      ]
      
      // 使用Promise.allSettled确保部分失败不影响其他数据加载
      const results = await Promise.allSettled(loadTasks)
      
      // 处理加载结果
      this.handleDetailLoadResults(results)
      
      performanceMonitor.markPhase('page_load_detail', 'all_data_loaded')
      
      // 完成详情页加载监控
      performanceMonitor.endTimer('page_load_detail', {
        pageName: 'detail',
        stockSymbol: this.data.stock.symbol,
        stockName: this.data.stock.name,
        dataType: this.data.currentDataType
      })
      
      
      // 检查内存使用
      performanceMonitor.checkMemoryUsage('detail_load')
      
    } catch (error) {
      console.error('[Detail] 并行数据加载失败:', error)
      performanceMonitor.reportPerformance('page_load_error', {
        pageName: 'detail',
        error: error.message,
        stockSymbol: this.data.stock.symbol
      })
    }
  },

  /**
   * 处理详情页数据加载结果
   * @param {Array} results Promise.allSettled的结果
   */
  handleDetailLoadResults(results) {
    const [stockDataResult, shareholdersResult] = results
    
    if (stockDataResult.status === 'rejected') {
      console.error('[Detail] 股票数据加载失败:', stockDataResult.reason)
      this.setData({ chartError: true })
    }
    
    if (shareholdersResult.status === 'rejected') {
      console.error('[Detail] 稳定股东数据加载失败:', shareholdersResult.reason)
      this.setData({ 'stableShareholders.error': true })
    }
  },

  /**
   * 带性能监控的股票数据加载
   */
  async loadStockDataWithMonitoring() {
    const startTime = Date.now()
    
    try {
      await this.loadStockData()
      const loadTime = Date.now() - startTime
      
    } catch (error) {
      const loadTime = Date.now() - startTime
      console.error('[Detail] 股票数据加载失败:', error)
      throw error
    }
  },

  /**
   * 带性能监控的稳定股东数据加载
   */
  async loadStableShareholdersWithMonitoring() {
    const startTime = Date.now()
    
    try {
      await this.loadStableShareholders()
      const loadTime = Date.now() - startTime
      
    } catch (error) {
      const loadTime = Date.now() - startTime
      console.error('[Detail] 稳定股东数据加载失败:', error)
      throw error
    }
  },

  // 加载股票数据
  async loadStockData() {
    try {
      // 只使用页面内的loading，不使用全局loading
      this.setData({ loading: true })
      
      if (this.data.currentDataType === 'marketCap') {
        await this.loadMarketCapData()
      } else {
        await this.loadTurnoverData()
      }
      
      // 确保指示器位置正确
      setTimeout(() => {
        this.calculateIndicatorPosition()
      }, 150)
      
      this.setData({ loading: false })
    } catch (error) {
      console.error('加载股票数据失败:', error)
      this.setData({ loading: false })
      util.showToast('加载失败，请重试')
    }
  },

  // 加载市值数据
  async loadMarketCapData() {
    const historyData = await stockAPI.getStockHistory(
      this.data.stock.symbol, 
      this.data.currentPeriod
    )
    
    
    // 格式化历史数据显示
    const formattedHistoryData = historyData.map(item => ({
      ...item,
      marketCapFormatted: stockAPI.formatMarketCap(item.marketCap)
    }))
    
    
    this.setData({
      historyData: formattedHistoryData
    })
    
    this.calculateStats(historyData)
    this.updateChart(historyData)
  },

  // 加载实际换手率数据
  async loadTurnoverData() {
    const { startDate, endDate } = stockAPI.generateDateRange(this.data.currentPeriod)
    
    const turnoverData = await stockAPI.getStockActualTurnover(
      this.data.stock.symbol,
      startDate,
      endDate
    )
    
    
    this.setData({
      turnoverData: turnoverData
    })
    
    this.calculateTurnoverStats(turnoverData.data)
    this.updateTurnoverChart(turnoverData.data)
  },

  // 计算统计信息
  calculateStats(data) {
    if (!data || data.length === 0) {
      return
    }

    
    const marketCaps = data.map(item => item.marketCap)
    const currentMarketCap = marketCaps[marketCaps.length - 1]
    const maxMarketCap = Math.max(...marketCaps)
    const minMarketCap = Math.min(...marketCaps)
    const avgMarketCap = marketCaps.reduce((sum, val) => sum + val, 0) / marketCaps.length
    
    // 计算当前市值分位（当前值在历史数据中的百分位）
    const sortedMarketCaps = [...marketCaps].sort((a, b) => a - b)
    // 计算有多少个值小于当前值
    const countBelow = sortedMarketCaps.filter(val => val < currentMarketCap).length
    // 分位数 = 小于当前值的数据个数 / 总数据个数 * 100
    const percentile = ((countBelow / marketCaps.length) * 100).toFixed(1)


    const statsData = {
      currentMarketCap,
      maxMarketCap,
      minMarketCap,
      avgMarketCap: Math.floor(avgMarketCap),
      percentile: percentile, // 替换changePercent
      // 格式化显示的值
      currentMarketCapFormatted: stockAPI.formatMarketCap(currentMarketCap),
      maxMarketCapFormatted: stockAPI.formatMarketCap(maxMarketCap),
      minMarketCapFormatted: stockAPI.formatMarketCap(minMarketCap)
    }
    

    this.setData({
      stats: statsData
    })
  },

  // 加载稳定股东数据
  async loadStableShareholders() {
    try {
      this.setData({
        'stableShareholders.loading': true,
        'stableShareholders.error': false
      })
      
      const shareholdersData = await stockAPI.getStableShareholders(this.data.stock.symbol)
      
      this.setData({
        'stableShareholders.data': shareholdersData,
        'stableShareholders.loading': false
      })
    } catch (error) {
      console.error('加载稳定股东数据失败:', error)
      this.setData({
        'stableShareholders.loading': false,
        'stableShareholders.error': true
      })
      // 不显示错误提示，静默失败
    }
  },

  // 计算实际换手率统计信息
  calculateTurnoverStats(data) {
    if (!data || data.length === 0) {
      return
    }

    
    const turnovers = data.map(item => item.actual_turnover)
    const currentTurnover = turnovers[turnovers.length - 1]
    const maxTurnover = Math.max(...turnovers)
    const minTurnover = Math.min(...turnovers)
    
    // 计算当前实际换手率分位（当前值在历史数据中的百分位）
    const sortedTurnovers = [...turnovers].sort((a, b) => a - b)
    // 计算有多少个值小于当前值
    const countBelow = sortedTurnovers.filter(val => val < currentTurnover).length
    // 分位数 = 小于当前值的数据个数 / 总数据个数 * 100
    const percentile = ((countBelow / turnovers.length) * 100).toFixed(1)
    
    // 判断流动性类型
    const liquidityType = currentTurnover < 5 ? 'discount' : 'premium'
    const liquidityLabel = currentTurnover < 5 ? '低流动性' : '高流动性'

    const turnoverStatsData = {
      currentTurnover: currentTurnover.toFixed(2),
      maxTurnover: maxTurnover.toFixed(2),
      minTurnover: minTurnover.toFixed(2),
      percentile: percentile,
      stableRatio: this.data.turnoverData.stable_ratio.toFixed(1),
      liquidityType: liquidityType,
      liquidityLabel: liquidityLabel
    }
    

    this.setData({
      turnoverStats: turnoverStatsData
    })
  },

  // 更新图表
  updateChart(data) {
    if (!data || data.length === 0) return

    const dates = data.map(item => item.date)
    const marketCaps = data.map(item => item.marketCap)

    this.setData({
      chartData: marketCaps,
      chartXData: dates
    })
  },

  // 更新实际换手率图表
  updateTurnoverChart(data) {
    if (!data || data.length === 0) return

    const dates = data.map(item => item.date)
    const turnovers = data.map(item => item.actual_turnover)

    this.setData({
      chartData: turnovers,
      chartXData: dates
    })
  },

  // 计算指示器位置
  calculateIndicatorPosition() {
    const query = wx.createSelectorQuery().in(this)
    query.select('.period-selector-track').boundingClientRect((rect) => {
      if (rect && rect.width > 0) {
        const activeIndex = this.data.periods.findIndex(item => item.active)
        if (activeIndex === -1) return
        
        const windowInfo = wx.getWindowInfo()
        const pxToRpx = 750 / windowInfo.windowWidth
        
        const totalItems = this.data.periods.length
        const trackPadding = 6 // track的padding，单位px
        
        const availableWidth = rect.width - (trackPadding * 2)
        const itemWidth = availableWidth / totalItems
        const indicatorWidth = itemWidth // 指示器宽度与item宽度一致
        
        // 第一个按钮完全贴合左边，其他按钮按比例计算
        const indicatorPosition = activeIndex === 0 ? 0 : activeIndex * itemWidth + trackPadding
        
        this.setData({
          indicatorWidth: indicatorWidth * pxToRpx,
          indicatorPosition: indicatorPosition * pxToRpx
        })
      }
    }).exec()
  },

  // 更新指示器位置
  updateIndicatorPosition(activeIndex) {
    const query = wx.createSelectorQuery().in(this)
    query.select('.period-selector-track').boundingClientRect((rect) => {
      if (rect && rect.width > 0) {
        const windowInfo = wx.getWindowInfo()
        const pxToRpx = 750 / windowInfo.windowWidth
        
        const totalItems = this.data.periods.length
        const trackPadding = 6 // track的padding，单位px
        
        const availableWidth = rect.width - (trackPadding * 2)
        const itemWidth = availableWidth / totalItems
        const indicatorWidth = itemWidth // 指示器宽度与item宽度一致
        
        // 第一个按钮完全贴合左边，其他按钮按比例计算
        const indicatorPosition = activeIndex === 0 ? 0 : activeIndex * itemWidth + trackPadding
        
        this.setData({
          indicatorWidth: indicatorWidth * pxToRpx,
          indicatorPosition: indicatorPosition * pxToRpx
        })
      }
    }).exec()
  },

  // 切换数据类型
  async onDataTypeChange(e) {
    const dataType = e.currentTarget.dataset.type
    
    if (dataType === this.data.currentDataType) return

    const fromType = this.data.currentDataType
    
    // 埋点：数据类型切换
    track.dataTypeSwitch(fromType, dataType, this.data.stock.symbol, this.data.currentPeriod)

    // 触觉反馈
    wx.vibrateShort({
      type: 'light',
      fail: () => {}
    })

    // 更新选中状态
    const dataTypes = this.data.dataTypes.map(item => ({
      ...item,
      active: item.key === dataType
    }))

    this.setData({
      currentDataType: dataType,
      dataTypes,
      chartLoading: true
    })

    try {
      if (dataType === 'marketCap') {
        await this.loadMarketCapData()
      } else {
        await this.loadTurnoverData()
      }
      
      this.setData({ chartLoading: false })
      
      // 延迟重新计算指示器位置
      setTimeout(() => {
        this.calculateIndicatorPosition()
      }, 100)
    } catch (error) {
      console.error('切换数据类型失败:', error)
      util.showToast('加载失败，请重试')
      this.setData({ chartLoading: false })
    }
  },

  // 切换时间范围
  async onPeriodChange(e) {
    const period = e.currentTarget.dataset.period
    const index = parseInt(e.currentTarget.dataset.index)
    
    if (period === this.data.currentPeriod) return

    const fromPeriod = this.data.currentPeriod
    
    // 埋点：时间段切换
    track.periodSwitch(fromPeriod, period, this.data.stock.symbol, this.data.currentDataType)

    // 触觉反馈（静默失败，不影响主要功能）
    wx.vibrateShort({
      type: 'light',
      fail: () => {}
    })

    // 更新选中状态
    const periods = this.data.periods.map(item => ({
      ...item,
      active: item.key === period
    }))

    this.setData({
      currentPeriod: period,
      periods,
      chartLoading: true
    })

    // 立即更新指示器位置
    this.updateIndicatorPosition(index)

    try {
      if (this.data.currentDataType === 'marketCap') {
        await this.loadMarketCapData()
      } else {
        await this.loadTurnoverData()
      }
      
      this.setData({ chartLoading: false })
      
      // 延迟重新计算指示器位置，确保DOM更新完成
      setTimeout(() => {
        this.calculateIndicatorPosition()
      }, 100)
    } catch (error) {
      console.error('切换时间范围失败:', error)
      util.showToast('加载失败，请重试')
      this.setData({ chartLoading: false })
    }
  },


  // 分享
  onShareAppMessage() {
    const { stock } = this.data
    
    // 埋点：分享点击
    track.shareClick(stock.symbol, stock.name)
    
    return {
      title: `${stock.name}(${stock.symbol}) 市值走势`,
      path: `/pages/detail/detail?symbol=${stock.symbol}&name=${stock.name}&market=${stock.market}`
    }
  },

  // 收藏/取消收藏
  async onToggleFavorite() {
    const app = getApp()
    let favoriteStocks = app.globalData.favoriteStocks || []
    const { stock } = this.data
    
    const index = favoriteStocks.findIndex(item => item.symbol === stock.symbol)
    const isRemoving = index > -1
    
    // 先更新本地状态（乐观更新）
    if (isRemoving) {
      favoriteStocks.splice(index, 1)
    } else {
      favoriteStocks.push({
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        timestamp: Date.now()
      })
    }
    
    // 立即更新UI状态
    app.globalData.favoriteStocks = favoriteStocks
    util.setStorage('favorite_stocks', favoriteStocks)
    this.updateFavoriteState()
    
    // 调用服务端API
    try {
      if (isRemoving) {
        await stockAPI.removeFavorite(stock.symbol)
        
        // 埋点：取消自选
        track.favoriteRemove(stock.symbol, stock.name, 'detail')
        util.showToast('已取消自选', 'success')
      } else {
        const result = await stockAPI.addFavorite(stock.symbol)
        
        // 埋点：添加自选
        track.favoriteAdd(stock.symbol, stock.name, 'detail')
        
        // 根据API返回状态显示不同提示
        if (result.isNew) {
          util.showToast('已加入自选', 'success')
        } else {
          util.showToast('股票已在自选中', 'none')
        }
      }
      
      
      // 通知首页刷新自选列表
      this.notifyIndexPageRefresh()
      
    } catch (error) {
      console.error(`自选股${isRemoving ? '删除' : '添加'}失败:`, error.message)
      
      // 根据错误类型显示不同提示
      let errorMessage = ''
      if (error.message.includes('股票代码不存在')) {
        errorMessage = '股票代码不存在'
      } else if (error.message.includes('timeout') || error.message.includes('超时')) {
        errorMessage = '网络超时，请重试'
      } else {
        errorMessage = `${isRemoving ? '取消' : '添加'}自选失败，请重试`
      }
      
      // 服务端操作失败，回滚本地状态
      if (isRemoving) {
        // 重新添加到本地
        favoriteStocks.push({
          symbol: stock.symbol,
          name: stock.name,
          market: stock.market,
          timestamp: Date.now()
        })
      } else {
        // 从本地移除
        const rollbackIndex = favoriteStocks.findIndex(item => item.symbol === stock.symbol)
        if (rollbackIndex > -1) {
          favoriteStocks.splice(rollbackIndex, 1)
        }
      }
      
      util.showToast(errorMessage, 'error')
      
      // 更新回滚后的状态
      app.globalData.favoriteStocks = favoriteStocks
      util.setStorage('favorite_stocks', favoriteStocks)
      this.updateFavoriteState()
    }
  },

  // 更新收藏状态
  updateFavoriteState() {
    const app = getApp()
    const favoriteStocks = app.globalData.favoriteStocks || []
    const isFavorited = favoriteStocks.some(item => item.symbol === this.data.stock.symbol)
    
    this.setData({
      isFavorited: isFavorited
    })
  },

  // 通知首页刷新自选列表
  notifyIndexPageRefresh() {
    const pages = getCurrentPages()
    
    // 查找首页实例
    const indexPage = pages.find(page => page.route === 'pages/index/index')
    
    if (indexPage && indexPage.loadFavorites) {
      // 异步调用，不阻塞当前操作
      setTimeout(() => {
        indexPage.loadFavorites()
      }, 100)
    }
  },

  // 检查是否已收藏（保留兼容性）
  isFavorite() {
    const app = getApp()
    const favoriteStocks = app.globalData.favoriteStocks || []
    return favoriteStocks.some(item => item.symbol === this.data.stock.symbol)
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadStockData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 页面卸载时处理（包括返回键和导航栏返回）
  onUnload() {
    this.clearPreviousPageSearchState()
  },

  // 自定义返回按钮处理
  onNavigationBarBackTap() {
    this.clearPreviousPageSearchState()
    wx.navigateBack()
  },

  // 清除上一页面的搜索状态
  clearPreviousPageSearchState() {
    try {
      const pages = getCurrentPages()
      if (pages.length >= 2) {
        const prevPage = pages[pages.length - 2]
        if (prevPage.route === 'pages/index/index' && prevPage.setData) {
          const fromPage = this.data.fromPage
          
          // 只有从搜索结果进入的才清除搜索状态
          if (fromPage === 'search') {
            prevPage.setData({
              keyword: '',
              searchResults: [],
              showResults: false
            })
            
            // 调用首页的setDefaultTab方法恢复默认tab
            if (prevPage.setDefaultTab) {
              prevPage.setDefaultTab()
            }
          }
          // 从其他列表（热门股票、最近查看、我的自选）进入的不做任何处理
          // 保持用户离开前的tab状态
        }
      }
    } catch (error) {
    }
  }
})