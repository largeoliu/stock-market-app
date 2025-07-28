# 部署指南

## 部署前准备

### 1. 微信小程序账号
- 前往 [微信公众平台](https://mp.weixin.qq.com/) 注册小程序账号
- 获取小程序的 AppID

### 2. 股票数据API
选择并配置一个股票数据API服务：

#### 推荐API选项：

**Alpha Vantage (推荐)**
- 免费额度：每分钟5次请求，每天500次
- 注册地址：https://www.alphavantage.co/
- 优点：数据准确，支持全球股票

**Yahoo Finance API**
- 免费但需要处理跨域
- 数据丰富，更新及时

**腾讯财经API**
- 适合A股和港股
- 响应速度快

### 3. 服务器域名配置
在微信公众平台配置request合法域名：
```
https://www.alphavantage.co
https://smartbox.gtimg.cn
https://hq.sinajs.cn
https://quotes.money.163.com
https://qt.gtimg.cn
```

**注意**：由于各API的访问限制不同，建议配置多个域名作为备用。

## 部署步骤

### 1. 修改配置

**修改 project.config.json**
```json
{
  "appid": "你的小程序AppID",
  "projectname": "stock-market-cap"
}
```

**配置API接口 (utils/api.js)**
```javascript
class StockAPI {
  constructor() {
    this.baseUrl = 'https://api.alphavantage.co' // 替换为实际API
    this.apiKey = 'YOUR_API_KEY' // 添加API密钥
  }
}
```

### 2. 添加图标资源
在 `images/` 目录下添加所需的图标文件：
- home.png / home-active.png
- search.png / search-active.png  
- heart.png / heart-active.png
- 其他功能图标

### 3. 本地测试
1. 使用微信开发者工具打开项目
2. 测试搜索功能
3. 测试股票详情页和图表显示
4. 测试收藏功能

### 4. 上传发布

**上传代码**
1. 在微信开发者工具中点击"上传"
2. 填写版本号和项目备注
3. 上传成功后在微信公众平台提交审核

**提交审核**
1. 登录微信公众平台
2. 进入"版本管理"
3. 提交审核并填写审核信息

## API集成示例

### Alpha Vantage集成
```javascript
// 搜索股票
async searchStock(keyword) {
  const result = await this.request('/query', {
    data: {
      function: 'SYMBOL_SEARCH',
      keywords: keyword,
      apikey: this.apiKey
    }
  })
  return this.formatAlphaVantageSearchResult(result)
}

// 获取股票历史数据
async getStockHistory(symbol, period) {
  const result = await this.request('/query', {
    data: {
      function: 'TIME_SERIES_DAILY',
      symbol: symbol,
      outputsize: period === 'max' ? 'full' : 'compact',
      apikey: this.apiKey
    }
  })
  return this.formatAlphaVantageHistoryData(result)
}
```

### Yahoo Finance集成
```javascript
// 搜索股票
async searchStock(keyword) {
  const result = await this.request('/v1/finance/search', {
    data: {
      q: keyword,
      lang: 'zh-CN',
      region: 'CN',
      quotesCount: 10
    }
  })
  return this.formatYahooSearchResult(result)
}
```

## 性能优化建议

### 1. 数据缓存
- 搜索结果缓存2分钟
- 历史数据缓存10分钟
- 使用本地存储缓存常用数据

### 2. 图表优化
- 大数据集时进行数据抽样
- 使用虚拟化技术处理长列表
- 延迟加载非关键图表

### 3. 网络优化
- 实现请求重试机制
- 合并相似请求
- 使用WebSocket获取实时数据（可选）

## 常见问题

### Q: Alpha Vantage API超时或限制？
A: 
1. 检查API密钥是否正确
2. Alpha Vantage免费版每分钟只能请求5次，每天500次
3. 项目已集成备用API（腾讯财经、新浪财经），会自动切换
4. 可以等待几分钟后重试，或考虑升级到付费版本

### Q: 图表不显示？
A: 检查ECharts组件是否正确引入，确保canvas权限已开启

### Q: API请求失败？
A: 
1. 检查域名是否已在微信公众平台配置
2. 确认网络连接正常
3. 查看控制台错误信息，可能是跨域或API限制问题

### Q: 搜索不到股票？
A: 
1. 尝试使用完整的股票代码（如：AAPL）
2. 确认股票市场支持（主要支持美股）
3. 检查API配置是否正确

### Q: 数据不准确？
A: 
1. 确认API数据源的准确性
2. 检查数据格式化逻辑
3. 注意：市值计算使用了简化算法，实际项目需要获取真实股本数据

### Q: 小程序审核不通过？
A: 确保遵守微信小程序审核规范，不涉及投资建议内容

## 监控和维护

### 1. 错误监控
```javascript
// 在app.js中添加全局错误处理
App({
  onError(error) {
    console.error('小程序错误:', error)
    // 上报错误到监控平台
  }
})
```

### 2. 用户反馈
- 添加意见反馈功能
- 监控用户使用数据
- 定期更新股票数据源

## 更新发布流程

1. 本地开发和测试
2. 更新版本号
3. 上传代码到微信平台
4. 提交审核
5. 审核通过后发布
6. 监控发布后的运行状态

记住：遵守相关法律法规，明确声明数据仅供参考，不构成投资建议。