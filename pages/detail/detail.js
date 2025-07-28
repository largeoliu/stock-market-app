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
      { key: 'max', label: '上市至今', active: false }
    ],
    historyData: [],
    loading: true,
    chartLoading: false,
    
    // 统计信息
    stats: {
      currentMarketCap: 0,
      maxMarketCap: 0,
      minMarketCap: 0,
      avgMarketCap: 0,
      changePercent: 0,
      totalChange: 0
    },

    // 图表配置
    ec: {
      onInit: null
    },
    chartOptions: {}
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

    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const param = params[0]
          const marketCap = stockAPI.formatMarketCap(param.value)
          return `${param.name}<br/>市值: ${marketCap}`
        }
      },
      grid: {
        left: 40,
        right: 40,
        top: 40,
        bottom: 60
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          formatter: (value) => {
            const date = new Date(value)
            return `${date.getMonth() + 1}/${date.getDate()}`
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => {
            return stockAPI.formatMarketCap(value)
          }
        }
      },
      series: [{
        data: marketCaps,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#1296db',
          width: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: 'rgba(18, 150, 219, 0.3)'
            }, {
              offset: 1,
              color: 'rgba(18, 150, 219, 0.05)'
            }]
          }
        }
      }]
    }

    this.setData({ chartOptions: option })
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

  // 图表初始化
  initChart(canvas, width, height, dpr) {
    const echarts = require('../../ec-canvas/echarts')
    
    const chart = echarts.init(canvas, null, {
      width: width,
      height: height,
      devicePixelRatio: dpr
    })
    
    canvas.setChart(chart)
    
    if (this.data.chartOptions && Object.keys(this.data.chartOptions).length > 0) {
      chart.setOption(this.data.chartOptions)
    }
    
    return chart
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