# 测试文档

## 测试架构

### 测试框架
- **Jest**: 单元测试框架
- **@types/jest**: TypeScript类型支持
- **自定义Mock**: 微信小程序API模拟

### 测试环境配置
```json
{
  "testEnvironment": "node",
  "setupFiles": ["<rootDir>/test/setup.js"],
  "collectCoverageFrom": [
    "utils/**/*.js",
    "pages/**/*.js",
    "!**/node_modules/**"
  ]
}
```

## 测试用例设计

### 工具函数测试 (test/utils/)

#### util.js 测试覆盖
```javascript
describe('util.js 工具函数测试', () => {
  describe('formatTime', () => {
    test('应能正确格式化日期')
    test('应能处理单位数的月份和日期')
  })
  
  describe('debounce', () => {
    test('应能正确防抖执行函数')
    test('应能传递参数给防抖函数')
  })
  
  describe('存储相关函数', () => {
    test('setStorage 应能正确设置存储')
    test('getStorage 应能正确获取存储的数据')
    test('获取不存在的键时应返回默认值')
    test('removeStorage 应能正确删除存储')
  })
  
  describe('Toast 相关函数', () => {
    test('showToast 应能显示成功提示')
    test('showToast 应能显示错误提示')
    test('showToast 默认显示普通提示')
  })
})
```

#### track.js 测试覆盖
```javascript
describe('Track 埋点工具测试', () => {
  describe('搜索相关埋点', () => {
    test('searchSubmit 应能正确上报搜索提交事件')
    test('searchResultClick 应能正确上报搜索结果点击事件')
    test('clearSearchHistory 应能正确上报清空搜索历史事件')
  })
  
  describe('自选股相关埋点', () => {
    test('favoriteAdd 应能正确上报添加自选事件')
    test('favoriteRemove 应能正确上报移除自选事件')
    test('clearFavorites 应能正确上报清空自选事件')
  })
  
  describe('错误处理', () => {
    test('当 wx.reportEvent 不存在时应静默失败')
    test('当 wx.reportEvent 抛出错误时应静默失败')
  })
})
```

### 页面逻辑测试 (test/pages/)

#### 首页测试 (index.test.js)
```javascript
describe('首页 (pages/index/index.js) 测试', () => {
  describe('页面初始化', () => {
    test('onLoad 应正确设置安全区域和初始化数据')
    test('setDefaultTab 有自选股时应设置为 favorites tab')
    test('setDefaultTab 无自选股时应保持 hot tab')
  })
  
  describe('搜索功能', () => {
    test('onInputChange 应正确处理输入变化')
    test('onClearInput 应清空搜索状态')
  })
  
  describe('Tab 切换功能', () => {
    test('onTabChange 应正确切换标签并触发埋点')
  })
  
  describe('删除功能', () => {
    test('deleteRecentItem 应正确删除最近查看记录')
    test('clearAllRecentSearches 应清空所有搜索记录')
  })
})
```

#### 详情页测试 (detail.test.js)
```javascript
describe('详情页 (pages/detail/detail.js) 测试', () => {
  describe('分位数计算', () => {
    test('calculateStats 应正确计算市值分位数')
    test('calculatePercentile 边界情况测试')
  })
  
  describe('时间范围切换', () => {
    test('onPeriodChange 应正确切换时间范围并触发埋点')
  })
  
  describe('收藏功能', () => {
    test('onToggleFavorite 应正确添加自选股')
    test('onToggleFavorite 应正确移除自选股')
  })
  
  describe('页面导航', () => {
    test('clearPreviousPageSearchState 应正确清除上一页面的搜索状态')
  })
})
```

## Mock设计

### 微信小程序API Mock
```javascript
// test/setup.js
global.wx = {
  // 界面交互
  showToast: jest.fn(),
  showModal: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  
  // 数据存储
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  
  // 页面导航
  navigateTo: jest.fn(),
  navigateBack: jest.fn(),
  setNavigationBarTitle: jest.fn(),
  
  // 系统信息
  getSystemInfoSync: jest.fn(() => ({
    windowWidth: 375,
    windowHeight: 667,
    safeArea: { top: 44, bottom: 0 },
    statusBarHeight: 44
  })),
  
  // 数据分析
  reportEvent: jest.fn(),
  
  // 设备功能
  vibrateShort: jest.fn()
}
```

### API接口Mock
```javascript
// test/__mocks__/api.js
const mockAPI = {
  searchStock: jest.fn().mockResolvedValue([
    { symbol: '000001', name: '平安银行', market: '深市' }
  ]),
  
  getHotSearchStocks: jest.fn().mockResolvedValue({
    results: [
      { rank: 1, name: '贵州茅台', symbol: '600519' }
    ]
  }),
  
  getStockHistory: jest.fn().mockResolvedValue([
    { date: '2023-01-01', marketCap: 150000000000 }
  ])
}

module.exports = mockAPI
```

## 测试数据

### 测试用例数据
```javascript
// 股票测试数据
const testStocks = [
  {
    symbol: '000001',
    name: '平安银行',
    market: '深市',
    price: '12.50',
    change: '0.15',
    changePercent: '1.22'
  },
  {
    symbol: '600036', 
    name: '招商银行',
    market: '沪市',
    price: '45.80',
    change: '-0.25',
    changePercent: '-0.54'
  }
]

// 历史数据测试
const testHistoryData = [
  { date: '2023-01-01', marketCap: 100000000000 },
  { date: '2023-02-01', marketCap: 110000000000 },
  { date: '2023-03-01', marketCap: 105000000000 },
  { date: '2023-04-01', marketCap: 115000000000 },
  { date: '2023-05-01', marketCap: 120000000000 }
]
```

### 边界测试数据
```javascript
// 分位数计算测试数据
const percentileTestCases = [
  {
    data: [80, 90, 100, 110, 120],
    current: 100,
    expected: '40.0'  // 2/5 * 100 = 40%
  },
  {
    data: [80, 90, 100, 110, 120],
    current: 80,
    expected: '0.0'   // 最小值
  },
  {
    data: [80, 90, 100, 110, 120],
    current: 120,
    expected: '80.0'  // 4/5 * 100 = 80%
  }
]
```

## 测试策略

### 单元测试原则
1. **独立性**: 每个测试用例相互独立
2. **可重复**: 测试结果可重复
3. **快速执行**: 单个测试用例执行时间<100ms
4. **清晰命名**: 测试名称明确表达测试意图

### 测试分类
```javascript
// 1. 正常路径测试
test('正常输入应返回正确结果', () => {
  // 测试函数正常工作流程
})

// 2. 边界值测试  
test('边界值输入应正确处理', () => {
  // 测试边界条件
})

// 3. 异常处理测试
test('异常输入应优雅处理', () => {
  // 测试错误处理逻辑
})

// 4. 交互测试
test('用户交互应触发正确响应', () => {
  // 测试用户操作响应
})
```

## 测试覆盖率

### 覆盖率要求
- **语句覆盖率**: >90%
- **分支覆盖率**: >85%  
- **函数覆盖率**: >95%
- **行覆盖率**: >90%

### 覆盖率报告
```bash
# 生成覆盖率报告
npm run test:coverage

# 查看详细报告
open coverage/lcov-report/index.html
```

### 覆盖率示例
```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|--------
utils/util.js       |   95.2  |   88.9   |  100.0  |   94.7
utils/track.js      |  100.0  |   92.3   |  100.0  |  100.0
pages/index/index.js|   87.5  |   82.1   |   91.7  |   86.9
pages/detail/detail.js|  89.3  |   79.2   |   88.9  |   88.6
--------------------|---------|----------|---------|--------
All files           |   92.1  |   85.2   |   94.4  |   91.8
```

## 测试工具

### 断言工具
```javascript
// Jest内置断言
expect(result).toBe(expected)
expect(result).toEqual(expected)
expect(result).toHaveLength(3)
expect(result).toContain(item)
expect(func).toHaveBeenCalled()
expect(func).toHaveBeenCalledWith(args)

// 自定义匹配器
expect.extend({
  toBeValidStock(received) {
    const pass = received.symbol && received.name
    return {
      message: () => `expected ${received} to be valid stock`,
      pass
    }
  }
})
```

### 异步测试
```javascript
// Promise测试
test('异步函数应返回正确结果', async () => {
  const result = await asyncFunction()
  expect(result).toEqual(expected)
})

// 超时测试
test('超时函数应在指定时间内完成', async () => {
  const result = await timeoutFunction()
  expect(result).toBeDefined()
}, 5000) // 5秒超时
```

### 模拟测试
```javascript
// 函数模拟
const mockFn = jest.fn()
mockFn.mockReturnValue('mock result')
mockFn.mockResolvedValue('async result')

// 模块模拟
jest.mock('../../utils/api.js', () => ({
  searchStock: jest.fn().mockResolvedValue([])
}))

// 计时器模拟
jest.useFakeTimers()
setTimeout(callback, 1000)
jest.advanceTimersByTime(1000)
expect(callback).toHaveBeenCalled()
```

## 持续集成

### 测试流水线
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

### 测试报告
- 测试结果自动生成
- 覆盖率报告上传
- 失败测试自动通知
- 性能回归检测

## 最佳实践

### 1. 测试命名
```javascript
// 好的命名
test('searchStock 应能处理中文股票名称搜索')
test('deleteRecentItem 删除不存在的索引应抛出错误')

// 不好的命名  
test('test search')
test('delete function')
```

### 2. 测试组织
```javascript
// 按功能模块组织
describe('股票搜索功能', () => {
  describe('关键词搜索', () => {
    test('中文名称搜索')
    test('股票代码搜索')
  })
  
  describe('搜索历史', () => {
    test('添加搜索记录')
    test('删除搜索记录')
  })
})
```

### 3. 测试数据管理
```javascript
// 使用beforeEach设置测试数据
beforeEach(() => {
  mockData = {
    stocks: [...testStocks],
    searches: [...testSearches]
  }
})

// 使用afterEach清理
afterEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
})
```

### 4. 错误测试
```javascript
test('网络错误应显示友好提示', async () => {
  // 模拟网络错误
  mockAPI.searchStock.mockRejectedValue(new Error('Network Error'))
  
  const component = render(<SearchComponent />)
  
  // 触发搜索
  fireEvent.change(input, { target: { value: 'test' } })
  
  // 验证错误处理
  await waitFor(() => {
    expect(screen.getByText('网络异常，请稍后重试')).toBeInTheDocument()
  })
})
```

---

运行测试: `npm test`  
查看覆盖率: `npm run test:coverage`  
监听模式: `npm run test:watch`