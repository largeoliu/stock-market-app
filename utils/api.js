// API 工具类
const util = require('./util.js')
const freeAPI = require('./free-api.js')

class StockAPI {
  constructor() {
    this.baseUrl = 'https://www.alphavantage.co/query' // 正确的Alpha Vantage端点
    this.apiKey = 'F4PUACM3GQ79PRXG' // Alpha Vantage API密钥
    this.timeout = 15000 // 增加超时时间到15秒
    this.cache = new Map() // 内存缓存
    this.maxRetries = 2 // 减少重试次数以避免API限制
  }

  // 封装请求方法（带重试机制）
  async request(params = {}, retryCount = 0) {
    try {
      return await new Promise((resolve, reject) => {
        wx.cloud.callContainer({
          "config": {
            "env": "prod-1gs83ryma8b2a51f"
          },
          "path": "/market_cap",
          "header": {
            "X-WX-SERVICE": "test"
          },
          "method": "GET",
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.data)
            } else {
              reject(new Error(`请求失败: ${res.statusCode}`))
            }
          },
          fail: (err) => {
            reject(new Error(`网络请求失败: ${err.errMsg}`))
          }
        })
      })
    } catch (error) {  
      if (retryCount < this.maxRetries) {
        console.log(`请求重试 ${retryCount + 1}/${this.maxRetries}:`, error.message)
        await this.delay(2000 * (retryCount + 1)) // 增加延迟时间
        return this.request(params, retryCount + 1)
      }
      throw error
    }
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 生成缓存key
  getCacheKey(type, params) {
    return `${type}_${JSON.stringify(params)}`
  }

  // 获取缓存数据
  getFromCache(key, maxAge = 5 * 60 * 1000) { // 默认5分钟缓存
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.data
    }
    return null
  }

  // 设置缓存数据
  setToCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    })
  }

  // 搜索股票（带缓存）
  async searchStock(keyword) {
    const cacheKey = this.getCacheKey('search', { keyword })
    
    // 先尝试从缓存获取
    const cached = this.getFromCache(cacheKey, 5 * 60 * 1000) // 搜索结果缓存5分钟
    if (cached) {
      return cached
    }

    try {
      // 首先尝试使用Alpha Vantage
      const result = await this.request({
        function: 'SYMBOL_SEARCH',
        keywords: keyword
      })
      
      const formattedResult = this.formatAlphaVantageSearchResult(result)
      
      // 缓存结果
      this.setToCache(cacheKey, formattedResult)
      return formattedResult
    } catch (error) {
      console.error('Alpha Vantage搜索失败:', error)
      
      try {
        // 备用：使用免费API
        console.log('尝试使用备用API搜索...')
        const freeResult = await freeAPI.searchStock(keyword)
        this.setToCache(cacheKey, freeResult)
        return freeResult
      } catch (freeError) {
        console.error('备用API也失败:', freeError)
        // 最后返回模拟数据
        const mockData = this.getMockSearchData(keyword)
        this.setToCache(cacheKey, mockData)
        return mockData
      }
    }
  }

  // 获取股票历史数据（带缓存）
  async getStockHistory(symbol, period = '1y') {
    const cacheKey = this.getCacheKey('history', { symbol, period });
    
    // 先尝试从本地存储获取
    const localCached = util.getStorage(`history_${symbol}_${period}`);
    if (localCached && Date.now() - localCached.timestamp < 30 * 60 * 1000) { // 30分钟本地缓存
      return localCached.data;
    }

    // 再尝试从内存缓存获取
    const cached = this.getFromCache(cacheKey, 10 * 60 * 1000); // 10分钟内存缓存
    if (cached) {
      return cached;
    }

    try {
      // 使用新的API参数
      const result = await this.request({
        symbol: symbol,
        period: period // 1y, 3y, 5y, 10y, max
      });
      
      const formattedResult = this.formatHistoryData(result);
      
      // 同时缓存到内存和本地存储
      this.setToCache(cacheKey, formattedResult);
      util.setStorage(`history_${symbol}_${period}`, {
        data: formattedResult,
        timestamp: Date.now()
      });
      
      return formattedResult;
    } catch (error) {
      console.error('获取历史数据失败:', error);
      
      try {
        // 备用：使用免费API
        console.log('尝试使用备用API获取历史数据...');
        const freeResult = await freeAPI.getStockHistory(symbol, period);
        
        // 缓存备用API的结果
        this.setToCache(cacheKey, freeResult);
        util.setStorage(`history_${symbol}_${period}`, {
          data: freeResult,
          timestamp: Date.now()
        });
        
        return freeResult;
      } catch (freeError) {
        console.error('备用API也失败:', freeError);
        // 最后返回模拟数据
        const mockData = this.getMockHistoryData(symbol, period);
        this.setToCache(cacheKey, mockData);
        return mockData;
      }
    }
  }

  // 格式化Alpha Vantage搜索结果
  formatAlphaVantageSearchResult(data) {
    if (!data || !data.bestMatches) return []
    
    return data.bestMatches.map(item => ({
      symbol: item['1. symbol'],
      name: item['2. name'],
      market: this.getMarketFromSymbol(item['1. symbol']),
      type: item['3. type'],
      region: item['4. region'],
      currency: item['8. currency']
    }))
  }

  // 根据股票代码判断市场
  getMarketFromSymbol(symbol) {
    if (symbol.includes('.SZ') || symbol.includes('.SS')) return 'A股'
    if (symbol.includes('.HK')) return '港股'
    if (symbol.includes('.TO') || symbol.includes('.TSE')) return '加拿大'
    if (symbol.includes('.L') || symbol.includes('.LON')) return '英国'
    return '美股' // 默认美股
  }

  // 根据时间周期获取输出大小
  getOutputSizeFromPeriod(period) {
    switch (period) {
      case '1y':
      case '3y':
        return 'compact' // 最近100个交易日
      case '5y':
      case '10y':
      case 'max':
        return 'full' // 完整历史数据
      default:
        return 'compact'
    }
  }

  // 格式化Alpha Vantage历史数据
  formatAlphaVantageHistoryData(data, period) {
    const timeSeries = data['Time Series (Daily)']
    if (!timeSeries) return []
    
    // 获取所有日期并排序
    const dates = Object.keys(timeSeries).sort()
    
    // 根据期间筛选数据
    const filteredDates = this.filterDatesByPeriod(dates, period)
    
    return filteredDates.map(date => {
      const dayData = timeSeries[date]
      const close = parseFloat(dayData['5. adjusted close'])
      const volume = parseInt(dayData['6. volume'])
      
      // 简化的市值计算（实际应该用流通股数）
      // 这里使用一个估算值，实际项目中需要获取真实的股本数据
      const estimatedShares = 1000000000 // 10亿股的估算
      const marketCap = close * estimatedShares
      
      return {
        date: date,
        price: close,
        volume: volume,
        marketCap: marketCap,
      }
    })
  }

  // 根据时间周期筛选日期
  filterDatesByPeriod(dates, period) {
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case '3y':
        startDate.setFullYear(now.getFullYear() - 3)
        break
      case '5y':
        startDate.setFullYear(now.getFullYear() - 5)
        break
      case '10y':
        startDate.setFullYear(now.getFullYear() - 10)
        break
      case 'max':
        return dates // 返回所有数据
      default:
        startDate.setFullYear(now.getFullYear() - 1)
    }
    
    const startDateStr = startDate.toISOString().split('T')[0]
    return dates.filter(date => date >= startDateStr)
  }

  // 格式化搜索结果（保留旧方法兼容性）
  formatSearchResult(data) {
    if (!data || !data.results) return []
    
    return data.results.map(item => ({
      symbol: item.symbol,
      name: item.name,
      market: item.market,
      price: item.price,
      change: item.change,
      changePercent: item.changePercent
    }))
  }

  // 格式化历史数据
  formatHistoryData(data) {
    if (!data || !data.data) return []
    
    // 根据新的返回格式处理数据
    // data.data 是一个包含市值的数组，单位是亿
    const now = new Date();
    const marketCapData = [];
    
    // 为每个数据点生成日期，这里假设数据是按周返回的
    data.data.forEach((marketCap, index) => {
      // 从当前日期开始，每周减去一周
      const date = new Date(now.getTime() - (data.data.length - 1 - index) * 7 * 24 * 60 * 60 * 1000);
      const formattedDate = date.toISOString().split('T')[0];
      
      // 将亿转换为具体的市值数值
      const marketCapValue = parseFloat(marketCap) * 100000000;
      
      marketCapData.push({
        date: formattedDate,
        marketCap: marketCapValue,
        price: marketCapValue / 1000000000, // 简化的股价计算
        volume: Math.floor(Math.random() * 1000000000) // 随机生成交易量
      });
    });
    
    return marketCapData;
  }

  // 模拟搜索数据（用于演示）
  getMockSearchData(keyword) {
    const mockData = [
      {
        symbol: '000001.SZ',
        name: '平安银行',
        market: 'A股',
        price: 12.50,
        change: 0.15,
        changePercent: 1.22
      },
      {
        symbol: '00700.HK',
        name: '腾讯控股',
        market: '港股',
        price: 368.20,
        change: -5.80,
        changePercent: -1.55
      },
      {
        symbol: 'AAPL',
        name: '苹果公司',
        market: '美股',
        price: 175.43,
        change: 2.15,
        changePercent: 1.24
      }
    ]
    
    return mockData.filter(item => 
      item.name.includes(keyword) || 
      item.symbol.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  // 模拟历史数据（用于演示）
  getMockHistoryData(symbol, period) {
    // 使用symbol参数来生成不同的基础数据
    const symbolHash = symbol.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    const now = new Date()
    const data = []
    let days = 365
    
    switch (period) {
      case '3y':
        days = 365 * 3
        break
      case '5y':
        days = 365 * 5
        break
      case '10y':
        days = 365 * 10
        break
      case 'max':
        days = 365 * 20
        break
    }
    
    // 生成模拟的历史市值数据
    let baseMarketCap = 1000000000000 + (Math.abs(symbolHash) % 500000000000) // 基于symbol生成不同的基础市值
    for (let i = days; i >= 0; i -= 7) { // 每周一个数据点
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const randomFactor = 0.8 + Math.random() * 0.4 // 0.8-1.2的随机波动
      const marketCap = Math.floor(baseMarketCap * randomFactor)
      
      data.push({
        date: date.toISOString().split('T')[0],
        marketCap: marketCap,
        price: Math.floor(marketCap / 1000000000), // 简化的价格计算
        volume: Math.floor(Math.random() * 1000000000)
      })
      
      baseMarketCap = marketCap // 基于上一个值进行波动
    }
    
    return data.sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  // 格式化市值显示
  formatMarketCap(value) {
    if (value >= 1000000000000) {
      return (value / 1000000000000).toFixed(2) + '万亿'
    } else if (value >= 100000000) {
      return (value / 100000000).toFixed(2) + '亿'
    } else if (value >= 10000) {
      return (value / 10000).toFixed(2) + '万'
    } else {
      return value.toString()
    }
  }

  // 格式化价格变化
  formatPriceChange(change, changePercent) {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`
  }
}

// 导出单例
const stockAPI = new StockAPI()
module.exports = stockAPI