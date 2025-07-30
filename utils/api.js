// API工具类 - 重构版本
const util = require('./util.js')

/**
 * 股票API服务类
 * 提供统一的API接口调用和数据处理功能
 */
class StockAPI {
  constructor() {
    this.timeout = 15000
    this.maxRetries = 2
    this.baseConfig = {
      env: "prod-1gs83ryma8b2a51f",
      service: "test"
    }
  }

  /**
   * 通用API请求方法
   * @param {string} path - API路径
   * @param {Object} params - 请求参数
   * @param {number} retryCount - 重试次数
   * @returns {Promise} API响应数据
   */
  async request(path, params = {}, retryCount = 0) {
    try {
      // 构建查询字符串
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&')
      
      const fullPath = queryString ? `${path}?${queryString}` : path
      
      console.log(`API请求: ${fullPath}`)
      
      return await new Promise((resolve, reject) => {
        wx.cloud.callContainer({
          config: {
            env: this.baseConfig.env
          },
          path: fullPath,
          header: {
            "X-WX-SERVICE": this.baseConfig.service
          },
          method: "GET",
          success: (res) => {
            console.log(`API响应 [${path}]:`, res)
            console.log(`响应数据结构:`, JSON.stringify(res.data, null, 2))
            if (res.statusCode === 200) {
              resolve(res.data)
            } else {
              reject(new Error(`请求失败: ${res.statusCode}`))
            }
          },
          fail: (err) => {
            console.error(`API请求失败 [${path}]:`, err)
            reject(new Error(`网络请求失败: ${err.errMsg}`))
          }
        })
      })
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`API重试 ${retryCount + 1}/${this.maxRetries} [${path}]:`, error.message)
        await this.delay(2000 * (retryCount + 1))
        return this.request(path, params, retryCount + 1)
      }
      throw error
    }
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 清理股票代码（去掉市场后缀）
   * @param {string} symbol - 原始股票代码
   * @returns {string} 清理后的股票代码
   */
  cleanSymbol(symbol) {
    return symbol.split('.')[0]
  }

  /**
   * 获取股票历史数据
   * @param {string} symbol - 股票代码
   * @param {string} period - 时间周期
   * @returns {Promise} 历史数据
   */
  async getStockHistory(symbol, period = '1y') {
    const cleanSymbol = this.cleanSymbol(symbol)
    
    // 将UI的时间范围转换为API需要的格式
    const periodMap = {
      '1y': '近一年',
      '3y': '近三年', 
      '5y': '近五年',
      '10y': '近十年',
      'max': '全部'
    }
    
    const apiPeriod = periodMap[period] || period
    
    const params = {
      symbol: cleanSymbol,
      indicator: '总市值',
      period: apiPeriod
    }
    
    console.log('股票历史数据请求参数:', params)
    
    const data = await this.request('/stock_data', params)
    return this.formatHistoryData(data)
  }

  /**
   * 搜索股票
   * @param {string} keyword - 搜索关键词
   * @returns {Promise} 搜索结果
   */
  async searchStock(keyword) {
    const params = { keyword }
    const data = await this.request('/stock_search', params)
    return this.formatSearchData(data)
  }

  /**
   * 获取热门搜索股票
   * @returns {Promise} 热门搜索数据
   */
  async getHotSearchStocks() {
    return await this.request('/stock_hot_search')
  }

  /**
   * 获取稳定股东信息
   * @param {string} symbol - 股票代码
   * @returns {Promise} 稳定股东数据
   */
  async getStableShareholders(symbol) {
    const cleanSymbol = this.cleanSymbol(symbol)
    const params = { symbol: cleanSymbol }
    return await this.request('/stock_stable_shareholders', params)
  }

  /**
   * 格式化历史数据
   * @param {Object} rawData - 原始API数据
   * @returns {Array} 格式化后的历史数据
   */
  formatHistoryData(rawData) {
    console.log('formatHistoryData: 开始格式化数据', rawData)
    
    if (!rawData) {
      console.log('formatHistoryData: 没有数据')
      return []
    }

    // 处理不同的API响应格式
    let dataArray = []
    
    // 如果直接是数组（新的API响应格式）
    if (Array.isArray(rawData)) {
      console.log('formatHistoryData: 数据格式为直接数组')
      dataArray = rawData
    }
    // 如果是包装在data字段中的数组
    else if (rawData.data && Array.isArray(rawData.data)) {
      console.log('formatHistoryData: 数据格式为 rawData.data 数组')
      dataArray = rawData.data
    } 
    // 如果是嵌套的data.data结构
    else if (rawData.data && rawData.data.data && Array.isArray(rawData.data.data)) {
      console.log('formatHistoryData: 数据格式为 rawData.data.data 数组')
      dataArray = rawData.data.data
    } 
    // 如果是results结构
    else if (rawData.data && rawData.data.results && Array.isArray(rawData.data.results)) {
      console.log('formatHistoryData: 数据格式为 rawData.data.results 数组')
      dataArray = rawData.data.results
    } 
    else {
      console.log('formatHistoryData: 未识别的数据格式', rawData)
      return []
    }

    console.log('formatHistoryData: 提取的数据数组长度:', dataArray.length)
    if (dataArray.length > 0) {
      console.log('formatHistoryData: 第一个数据项:', dataArray[0])
    }

    const formattedData = dataArray.map(item => ({
      date: item.date || item.time,
      marketCap: parseFloat(item.market_cap || item.value || 0),
      price: parseFloat(item.price || 0)
    })).filter(item => !isNaN(item.marketCap) && item.marketCap > 0)
    
    console.log('formatHistoryData: 格式化并过滤后的数据长度:', formattedData.length)
    
    return formattedData
  }

  /**
   * 格式化搜索数据
   * @param {Object} rawData - 原始搜索数据
   * @returns {Array} 格式化后的搜索结果
   */
  formatSearchData(rawData) {
    if (!rawData || !rawData.results) {
      return []
    }

    return rawData.results.map(item => ({
      symbol: item.code || item.symbol,
      name: item.name,
      market: this.determineMarket(item.code || item.symbol),
      price: parseFloat(item.price || 0),
      change: parseFloat(item.change || 0),
      changePercent: parseFloat(item.change_percent || 0)
    }))
  }

  /**
   * 根据股票代码判断市场
   * @param {string} code - 股票代码
   * @returns {string} 市场名称
   */
  determineMarket(code) {
    if (!code) return 'A股'
    
    if (code.includes('.HK')) return '港股'
    if (code.includes('.US') || /^[A-Z]+$/.test(code)) return '美股'
    return 'A股'
  }

  /**
   * 格式化市值显示（统一使用亿为单位）
   * @param {number} value - 市值数值
   * @returns {string} 格式化后的市值字符串
   */
  formatMarketCap(value) {
    if (typeof value !== 'number' || isNaN(value)) return '0'
    
    let result
    if (value >= 10000) {
      result = (value / 10000).toFixed(2) + '万'
    } else {
      result = value.toFixed(2)
    }
    
    return this.addCommas(result)
  }

  /**
   * 为数字添加千位分隔符
   * @param {string} str - 数字字符串
   * @returns {string} 添加分隔符后的字符串
   */
  addCommas(str) {
    const match = str.match(/^([0-9.]+)(.*)$/)
    if (!match) return str
    
    const [, numberPart, unitPart] = match
    const parts = numberPart.split('.')
    
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    
    let result = integerPart
    if (parts[1]) {
      result += '.' + parts[1]
    }
    result += unitPart
    
    return result
  }

  /**
   * 格式化价格变化
   * @param {number} change - 价格变化
   * @param {number} changePercent - 价格变化百分比
   * @returns {string} 格式化后的价格变化字符串
   */
  formatPriceChange(change, changePercent) {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`
  }
}

// 导出单例
const stockAPI = new StockAPI()
module.exports = stockAPI