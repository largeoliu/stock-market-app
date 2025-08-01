// API工具类 - 重构版本
const util = require('./util.js')
const track = require('./track.js')

/**
 * 股票API服务类
 * 提供统一的API接口调用和数据处理功能
 */
class StockAPI {
  constructor() {
    this.timeout = 3000 // 设置为2秒超时
    this.maxRetries = 2
    
    // 根据环境自动切换service配置
    const isDevelopment = this.isDevelopmentEnvironment()
    
    this.baseConfig = {
      env: "prod-1gs83ryma8b2a51f",
      service: isDevelopment ? "test" : "bull"
    }
    
    console.log(`API环境: ${isDevelopment ? '开发环境(test)' : '生产环境(bull)'}`)
    
    // 初始化缓存
    this.initCache()
  }

  /**
   * 判断是否为开发环境
   * @returns {boolean} 是否为开发环境
   */
  isDevelopmentEnvironment() {
    // 方法1: 检查是否在微信开发者工具中
    try {
      if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
        const systemInfo = wx.getSystemInfoSync()
        // 开发者工具的platform通常为'devtools'
        if (systemInfo.platform === 'devtools') {
          return true
        }
      }
    } catch (error) {
      console.log('无法获取系统信息，使用默认环境判断')
    }

    // 方法2: 检查是否有开发环境标识
    try {
      const devFlag = wx.getStorageSync('__dev_mode__')
      if (devFlag) {
        return true
      }
    } catch (error) {
      // 忽略存储读取错误
    }

    // 方法3: 检查调试模式
    try {
      if (typeof __wxConfig !== 'undefined' && __wxConfig.debug) {
        return true
      }
    } catch (error) {
      // 忽略全局配置检查错误
    }

    // 默认为生产环境
    return false
  }

  /**
   * 初始化缓存配置 - 智能缓存策略
   */
  initCache() {
    // 添加缓存
    this.cache = new Map()
    
    // 智能缓存策略 - 根据数据特性设置不同的缓存时间
    this.cacheStrategies = {
      // 自选股相关 - 中等频率更新
      '/favorites': 5 * 60 * 1000,              // 5分钟
      
      // 股票历史数据 - 低频率更新
      '/stock_data': 30 * 60 * 1000,            // 30分钟
      '/stock_actual_turnover': 60 * 60 * 1000, // 1小时
      
      // 搜索和热门数据 - 中等频率更新
      '/stock_search': 10 * 60 * 1000,          // 10分钟
      '/stock_hot_search': 15 * 60 * 1000,      // 15分钟
      
      // 股东数据 - 低频率更新
      '/stock_stable_shareholders': 7 * 24 * 60 * 60 * 1000, // 7天
      
      // 默认缓存时间
      'default': 5 * 60 * 1000                  // 5分钟
    }
    
    // 性能优化：缓存命中率统计
    this.cacheStats = {
      hits: 0,
      misses: 0,
      totalRequests: 0
    }
  }

  /**
   * 手动设置开发模式（用于调试）
   * @param {boolean} isDev - 是否为开发模式
   */
  setDevelopmentMode(isDev) {
    try {
      if (isDev) {
        wx.setStorageSync('__dev_mode__', true)
      } else {
        wx.removeStorageSync('__dev_mode__')
      }
      
      // 更新配置
      this.baseConfig.service = isDev ? "test" : "bull"
      console.log(`手动切换API环境: ${isDev ? '开发环境(test)' : '生产环境(bull)'}`)
    } catch (error) {
      console.error('设置开发模式失败:', error)
    }
  }

  /**
   * 通用API请求方法 - 性能优化版本
   * @param {string} path - API路径
   * @param {Object} params - 请求参数
   * @param {number} retryCount - 重试次数
   * @returns {Promise} API响应数据
   */
  async request(path, params = {}, retryCount = 0) {
    const startTime = Date.now()
    let success = true
    let errorType = ''
    
    try {
      // 构建查询字符串
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&')
      
      const fullPath = queryString ? `${path}?${queryString}` : path
      
      console.log(`[API请求] ${fullPath}`)
      
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
            const responseTime = Date.now() - startTime
            console.log(`[API响应] ${path} - ${responseTime}ms:`, res.statusCode)
            
            if (res.statusCode === 200) {
              // 上报API性能
              track.apiPerformance(path, responseTime, true, '')
              resolve(res.data)
            } else {
              success = false
              errorType = `http_${res.statusCode}`
              console.error(`[API错误] ${path}: HTTP ${res.statusCode}`)
              reject(new Error(`请求失败: ${res.statusCode}`))
            }
          },
          fail: (err) => {
            const responseTime = Date.now() - startTime
            success = false
            
            const errorMsg = err.errMsg || 'unknown error'
            if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
              errorType = 'timeout'
              console.error(`[API超时] ${path} - ${responseTime}ms`)
              reject(new Error(`请求超时，请检查网络连接`))
            } else {
              errorType = 'network_error'
              console.error(`[API网络错误] ${path} - ${responseTime}ms:`, errorMsg)
              reject(new Error(`网络请求失败: ${errorMsg}`))
            }
            
            // 上报API错误性能
            track.apiPerformance(path, responseTime, false, errorType)
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
   * 智能获取缓存过期时间
   * @param {string} path - API路径
   * @returns {number} 缓存过期时间（毫秒）
   */
  getCacheExpiry(path) {
    // 根据API路径智能选择缓存时间
    for (const [pattern, expiry] of Object.entries(this.cacheStrategies)) {
      if (path.includes(pattern)) {
        return expiry
      }
    }
    return this.cacheStrategies.default
  }

  /**
   * 从缓存获取数据 - 智能缓存版本
   * @param {string} cacheKey - 缓存键
   * @param {number} customExpiry - 自定义过期时间（毫秒）
   * @returns {Object|null} 缓存的数据或null
   */
  getFromCache(cacheKey, customExpiry = null) {
    this.cacheStats.totalRequests++
    
    const cached = this.cache.get(cacheKey)
    if (!cached) {
      this.cacheStats.misses++
      return null
    }
    
    // 智能选择过期时间
    let expiryTime = customExpiry
    if (!expiryTime) {
      // 从缓存键中提取API路径
      const path = cacheKey.split('?')[0]
      expiryTime = this.getCacheExpiry(path)
    }
    
    // 检查是否过期
    const age = Date.now() - cached.timestamp
    if (age > expiryTime) {
      this.cache.delete(cacheKey)
      this.cacheStats.misses++
      
      // 上报缓存过期
      track.cacheHitRate(cacheKey, false, age)
      return null
    }
    
    this.cacheStats.hits++
    console.log(`[缓存命中] ${cacheKey} (年龄: ${Math.round(age/1000)}s)`)
    
    // 上报缓存命中
    track.cacheHitRate(cacheKey, true, age)
    
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
   * 清理过期缓存 - 智能清理版本
   */
  cleanExpiredCache() {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [key, value] of this.cache.entries()) {
      // 智能获取该缓存项的过期时间
      const path = key.split('?')[0]
      const expiryTime = this.getCacheExpiry(path)
      
      const age = now - value.timestamp
      if (age > expiryTime) {
        this.cache.delete(key)
        cleanedCount++
        console.log(`[缓存清理] ${key} (年龄: ${Math.round(age/1000)}s)`)
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[缓存清理] 清理了 ${cleanedCount} 个过期缓存项`)
    }
    
    // 定期上报缓存统计
    this.reportCacheStats()
  }

  /**
   * 上报缓存统计信息
   */
  reportCacheStats() {
    const hitRate = this.cacheStats.totalRequests > 0 
      ? (this.cacheStats.hits / this.cacheStats.totalRequests * 100).toFixed(2)
      : 0
    
    console.log(`[缓存统计] 命中率: ${hitRate}%, 命中: ${this.cacheStats.hits}, 未命中: ${this.cacheStats.misses}`)
    
    // 上报性能数据
    track.reportEvent('cache_performance', {
      hit_rate: parseFloat(hitRate),
      total_requests: this.cacheStats.totalRequests,
      cache_size: this.cache.size
    })
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
    
    // 处理新的API格式：{data: []}
    let dataArray = []
    if (rawData.data && Array.isArray(rawData.data)) {
      console.log('formatHotSearchData: 使用新的API格式 {data: []}')
      dataArray = rawData.data
    } else if (Array.isArray(rawData)) {
      console.log('formatHotSearchData: 数据格式为直接数组')
      dataArray = rawData
    } else if (rawData.results && Array.isArray(rawData.results)) {
      console.log('formatHotSearchData: 数据格式为 {results: []}')
      dataArray = rawData.results
    } else {
      console.log('formatHotSearchData: 未识别的数据格式')
      return { results: [] }
    }
    
    // 处理数据格式化
    if (dataArray.length > 0) {
      // 使用Map去重，以code作为唯一标识
      const uniqueMap = new Map()
      
      dataArray.forEach((item) => {
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
      
      console.log('formatHotSearchData: 去重前数量', dataArray.length)
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

    // 处理新的API响应格式: {dates: [], values: [], unit: "亿元"}
    if (rawData.dates && rawData.values && Array.isArray(rawData.dates) && Array.isArray(rawData.values)) {
      console.log('formatHistoryData: 使用新的API格式 {dates, values}')
      
      const formattedData = rawData.dates.map((date, index) => ({
        date: date,
        marketCap: parseFloat(rawData.values[index] || 0),
        price: 0 // 新格式中没有价格数据
      })).filter(item => !isNaN(item.marketCap) && item.marketCap > 0)
      
      console.log('formatHistoryData: 新格式数据长度:', formattedData.length)
      return formattedData
    }

    // 兼容旧的API响应格式
    let dataArray = []
    
    // 如果直接是数组
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

  /**
   * 添加自选股
   * @param {string} stockCode - 股票代码
   * @returns {Promise} 添加结果
   */
  async addFavorite(stockCode) {
    const cleanCode = this.cleanSymbol(stockCode)
    
    console.log('添加自选股请求参数:', { stock_code: cleanCode })
    
    return await new Promise((resolve, reject) => {
      wx.cloud.callContainer({
        config: {
          env: this.baseConfig.env
        },
        path: '/favorites',
        header: {
          "X-WX-SERVICE": this.baseConfig.service,
          "Content-Type": "application/json"
        },
        method: "POST",
        data: {
          stock_code: cleanCode
        },
        timeout: this.timeout,
        success: (res) => {
          console.log('添加自选股响应:', res)
          if (res.statusCode === 200) {
            // 操作成功（根据返回的message判断是新添加还是已存在）
            this.cache.delete('/favorites')
            const isNew = res.data.message === "添加自选成功"
            resolve({ ...res.data, statusCode: 200, isNew })
          } else if (res.statusCode === 404) {
            reject(new Error('股票代码不存在'))
          } else {
            reject(new Error(`添加自选股失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          console.error('添加自选股请求失败:', err)
          const errorMsg = err.errMsg || 'unknown error'
          if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
            reject(new Error(`请求超时，请检查网络连接`))
          } else {
            reject(new Error(`添加自选股失败: ${errorMsg}`))
          }
        }
      })
    })
  }

  /**
   * 获取自选股列表
   * @returns {Promise} 自选股数据
   */
  async getFavorites() {
    // 生成缓存键
    const cacheKey = '/favorites'
    
    // 防止并发请求 - 检查是否有正在进行的请求
    if (this._getFavoritesPromise) {
      console.log('复用正在进行的getFavorites请求')
      return this._getFavoritesPromise
    }
    
    // 尝试从缓存获取数据（使用较短的缓存时间，1分钟）
    const cachedData = this.getFromCache(cacheKey, 60 * 1000)
    if (cachedData) {
      return cachedData
    }
    
    console.log('获取自选股列表')
    
    // 创建请求Promise并缓存
    this._getFavoritesPromise = new Promise((resolve, reject) => {
      wx.cloud.callContainer({
        config: {
          env: this.baseConfig.env
        },
        path: '/favorites',
        header: {
          "X-WX-SERVICE": this.baseConfig.service
        },
        method: "GET",
        timeout: this.timeout,
        success: (res) => {
          console.log('获取自选股列表响应:', res)
          // 清除请求缓存
          this._getFavoritesPromise = null
          
          if (res.statusCode === 200) {
            const formattedData = this.formatFavoritesData(res.data)
            // 将结果存入缓存
            this.setToCache(cacheKey, formattedData)
            resolve(formattedData)
          } else {
            reject(new Error(`获取自选股列表失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          console.error('获取自选股列表请求失败:', err)
          // 清除请求缓存
          this._getFavoritesPromise = null
          
          const errorMsg = err.errMsg || 'unknown error'
          if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
            reject(new Error(`请求超时，请检查网络连接`))
          } else {
            reject(new Error(`获取自选股列表失败: ${errorMsg}`))
          }
        }
      })
    })
    
    return this._getFavoritesPromise
  }

  /**
   * 删除自选股
   * @param {string} stockCode - 股票代码
   * @returns {Promise} 删除结果
   */
  async removeFavorite(stockCode) {
    const cleanCode = this.cleanSymbol(stockCode)
    
    console.log('删除自选股请求参数:', { stock_code: cleanCode })
    
    return await new Promise((resolve, reject) => {
      wx.cloud.callContainer({
        config: {
          env: this.baseConfig.env
        },
        path: `/favorites/${cleanCode}`,
        header: {
          "X-WX-SERVICE": this.baseConfig.service
        },
        method: "DELETE",
        timeout: this.timeout,
        success: (res) => {
          console.log('删除自选股响应:', res)
          if (res.statusCode === 200) {
            // 操作成功（包括删除成功和股票不存在两种情况）
            this.cache.delete('/favorites')
            resolve(res.data)
          } else {
            reject(new Error(`删除自选股失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          console.error('删除自选股请求失败:', err)
          const errorMsg = err.errMsg || 'unknown error'
          if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
            reject(new Error(`请求超时，请检查网络连接`))
          } else {
            reject(new Error(`删除自选股失败: ${errorMsg}`))
          }
        }
      })
    })
  }

  /**
   * 格式化自选股数据
   * @param {Object} rawData - 原始自选股数据
   * @returns {Object} 格式化后的自选股数据
   */
  formatFavoritesData(rawData) {
    console.log('formatFavoritesData: 原始数据', rawData)
    
    if (!rawData || !rawData.favorites) {
      return { count: 0, favorites: [] }
    }

    const formattedFavorites = rawData.favorites.map(item => ({
      symbol: item.code,
      name: item.name,
      market: this.determineMarket(item.code),
      timestamp: new Date(item.created_at).getTime(), // 转换为时间戳便于排序
      created_at: item.created_at
    }))

    console.log('formatFavoritesData: 格式化后数据', formattedFavorites)

    return {
      count: rawData.count || formattedFavorites.length,
      favorites: formattedFavorites
    }
  }

  /**
   * 同步本地自选股到服务端
   * @returns {Promise} 同步结果
   */
  async syncLocalFavorites() {
    console.log('开始同步本地自选股到服务端')
    
    try {
      // 1. 获取服务端现有数据
      let serverFavorites
      try {
        serverFavorites = await this.getFavorites()
      } catch (error) {
        console.log('获取服务端数据失败，可能是首次使用:', error.message)
        serverFavorites = { count: 0, favorites: [] }
      }
      
      // 2. 获取本地数据
      const util = require('./util.js')
      const localFavorites = util.getStorage('favorite_stocks', [])
      
      console.log('本地自选股数量:', localFavorites.length)
      console.log('服务端自选股数量:', serverFavorites.count)
      
      if (localFavorites.length === 0) {
        console.log('本地无自选股，直接返回服务端数据')
        return serverFavorites
      }
      
      // 3. 找出需要上传的本地独有股票
      const serverCodes = new Set(serverFavorites.favorites.map(item => item.symbol))
      const needUpload = localFavorites.filter(stock => !serverCodes.has(stock.symbol))
      
      console.log('需要上传到服务端的股票数量:', needUpload.length)
      
      if (needUpload.length === 0) {
        console.log('无需上传数据，直接返回服务端数据')
        return {
          ...serverFavorites,
          syncResult: {
            uploaded: 0,
            failed: 0,
            total: 0
          }
        }
      }
      
      // 4. 控制并发，分批上传
      let successCount = 0
      let failCount = 0
      
      for (const stock of needUpload) {
        try {
          await this.addFavorite(stock.symbol)
          successCount++
          console.log(`成功上传: ${stock.name} (${stock.symbol})`)
          
          // 防止请求过快
          if (needUpload.length > 1) {
            await this.delay(300)
          }
        } catch (error) {
          failCount++
          console.error(`上传失败: ${stock.name} (${stock.symbol})`, error.message)
        }
      }
      
      console.log(`数据迁移完成: 成功${successCount}个, 失败${failCount}个`)
      
      // 5. 重新构建最终数据，复用服务端数据避免二次请求
      const uploadedStocks = needUpload.slice(0, successCount).map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market || this.determineMarket(stock.symbol),
        timestamp: Date.now(),
        created_at: new Date().toISOString()
      }))
      
      const finalData = {
        count: serverFavorites.count + successCount,
        favorites: [...serverFavorites.favorites, ...uploadedStocks]
      }
      
      // 清除缓存确保下次获取最新数据
      this.cache.delete('/favorites')
      
      return {
        ...finalData,
        syncResult: {
          uploaded: successCount,
          failed: failCount,
          total: needUpload.length
        }
      }
      
    } catch (error) {
      console.error('数据同步失败，使用本地数据:', error)
      
      // 转换本地数据格式以保持兼容性
      const util = require('./util.js')
      const localFavorites = util.getStorage('favorite_stocks', [])
      
      return {
        count: localFavorites.length,
        favorites: localFavorites.map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          market: stock.market || this.determineMarket(stock.symbol),
          timestamp: stock.timestamp || Date.now(),
          created_at: new Date(stock.timestamp || Date.now()).toISOString()
        })),
        syncResult: {
          error: error.message,
          fallbackToLocal: true
        }
      }
    }
  }
}

// 导出单例
const stockAPI = new StockAPI()
module.exports = stockAPI