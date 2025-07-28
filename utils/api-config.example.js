// API配置示例文件
// 复制此文件为 api-config.js 并填入实际的API配置

// Alpha Vantage 配置
export const ALPHA_VANTAGE_CONFIG = {
  baseUrl: 'https://www.alphavantage.co',
  apiKey: 'YOUR_API_KEY', // 从 https://www.alphavantage.co/support/#api-key 获取
  endpoints: {
    search: '/query?function=SYMBOL_SEARCH',
    timeSeries: '/query?function=TIME_SERIES_DAILY',
    overview: '/query?function=OVERVIEW'
  }
}

// Yahoo Finance 配置
export const YAHOO_FINANCE_CONFIG = {
  baseUrl: 'https://query1.finance.yahoo.com',
  endpoints: {
    search: '/v1/finance/search',
    chart: '/v8/finance/chart',
    quote: '/v7/finance/quote'
  }
}

// 腾讯财经配置
export const TENCENT_FINANCE_CONFIG = {
  baseUrl: 'https://qt.gtimg.cn',
  endpoints: {
    search: '/q=s_',
    realtime: '/q=',
    history: '/q=r_'
  }
}

// API 使用示例

// Alpha Vantage 实现示例
class AlphaVantageAPI {
  constructor(config) {
    this.config = config
  }

  // 搜索股票
  async searchStock(keyword) {
    const url = `${this.config.baseUrl}${this.config.endpoints.search}&keywords=${keyword}&apikey=${this.config.apiKey}`
    
    const response = await wx.request({ url })
    const data = response.data
    
    if (!data.bestMatches) return []
    
    return data.bestMatches.map(item => ({
      symbol: item['1. symbol'],
      name: item['2. name'],
      market: this.getMarketFromSymbol(item['1. symbol']),
      type: item['3. type'],
      region: item['4. region']
    }))
  }

  // 获取历史数据
  async getStockHistory(symbol, period = 'compact') {
    const url = `${this.config.baseUrl}${this.config.endpoints.timeSeries}&symbol=${symbol}&outputsize=${period}&apikey=${this.config.apiKey}`
    
    const response = await wx.request({ url })
    const data = response.data
    
    const timeSeries = data['Time Series (Daily)']
    if (!timeSeries) return []
    
    return Object.entries(timeSeries).map(([date, values]) => ({
      date: date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'])
    })).reverse() // 按日期正序排列
  }

  getMarketFromSymbol(symbol) {
    if (symbol.includes('.SZ') || symbol.includes('.SS')) return 'A股'
    if (symbol.includes('.HK')) return '港股'
    return '美股'
  }
}

// Yahoo Finance 实现示例
class YahooFinanceAPI {
  constructor(config) {
    this.config = config
  }

  // 搜索股票
  async searchStock(keyword) {
    const url = `${this.config.baseUrl}${this.config.endpoints.search}?q=${encodeURIComponent(keyword)}`
    
    const response = await wx.request({ url })
    const data = response.data
    
    if (!data.quotes) return []
    
    return data.quotes.map(item => ({
      symbol: item.symbol,
      name: item.shortname || item.longname,
      market: this.getMarketFromExchange(item.exchange),
      exchange: item.exchange
    }))
  }

  // 获取图表数据
  async getStockChart(symbol, range = '1y') {
    const url = `${this.config.baseUrl}${this.config.endpoints.chart}/${symbol}?range=${range}&interval=1d`
    
    const response = await wx.request({ url })
    const data = response.data
    
    const result = data.chart.result[0]
    if (!result) return []
    
    const timestamps = result.timestamp
    const quotes = result.indicators.quote[0]
    
    return timestamps.map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: quotes.open[index],
      high: quotes.high[index],
      low: quotes.low[index],
      close: quotes.close[index],
      volume: quotes.volume[index]
    }))
  }

  getMarketFromExchange(exchange) {
    const marketMap = {
      'SHZ': 'A股',
      'SHG': 'A股', 
      'HKG': '港股',
      'NMS': '美股',
      'NYQ': '美股',
      'PCX': '美股'
    }
    return marketMap[exchange] || '其他'
  }
}

// 腾讯财经实现示例（适合国内用户）
class TencentFinanceAPI {
  constructor(config) {
    this.config = config
  }

  // 搜索股票
  async searchStock(keyword) {
    // 腾讯财经的搜索接口相对复杂，需要根据实际情况调整
    const url = `${this.config.baseUrl}/q=s_${encodeURIComponent(keyword)}`
    
    const response = await wx.request({ url })
    // 解析返回的文本数据...
    
    return [] // 需要根据实际API响应格式实现
  }

  // 获取实时数据
  async getRealtimeData(symbols) {
    const symbolStr = symbols.join(',')
    const url = `${this.config.baseUrl}/q=${symbolStr}`
    
    const response = await wx.request({ url })
    // 解析返回的数据...
    
    return [] // 需要根据实际API响应格式实现
  }
}

// 使用方法示例：
// 
// 1. 复制此文件为 api-config.js
// 2. 填入你的API密钥和配置
// 3. 在 api.js 中导入并使用：
//
// import { ALPHA_VANTAGE_CONFIG, AlphaVantageAPI } from './api-config.js'
// 
// const alphaVantageAPI = new AlphaVantageAPI(ALPHA_VANTAGE_CONFIG)
// const searchResults = await alphaVantageAPI.searchStock('AAPL')

export {
  AlphaVantageAPI,
  YahooFinanceAPI,
  TencentFinanceAPI
}