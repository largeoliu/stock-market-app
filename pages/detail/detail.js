// pages/detail/detail.js
const stockAPI = require('../../utils/api.js')
const util = require('../../utils/util.js')

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
    loading: true,
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
    const { symbol, name, market } = options
    
    // 获取屏幕宽度
    const systemInfo = wx.getSystemInfoSync()
    const screenWidth = systemInfo.windowWidth
    
    this.setData({
      stock: {
        symbol: symbol || '',
        name: name || '',
        market: market || ''
      },
      screenWidth: screenWidth
    })

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: name || symbol || '股票详情'
    })

    this.loadStockData()
    this.loadStableShareholders()
    this.updateFavoriteState()
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

  // 加载股票数据
  async loadStockData() {
    try {
      util.showLoading('加载中...')
      
      if (this.data.currentDataType === 'marketCap') {
        await this.loadMarketCapData()
      } else {
        await this.loadTurnoverData()
      }
      
      // 确保指示器位置正确
      setTimeout(() => {
        this.calculateIndicatorPosition()
      }, 150)
      
      util.hideLoading()
    } catch (error) {
      console.error('加载股票数据失败:', error)
      util.hideLoading()
      util.showToast('加载失败，请重试')
      this.setData({ loading: false })
    }
  },

  // 加载市值数据
  async loadMarketCapData() {
    const historyData = await stockAPI.getStockHistory(
      this.data.stock.symbol, 
      this.data.currentPeriod
    )
    
    console.log('获取到的历史数据:', historyData)
    console.log('数据长度:', historyData.length)
    
    // 格式化历史数据显示
    const formattedHistoryData = historyData.map(item => ({
      ...item,
      marketCapFormatted: stockAPI.formatMarketCap(item.marketCap)
    }))
    
    console.log('格式化后的数据:', formattedHistoryData.slice(0, 3))
    
    this.setData({
      historyData: formattedHistoryData,
      loading: false
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
    
    console.log('获取到的实际换手率数据:', turnoverData)
    
    this.setData({
      turnoverData: turnoverData,
      loading: false
    })
    
    this.calculateTurnoverStats(turnoverData.data)
    this.updateTurnoverChart(turnoverData.data)
  },

  // 计算统计信息
  calculateStats(data) {
    if (!data || data.length === 0) {
      console.log('calculateStats: 没有数据')
      return
    }

    console.log('calculateStats: 开始计算统计信息，数据长度:', data.length)
    
    const marketCaps = data.map(item => item.marketCap)
    const currentMarketCap = marketCaps[marketCaps.length - 1]
    const maxMarketCap = Math.max(...marketCaps)
    const minMarketCap = Math.min(...marketCaps)
    const avgMarketCap = marketCaps.reduce((sum, val) => sum + val, 0) / marketCaps.length
    
    console.log('市值数据:', {
      currentMarketCap,
      maxMarketCap,
      minMarketCap,
      avgMarketCap
    })
    
    // 计算当前市值分位（当前值在历史数据中的百分位）
    const sortedMarketCaps = [...marketCaps].sort((a, b) => a - b)
    const currentIndex = sortedMarketCaps.findIndex(val => val >= currentMarketCap)
    const percentile = ((currentIndex / (sortedMarketCaps.length - 1)) * 100).toFixed(1)

    console.log('计算的分位数:', percentile)

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
    
    console.log('格式化后的统计数据:', statsData)

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
      console.log('稳定股东数据:', shareholdersData)
      
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
      console.log('calculateTurnoverStats: 没有数据')
      return
    }

    console.log('calculateTurnoverStats: 开始计算实际换手率统计信息，数据长度:', data.length)
    
    const turnovers = data.map(item => item.actual_turnover)
    const currentTurnover = turnovers[turnovers.length - 1]
    const maxTurnover = Math.max(...turnovers)
    const minTurnover = Math.min(...turnovers)
    const avgTurnover = turnovers.reduce((sum, val) => sum + val, 0) / turnovers.length
    
    console.log('实际换手率数据:', {
      currentTurnover,
      maxTurnover,
      minTurnover,
      avgTurnover
    })

    const turnoverStatsData = {
      currentTurnover: currentTurnover.toFixed(2),
      maxTurnover: maxTurnover.toFixed(2),
      minTurnover: minTurnover.toFixed(2),
      avgTurnover: avgTurnover.toFixed(2),
      stableRatio: this.data.turnoverData.stable_ratio.toFixed(1)
    }
    
    console.log('格式化后的实际换手率统计数据:', turnoverStatsData)

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
        
        const systemInfo = wx.getSystemInfoSync()
        const pxToRpx = 750 / systemInfo.windowWidth
        
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
        const systemInfo = wx.getSystemInfoSync()
        const pxToRpx = 750 / systemInfo.windowWidth
        
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
    return {
      title: `${stock.name}(${stock.symbol}) 市值走势`,
      path: `/pages/detail/detail?symbol=${stock.symbol}&name=${stock.name}&market=${stock.market}`
    }
  },

  // 收藏/取消收藏
  onToggleFavorite() {
    const app = getApp()
    let favoriteStocks = app.globalData.favoriteStocks || []
    const { stock } = this.data
    
    const index = favoriteStocks.findIndex(item => item.symbol === stock.symbol)
    
    if (index > -1) {
      // 取消收藏
      favoriteStocks.splice(index, 1)
      util.showToast('已取消收藏', 'success')
    } else {
      // 添加收藏
      favoriteStocks.push({
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        timestamp: Date.now()
      })
      util.showToast('已添加收藏', 'success')
    }
    
    app.globalData.favoriteStocks = favoriteStocks
    util.setStorage('favorite_stocks', favoriteStocks)
    
    // 更新页面收藏状态
    this.updateFavoriteState()
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
  }
})