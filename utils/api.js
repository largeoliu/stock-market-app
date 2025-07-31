// API工具类 - 重构版本
const util = require('./util.js')

/**
 * 股票API服务类
 * 提供统一的API接口调用和数据处理功能
 */
class StockAPI {
  constructor() {
    this.timeout = 1000 // 设置为1秒超时
    this.maxRetries = 2
    this.baseConfig = {
      env: "prod-1gs83ryma8b2a51f",
      service: "test"
    }
    // 添加缓存
    this.cache = new Map()
    this.cacheExpiry = 5 * 60 * 1000 // 缓存5分钟
    this.shareholdersCacheExpiry = 7 * 24 * 60 * 60 * 1000 // 股东数据缓存7天
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
          timeout: this.timeout, // 应用超时设置
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
            const errorMsg = err.errMsg || 'unknown error'
            if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
              reject(new Error(`请求超时，请检查网络连接`))
            } else {
              reject(new Error(`网络请求失败: ${errorMsg}`))
            }
          }
        })
      })
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`API重试 ${retryCount + 1}/${this.maxRetries} [${path}]:`, error.message)
        await this.delay(500 * (retryCount + 1)) // 减少重试延迟时间，第一次重试500ms，第二次1s
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
   * 生成缓存键
   * @param {string} path - API路径
   * @param {Object} params - 请求参数
   * @returns {string} 缓存键
   */
  generateCacheKey(path, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')
    return `${path}?${sortedParams}`
  }

  /**
   * 从缓存获取数据
   * @param {string} cacheKey - 缓存键
   * @param {number} customExpiry - 自定义过期时间（毫秒）
   * @returns {Object|null} 缓存的数据或null
   */
  getFromCache(cacheKey, customExpiry = null) {
    const cached = this.cache.get(cacheKey)
    if (!cached) return null
    
    // 使用自定义过期时间或默认过期时间
    const expiryTime = customExpiry || this.cacheExpiry
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > expiryTime) {
      this.cache.delete(cacheKey)
      return null
    }
    
    console.log(`从缓存获取数据: ${cacheKey}`)
    return cached.data
  }

  /**
   * 存储数据到缓存
   * @param {string} cacheKey - 缓存键
   * @param {Object} data - 要缓存的数据
   */
  setToCache(cacheKey, data) {
    this.cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    })
    console.log(`数据已缓存: ${cacheKey}`)
    
    // 清理过期缓存（避免内存泄漏）
    this.cleanExpiredCache()
  }

  /**
   * 清理过期缓存
   */
  cleanExpiredCache() {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      let isExpired = false
      
      // 根据缓存键判断使用哪种过期时间
      if (key.includes('/stock_stable_shareholders')) {
        isExpired = now - value.timestamp > this.shareholdersCacheExpiry
      } else {
        isExpired = now - value.timestamp > this.cacheExpiry
      }
      
      if (isExpired) {
        this.cache.delete(key)
        console.log(`清理过期缓存: ${key}`)
      }
    }
  }

  /**
   * 根据时间范围生成开始和结束日期
   * @param {string} period - 时间范围
   * @returns {Object} 包含startDate和endDate的对象
   */
  generateDateRange(period = '1y') {
    const now = new Date()
    const endDate = this.formatDate(now)
    let startDate
    
    switch (period) {
      case '1y':
        startDate = this.formatDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()))
        break
      case '3y':
        startDate = this.formatDate(new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()))
        break
      case '5y':
        startDate = this.formatDate(new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()))
        break
      case '10y':
        startDate = this.formatDate(new Date(now.getFullYear() - 10, now.getMonth(), now.getDate()))
        break
      case 'max':
        startDate = '20000101' // 默认从2000年开始
        break
      default:
        startDate = this.formatDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()))
    }
    
    return { startDate, endDate }
  }

  /**
   * 格式化日期为YYYYMMDD格式
   * @param {Date} date - 日期对象
   * @returns {string} 格式化后的日期字符串
   */
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
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
    
    // 生成缓存键
    const cacheKey = this.generateCacheKey('/stock_data', params)
    
    // 尝试从缓存获取数据
    const cachedData = this.getFromCache(cacheKey)
    if (cachedData) {
      return cachedData
    }
    
    console.log('股票历史数据请求参数:', params)
    
    const data = await this.request('/stock_data', params)
    const formattedData = this.formatHistoryData(data)
    
    // 将结果存入缓存
    this.setToCache(cacheKey, formattedData)
    
    return formattedData
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
    const data = await this.request('/stock_hot_search')
    return this.formatHotSearchData(data)
  }

  /**
   * 格式化热门搜索数据
   * @param {Array|Object} rawData - 原始热门搜索数据
   * @returns {Object} 格式化后的热门搜索数据
   */
  formatHotSearchData(rawData) {
    console.log('formatHotSearchData: 原始数据', rawData)
    
    // 处理新的API格式：直接返回数组
    if (Array.isArray(rawData)) {
      // 使用Map去重，以code作为唯一标识
      const uniqueMap = new Map()
      
      rawData.forEach((item) => {
        const code = item.code || item.symbol || item.stock_code
        if (code && !uniqueMap.has(code)) {
          uniqueMap.set(code, {
            name: item.name,
            rank: uniqueMap.size + 1, // 去重后重新计算排名
            changePercent: item.change_percent || '', // 新格式可能没有涨跌幅
            heatScore: item.heat_score || 0,
            symbol: code, // 使用code字段作为主要股票代码
            market: item.market || 'A股'
          })
        }
      })

      const formattedResults = Array.from(uniqueMap.values())
      
      console.log('formatHotSearchData: 去重前数量', rawData.length)
      console.log('formatHotSearchData: 去重后数量', formattedResults.length)
      console.log('formatHotSearchData: 格式化后数据', formattedResults.slice(0, 3))

      return {
        results: formattedResults
      }
    }
    
    // 兼容旧的API格式：包含results字段的对象
    if (rawData && rawData.results) {
      const formattedResults = rawData.results.map((item, index) => ({
        name: item.name,
        rank: item.rank || index + 1,
        changePercent: item.change_percent,
        heatScore: item.heat_score,
        symbol: item.symbol || item.code || item.stock_code || item.stock_symbol,
        market: item.market || 'A股'
      }))

      console.log('formatHotSearchData: 格式化后数据（旧格式）', formattedResults.slice(0, 3))

      return {
        ...rawData,
        results: formattedResults
      }
    }

    // 如果数据格式不匹配，返回空结果
    console.log('formatHotSearchData: 未识别的数据格式')
    return { results: [] }
  }

  /**
   * 获取稳定股东信息
   * @param {string} symbol - 股票代码
   * @returns {Promise} 稳定股东数据
   */
  async getStableShareholders(symbol) {
    const cleanSymbol = this.cleanSymbol(symbol)
    const params = { symbol: cleanSymbol }
    
    // 生成缓存键
    const cacheKey = this.generateCacheKey('/stock_stable_shareholders', params)
    
    // 尝试从缓存获取数据，使用股东数据的专门过期时间
    const cachedData = this.getFromCache(cacheKey, this.shareholdersCacheExpiry)
    if (cachedData) {
      return cachedData
    }
    
    console.log('稳定股东数据请求参数:', params)
    
    const data = await this.request('/stock_stable_shareholders', params)
    
    // 将结果存入缓存
    this.setToCache(cacheKey, data)
    
    return data
  }

  /**
   * 获取股票实际换手率历史数据
   * @param {string} symbol - 股票代码
   * @param {string} startDate - 开始日期 (格式：YYYYMMDD)
   * @param {string} endDate - 结束日期 (格式：YYYYMMDD)
   * @returns {Promise} 实际换手率数据
   */
  async getStockActualTurnover(symbol, startDate, endDate) {
    const cleanSymbol = this.cleanSymbol(symbol)
    
    const params = {
      symbol: cleanSymbol,
      start_date: startDate,
      end_date: endDate
    }
    
    // 生成缓存键
    const cacheKey = this.generateCacheKey('/stock_actual_turnover', params)
    
    // 尝试从缓存获取数据
    const cachedData = this.getFromCache(cacheKey)
    if (cachedData) {
      return cachedData
    }
    
    console.log('实际换手率请求参数:', params)
    
    const data = await this.request('/stock_actual_turnover', params)
    const formattedData = this.formatTurnoverData(data)
    
    // 将结果存入缓存
    this.setToCache(cacheKey, formattedData)
    
    return formattedData
  }

  /**
   * 格式化实际换手率数据
   * @param {Object} rawData - 原始实际换手率API数据
   * @returns {Object} 格式化后的实际换手率数据
   */
  formatTurnoverData(rawData) {
    console.log('formatTurnoverData: 开始格式化实际换手率数据', rawData)
    
    if (!rawData) {
      console.log('formatTurnoverData: 没有数据')
      return { symbol: '', stable_ratio: 0, data: [] }
    }

    // 处理API响应格式
    const result = {
      symbol: rawData.symbol || '',
      stable_ratio: parseFloat(rawData.stable_ratio || 0),
      data: []
    }

    // 格式化数据数组
    if (rawData.data && Array.isArray(rawData.data)) {
      result.data = rawData.data.map(item => ({
        date: item.date,
        original_turnover: parseFloat(item.original_turnover || 0),
        actual_turnover: parseFloat(item.actual_turnover || 0)
      })).filter(item => !isNaN(item.actual_turnover))
    }
    
    console.log('formatTurnoverData: 格式化后的数据长度:', result.data.length)
    console.log('formatTurnoverData: 稳定比例:', result.stable_ratio)
    
    return result
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