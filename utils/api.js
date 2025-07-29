// API 工具类
const util = require('./util.js')

class StockAPI {
  constructor() {
    this.timeout = 15000
    this.maxRetries = 2
  }

  // 封装微信云托管market_cap请求
  async requestMarketCap(symbol, retryCount = 0) {
    try {
      // 处理股票代码格式，去掉市场后缀（如 .SZ, .HK 等）
      const cleanSymbol = symbol.split('.')[0];
      const path = `/market_cap?symbol=${encodeURIComponent(cleanSymbol)}`;
      console.log('原始股票代码:', symbol, '-> 清理后:', cleanSymbol);
      console.log('请求路径:', path);
      
      return await new Promise((resolve, reject) => {
        wx.cloud.callContainer({
          "config": {
            "env": "prod-1gs83ryma8b2a51f"
          },
          "path": path,
          "header": {
            "X-WX-SERVICE": "test"
          },
          "method": "GET",
          success: (res) => {
            console.log('API响应:', res);
            if (res.statusCode === 200) {
              resolve(res.data)
            } else {
              reject(new Error(`请求失败: ${res.statusCode}`))
            }
          },
          fail: (err) => {
            console.error('API请求失败:', err);
            reject(new Error(`网络请求失败: ${err.errMsg}`))
          }
        })
      })
    } catch (error) {  
      if (retryCount < this.maxRetries) {
        console.log(`请求重试 ${retryCount + 1}/${this.maxRetries}:`, error.message)
        await this.delay(2000 * (retryCount + 1))
        return this.requestMarketCap(symbol, retryCount + 1)
      }
      throw error
    }
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }


  // 搜索股票（使用Mock数据）
  async searchStock(keyword) {
    // 直接返回模拟数据
    return this.getMockSearchData(keyword)
  }

  // 获取股票历史数据
  async getStockHistory(symbol, period = '1y') {
    try {
      // 使用微信云托管market_cap接口，传递symbol参数
      console.log('正在获取股票历史数据:', symbol, period);
      const result = await this.requestMarketCap(symbol);
      const formattedResult = this.formatHistoryData(result);
      console.log('获取到的数据:', formattedResult.length, '个数据点');
      return formattedResult;
    } catch (error) {
      console.error('获取历史数据失败:', error);
      // 返回模拟数据
      console.log('使用模拟数据');
      return this.getMockHistoryData(symbol, period);
    }
  }


  // 格式化历史数据
  formatHistoryData(data) {
    // 处理各种可能的返回格式
    let marketCapArray = null;
    
    // 格式1: [number, [string, string, ...]]
    if (Array.isArray(data) && data.length >= 2 && Array.isArray(data[1])) {
      marketCapArray = data[1];
    }
    // 格式2: { data: [...] }
    else if (data && data.data && Array.isArray(data.data)) {
      marketCapArray = data.data;
    }
    // 格式3: 直接是数组
    else if (Array.isArray(data)) {
      // 检查是否第一个元素是数字，其余是字符串（市值数据）
      if (data.length > 1 && typeof data[0] === 'number') {
        marketCapArray = data.slice(1); // 去掉第一个数字
      } else {
        marketCapArray = data;
      }
    }
    else {
      console.log('数据格式不正确，返回空数组');
      return [];
    }
    
    // 根据新的返回格式处理数据
    // marketCapArray 是一个包含市值的数组，单位是亿
    const now = new Date();
    const marketCapData = [];
    
    // 为每个数据点生成日期，这里假设数据是按周返回的
    marketCapArray.forEach((marketCap, index) => {
      // 从当前日期开始，每周减去一周
      const date = new Date(now.getTime() - (marketCapArray.length - 1 - index) * 7 * 24 * 60 * 60 * 1000);
      const formattedDate = date.toISOString().split('T')[0];
      
      // 数据已经是亿为单位，直接使用
      const marketCapInYi = parseFloat(marketCap);
      
      marketCapData.push({
        date: formattedDate,
        marketCap: marketCapInYi, // 直接使用亿为单位的数值
        price: marketCapInYi / 10, // 简化的股价计算
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
    
    // 生成模拟的历史市值数据（使用亿为单位）
    let baseMarketCap = 100 + (Math.abs(symbolHash) % 500) // 基于symbol生成不同的基础市值（亿）
    for (let i = days; i >= 0; i -= 7) { // 每周一个数据点
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const randomFactor = 0.8 + Math.random() * 0.4 // 0.8-1.2的随机波动
      const marketCap = Math.floor(baseMarketCap * randomFactor * 100) / 100 // 保疙2位小数
      
      data.push({
        date: date.toISOString().split('T')[0],
        marketCap: marketCap, // 亿为单位
        price: Math.floor(marketCap / 10 * 100) / 100, // 简化的价格计算
        volume: Math.floor(Math.random() * 1000000000)
      })
      
      baseMarketCap = marketCap // 基于上一个值进行波动
    }
    
    return data.sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  // 格式化市值显示（统一使用亿为单位）
  formatMarketCap(value) {
    if (value >= 10000) {
      return (value / 10000).toFixed(2) + '万亿'
    } else {
      return value.toFixed(2) + '亿'
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