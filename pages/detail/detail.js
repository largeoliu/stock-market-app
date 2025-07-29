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
    currentPeriod: '1y', // 当前选择的时间范围
    periods: [
      { key: '1y', label: '1年', active: true },
      { key: '3y', label: '3年', active: false },
      { key: '5y', label: '5年', active: false },
      { key: '10y', label: '10年', active: false },
      { key: 'max', label: '全部', active: false }
    ],
    // 滑动指示器位置和宽度（初始值基于5个等分的估算）
    indicatorPosition: 8, // 初始在第一个位置，加上track的padding
    indicatorWidth: 120, // 大概的宽度，会在页面渲染后重新计算
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
    }
  },

  onLoad(options) {
    const { symbol, name, market } = options
    
    this.setData({
      stock: {
        symbol: symbol || '',
        name: name || '',
        market: market || ''
      }
    })

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: name || symbol || '股票详情'
    })

    this.loadStockData()
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
  },

  // 加载股票数据
  async loadStockData() {
    try {
      util.showLoading('加载中...')
      
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
        historyData: formattedHistoryData,
        loading: false
      })
      
      this.calculateStats(historyData)
      this.updateChart(historyData)
      
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

  // 计算统计信息
  calculateStats(data) {
    if (!data || data.length === 0) return

    const marketCaps = data.map(item => item.marketCap)
    const currentMarketCap = marketCaps[marketCaps.length - 1]
    const firstMarketCap = marketCaps[0]
    const maxMarketCap = Math.max(...marketCaps)
    const minMarketCap = Math.min(...marketCaps)
    const avgMarketCap = marketCaps.reduce((sum, val) => sum + val, 0) / marketCaps.length
    
    const totalChange = currentMarketCap - firstMarketCap
    const changePercent = ((currentMarketCap - firstMarketCap) / firstMarketCap) * 100

    this.setData({
      stats: {
        currentMarketCap,
        maxMarketCap,
        minMarketCap,
        avgMarketCap: Math.floor(avgMarketCap),
        changePercent: changePercent.toFixed(2),
        totalChange,
        // 格式化显示的值
        currentMarketCapFormatted: stockAPI.formatMarketCap(currentMarketCap),
        maxMarketCapFormatted: stockAPI.formatMarketCap(maxMarketCap),
        minMarketCapFormatted: stockAPI.formatMarketCap(minMarketCap)
      }
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
        const trackPadding = 4 // track的padding，减少到4px，单位px
        
        const availableWidth = rect.width - (trackPadding * 2)
        const itemWidth = availableWidth / totalItems
        const indicatorWidth = itemWidth - 4 // 指示器宽度稍微小一点，留出边距
        const indicatorPosition = activeIndex * itemWidth + trackPadding + 2 // 向右偏移2px
        
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
        const trackPadding = 4 // track的padding，减少到4px，单位px
        
        const availableWidth = rect.width - (trackPadding * 2)
        const itemWidth = availableWidth / totalItems
        const indicatorWidth = itemWidth - 4 // 指示器宽度稍微小一点，留出边距
        const indicatorPosition = activeIndex * itemWidth + trackPadding + 2 // 向右偏移2px
        
        this.setData({
          indicatorWidth: indicatorWidth * pxToRpx,
          indicatorPosition: indicatorPosition * pxToRpx
        })
      }
    }).exec()
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
      const historyData = await stockAPI.getStockHistory(
        this.data.stock.symbol, 
        period
      )
      // 格式化历史数据显示
      const formattedHistoryData = historyData.map(item => ({
        ...item,
        marketCapFormatted: stockAPI.formatMarketCap(item.marketCap)
      }))
      
      this.setData({
        historyData: formattedHistoryData,
        chartLoading: false
      })
      
      this.calculateStats(historyData)
      this.updateChart(historyData)
      
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
  },

  // 检查是否已收藏
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