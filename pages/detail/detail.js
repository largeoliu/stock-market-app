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
      { key: '1y', label: '近一年', active: true },
      { key: '3y', label: '近三年', active: false },
      { key: '5y', label: '近五年', active: false },
      { key: '10y', label: '近十年', active: false },
      { key: 'max', label: '全部', active: false }
    ],
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

  // 切换时间范围
  async onPeriodChange(e) {
    const period = e.currentTarget.dataset.period
    
    if (period === this.data.currentPeriod) return

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