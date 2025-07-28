// 免费股票API实现
const util = require('./util.js')

class FreeStockAPI {
  constructor() {
    this.cache = new Map()
    this.timeout = 10000
  }

  // 腾讯财经API - 适合A股和部分美股
  async searchStockTencent(keyword) {
    try {
      // 腾讯财经搜索接口
      const url = `https://smartbox.gtimg.cn/s3/?q=${encodeURIComponent(keyword)}&t=all`
      
      const response = await this.request(url)
      return this.parseTencentSearchResult(response)
    } catch (error) {
      console.error('腾讯财经搜索失败:', error)
      return []
    }
  }

  // 新浪财经API - 获取实时数据
  async getStockDataSina(symbols) {
    try {
      const symbolList = Array.isArray(symbols) ? symbols.join(',') : symbols
      const url = `https://hq.sinajs.cn/list=${symbolList}`
      
      const response = await this.request(url)
      return this.parseSinaStockData(response)
    } catch (error) {
      console.error('新浪财经数据获取失败:', error)
      return []
    }
  }

  // 网易财经API - 获取历史数据
  async getHistoryDataNetease(symbol, period = '1y') {
    try {
      const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const startDate = this.getStartDateFromPeriod(period).replace(/-/g, '')
      
      // 网易财经历史数据接口
      const url = `https://quotes.money.163.com/service/chddata.html?code=${symbol}&start=${startDate}&end=${endDate}&fields=TCLOSE;HIGH;LOW;TOPEN;LCLOSE;CHG;PCHG;TURNOVER;VOTURNOVER;VATURNOVER`
      
      const response = await this.request(url)
      return this.parseNeteaseHistoryData(response, symbol)
    } catch (error) {
      console.error('网易财经历史数据获取失败:', error)
      return []
    }
  }

  // 通用请求方法
  async request(url) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: url,
        method: 'GET',
        timeout: this.timeout,
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
  }

  // 解析腾讯财经搜索结果
  parseTencentSearchResult(data) {
    if (typeof data === 'string') {
      try {
        // 腾讯返回的是JSONP格式，需要提取JSON部分
        const jsonMatch = data.match(/\{.*\}/)
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        return []
      }
    }

    if (!data.data) return []

    return data.data.map(item => ({
      symbol: item.code,
      name: item.name,
      market: this.getMarketFromCode(item.code),
      type: item.type
    }))
  }

  // 解析新浪财经股票数据
  parseSinaStockData(data) {
    if (typeof data !== 'string') return []

    const lines = data.trim().split('\n')
    const results = []

    lines.forEach(line => {
      const match = line.match(/var hq_str_(.+?)="(.+)";/)
      if (match) {
        const symbol = match[1]
        const values = match[2].split(',')
        
        if (values.length >= 32) {
          results.push({
            symbol: symbol,
            name: values[0],
            price: parseFloat(values[3]),
            change: parseFloat(values[4]),
            changePercent: parseFloat(values[5]),
            volume: parseInt(values[8]),
            marketCap: parseFloat(values[3]) * parseInt(values[7]) // 简化计算
          })
        }
      }
    })

    return results
  }

  // 解析网易财经历史数据
  parseNeteaseHistoryData(data, symbol) {
    if (typeof data !== 'string') return []

    const lines = data.trim().split('\n')
    const results = []

    // 跳过标题行
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      if (values.length >= 11) {
        const close = parseFloat(values[3])
        const volume = parseInt(values[10])
        
        results.push({
          date: values[0],
          price: close,
          open: parseFloat(values[1]),
          high: parseFloat(values[2]),
          low: parseFloat(values[4]),
          volume: volume,
          marketCap: close * 1000000000 // 简化的市值计算
        })
      }
    }

    return results.reverse() // 按日期正序排列
  }

  // 根据代码判断市场
  getMarketFromCode(code) {
    if (code.startsWith('sh') || code.startsWith('sz')) return 'A股'
    if (code.startsWith('hk')) return '港股'
    if (code.startsWith('us_')) return '美股'
    return '其他'
  }

  // 根据周期获取开始日期
  getStartDateFromPeriod(period) {
    const now = new Date()
    const startDate = new Date()

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
      default:
        startDate.setFullYear(now.getFullYear() - 1)
    }

    return startDate.toISOString().split('T')[0]
  }

  // 综合搜索方法
  async searchStock(keyword) {
    try {
      // 优先使用腾讯财经搜索
      const tencentResults = await this.searchStockTencent(keyword)
      if (tencentResults.length > 0) {
        return tencentResults
      }

      // 如果腾讯搜索失败，返回模拟数据
      return this.getMockSearchData(keyword)
    } catch (error) {
      console.error('综合搜索失败:', error)
      return this.getMockSearchData(keyword)
    }
  }

  // 获取股票历史数据
  async getStockHistory(symbol, period) {
    try {
      // 优先使用网易财经获取历史数据
      const neteaseData = await this.getHistoryDataNetease(symbol, period)
      if (neteaseData.length > 0) {
        return neteaseData
      }

      // 如果网易数据获取失败，返回模拟数据
      return this.getMockHistoryData(symbol, period)
    } catch (error) {
      console.error('获取历史数据失败:', error)
      return this.getMockHistoryData(symbol, period)
    }
  }

  // 模拟搜索数据
  getMockSearchData(keyword) {
    const mockData = [
      {
        symbol: 'AAPL',
        name: '苹果公司',
        market: '美股',
        price: 175.43,
        change: 2.15,
        changePercent: 1.24
      },
      {
        symbol: 'TSLA',
        name: '特斯拉',
        market: '美股',
        price: 248.50,
        change: -3.20,
        changePercent: -1.27
      }
    ]
    
    return mockData.filter(item => 
      item.name.includes(keyword) || 
      item.symbol.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  // 模拟历史数据
  getMockHistoryData(symbol, period) {
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

    let basePrice = 100 + Math.random() * 400
    for (let i = days; i >= 0; i -= 7) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const randomFactor = 0.9 + Math.random() * 0.2
      const price = basePrice * randomFactor
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: price,
        volume: Math.floor(Math.random() * 1000000000),
        marketCap: price * 1000000000
      })
      
      basePrice = price
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
}

module.exports = new FreeStockAPI()