# API 接口文档

## 接口概览

股值通小程序使用RESTful API设计，所有接口返回JSON格式数据。

### 基础信息
- **基础URL**: 配置在 `utils/api-config.js`
- **请求方式**: GET/POST
- **数据格式**: JSON
- **字符编码**: UTF-8

## 核心接口

### 1. 股票搜索

#### 搜索股票
```http
GET /api/stock/search?keyword={keyword}
```

**参数**:
- `keyword` (string): 搜索关键词，支持股票代码或名称

**响应示例**:
```json
{
  "code": 200,
  "data": [
    {
      "symbol": "000001",
      "name": "平安银行",
      "market": "深市",
      "price": "12.50",
      "change": "0.15",
      "changePercent": "1.22"
    }
  ],
  "message": "success"
}
```

### 2. 热门股票

#### 获取热门搜索股票
```http
GET /api/stock/hot
```

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "results": [
      {
        "rank": 1,
        "name": "贵州茅台",
        "symbol": "600519",
        "market": "沪市",
        "changePercent": "+2.35%"
      }
    ]
  },
  "message": "success"
}
```

### 3. 历史数据

#### 获取股票历史市值数据
```http
GET /api/stock/history?symbol={symbol}&period={period}
```

**参数**:
- `symbol` (string): 股票代码
- `period` (string): 时间范围，可选值：`1y`, `3y`, `5y`, `10y`, `max`

**响应示例**:
```json
{
  "code": 200,
  "data": [
    {
      "date": "2023-01-01",
      "marketCap": 150000000000,
      "price": 12.50,
      "volume": 1000000
    }
  ],
  "message": "success"
}
```

### 4. 实际换手率

#### 获取实际换手率数据
```http
POST /api/stock/actual-turnover
```

**请求体**:
```json
{
  "symbol": "000001",
  "startDate": "2023-01-01",
  "endDate": "2024-01-01"
}
```

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "symbol": "000001",
    "stable_ratio": 65.2,
    "data": [
      {
        "date": "2023-01-01",
        "actual_turnover": 3.45
      }
    ]
  },
  "message": "success"
}
```

### 5. 稳定股东

#### 获取稳定股东信息
```http
GET /api/stock/stable-shareholders?symbol={symbol}
```

**参数**:
- `symbol` (string): 股票代码

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "symbol": "000001",
    "stable_ratio": 65.2,
    "total_shareholders": 120000,
    "stable_shareholders": 78240,
    "update_date": "2024-01-01"
  },
  "message": "success"
}
```

## API工具类

### 接口封装 (utils/api.js)

#### 主要方法

```javascript
/**
 * 搜索股票
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 股票列表
 */
async searchStock(keyword)

/**
 * 获取热门搜索股票
 * @returns {Promise<Object>} 热门股票数据
 */
async getHotSearchStocks()

/**
 * 获取股票历史数据
 * @param {string} symbol - 股票代码
 * @param {string} period - 时间范围
 * @returns {Promise<Array>} 历史数据
 */
async getStockHistory(symbol, period)

/**
 * 获取实际换手率
 * @param {string} symbol - 股票代码
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @returns {Promise<Object>} 换手率数据
 */
async getStockActualTurnover(symbol, startDate, endDate)

/**
 * 获取稳定股东信息
 * @param {string} symbol - 股票代码
 * @returns {Promise<Object>} 股东信息
 */
async getStableShareholders(symbol)
```

#### 工具方法

```javascript
/**
 * 格式化市值显示
 * @param {number} marketCap - 市值数值
 * @returns {string} 格式化后的字符串
 */
formatMarketCap(marketCap)

/**
 * 生成日期范围
 * @param {string} period - 时间范围
 * @returns {Object} {startDate, endDate}
 */
generateDateRange(period)

/**
 * 统一请求处理
 * @param {string} url - 请求地址
 * @param {Object} options - 请求配置
 * @returns {Promise} 请求结果
 */
request(url, options)
```

## 错误处理

### 错误码定义

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 200 | 成功 | 正常处理数据 |
| 400 | 参数错误 | 检查请求参数 |
| 401 | 未授权 | 重新登录 |
| 403 | 禁止访问 | 检查权限 |
| 404 | 接口不存在 | 检查接口地址 |
| 500 | 服务器错误 | 稍后重试 |
| 502 | 网关错误 | 检查网络连接 |
| 503 | 服务不可用 | 稍后重试 |

### 错误处理示例

```javascript
try {
  const result = await stockAPI.searchStock(keyword)
  // 处理成功数据
  this.setData({ searchResults: result })
} catch (error) {
  console.error('搜索失败:', error)
  
  // 根据错误类型处理
  if (error.code === 404) {
    util.showToast('股票不存在')
  } else if (error.code >= 500) {
    util.showToast('服务异常，请稍后重试')
  } else {
    util.showToast('搜索失败，请重试')
  }
  
  // 恢复UI状态
  this.setData({ loading: false })
}
```

## 数据格式规范

### 股票信息格式
```javascript
{
  symbol: "000001",      // 股票代码
  name: "平安银行",       // 股票名称  
  market: "深市",        // 交易市场
  price: "12.50",        // 当前价格
  change: "0.15",        // 涨跌额
  changePercent: "1.22"  // 涨跌幅
}
```

### 历史数据格式
```javascript
{
  date: "2023-01-01",           // 日期
  marketCap: 150000000000,      // 市值(元)
  price: 12.50,                 // 价格
  volume: 1000000,              // 成交量
  marketCapFormatted: "1500亿"  // 格式化市值
}
```

### 换手率数据格式
```javascript
{
  date: "2023-01-01",      // 日期
  actual_turnover: 3.45    // 实际换手率(%)
}
```

## 请求配置

### 网络请求配置
```javascript
// 请求超时时间
timeout: 10000

// 请求头设置
header: {
  'Content-Type': 'application/json',
  'User-Agent': 'StockApp/1.0.0'
}

// 重试机制
retry: {
  times: 3,        // 重试次数
  delay: 1000      // 重试间隔(ms)
}
```

### 域名配置
```javascript
// 开发环境
const DEV_BASE_URL = 'https://dev-api.example.com'

// 生产环境  
const PROD_BASE_URL = 'https://api.example.com'

// 当前环境
const BASE_URL = isDev ? DEV_BASE_URL : PROD_BASE_URL
```

## 缓存策略

### 数据缓存
```javascript
// 热门股票缓存(5分钟)
cacheKey: 'hot_stocks',
cacheTTL: 5 * 60 * 1000

// 搜索结果缓存(1分钟)
cacheKey: 'search_results',
cacheTTL: 1 * 60 * 1000

// 历史数据缓存(30分钟)
cacheKey: 'history_data',
cacheTTL: 30 * 60 * 1000
```

### 缓存实现
```javascript
// 设置缓存
setCache(key, data, ttl) {
  const cacheData = {
    data: data,
    timestamp: Date.now(),
    ttl: ttl
  }
  wx.setStorageSync(key, cacheData)
}

// 获取缓存
getCache(key) {
  const cacheData = wx.getStorageSync(key)
  if (!cacheData) return null
  
  const now = Date.now()
  if (now - cacheData.timestamp > cacheData.ttl) {
    wx.removeStorageSync(key)
    return null
  }
  
  return cacheData.data
}
```

## 测试接口

### Mock数据
开发阶段可使用Mock数据进行测试：

```javascript
// utils/api-mock.js
const mockData = {
  searchResults: [
    { symbol: '000001', name: '平安银行', market: '深市' },
    { symbol: '600036', name: '招商银行', market: '沪市' }
  ],
  
  hotStocks: [
    { rank: 1, name: '贵州茅台', symbol: '600519' },
    { rank: 2, name: '腾讯控股', symbol: '00700' }
  ]
}
```

### 接口测试
```bash
# 运行API测试
npm run test:api

# 测试特定接口
npm run test:api -- --grep "股票搜索"
```

---

详细的接口实现请参考 `utils/api.js` 文件。