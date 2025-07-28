// API测试文件 - 在微信开发者工具控制台中运行

const testAlphaVantageAPI = () => {
  const apiKey = 'F4PUACM3GQ79PRXG'
  
  // 测试搜索API
  console.log('测试搜索API...')
  const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=AAPL&apikey=${apiKey}`
  
  wx.request({
    url: searchUrl,
    method: 'GET',
    success: (res) => {
      console.log('搜索API响应:', res.data)
      if (res.data.bestMatches) {
        console.log('搜索成功，找到', res.data.bestMatches.length, '个结果')
      } else if (res.data['Error Message']) {
        console.error('API错误:', res.data['Error Message'])
      } else if (res.data['Note']) {
        console.warn('API限制:', res.data['Note'])
      }
    },
    fail: (err) => {
      console.error('搜索API请求失败:', err)
    }
  })
  
  // 测试历史数据API
  setTimeout(() => {
    console.log('测试历史数据API...')
    const historyUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=AAPL&outputsize=compact&apikey=${apiKey}`
    
    wx.request({
      url: historyUrl,
      method: 'GET',
      success: (res) => {
        console.log('历史数据API响应键:', Object.keys(res.data))
        if (res.data['Time Series (Daily)']) {
          const dates = Object.keys(res.data['Time Series (Daily)'])
          console.log('历史数据成功，获得', dates.length, '天的数据')
          console.log('最新日期:', dates[0])
        } else if (res.data['Error Message']) {
          console.error('API错误:', res.data['Error Message'])
        } else if (res.data['Note']) {
          console.warn('API限制:', res.data['Note'])
        }
      },
      fail: (err) => {
        console.error('历史数据API请求失败:', err)
      }
    })
  }, 2000) // 延迟2秒避免API频率限制
}

// 测试不同的免费API选项
const testFreeApis = () => {
  console.log('测试免费API选项...')
  
  // 1. Yahoo Finance (可能需要代理)
  const yahooUrl = 'https://query1.finance.yahoo.com/v1/finance/search?q=AAPL'
  wx.request({
    url: yahooUrl,
    success: (res) => console.log('Yahoo Finance成功:', res.data),
    fail: (err) => console.log('Yahoo Finance失败:', err.errMsg)
  })
  
  // 2. 腾讯财经 (国内可直接访问)
  setTimeout(() => {
    const tencentUrl = 'https://qt.gtimg.cn/q=us_aapl'
    wx.request({
      url: tencentUrl,
      success: (res) => console.log('腾讯财经成功:', res.data),
      fail: (err) => console.log('腾讯财经失败:', err.errMsg)
    })
  }, 1000)
  
  // 3. 新浪财经
  setTimeout(() => {
    const sinaUrl = 'https://hq.sinajs.cn/list=gb_aapl'
    wx.request({
      url: sinaUrl,
      success: (res) => console.log('新浪财经成功:', res.data),
      fail: (err) => console.log('新浪财经失败:', err.errMsg)
    })
  }, 2000)
}

// 在小程序页面中调用这些函数进行测试
// testAlphaVantageAPI()
// testFreeApis()

module.exports = {
  testAlphaVantageAPI,
  testFreeApis
}