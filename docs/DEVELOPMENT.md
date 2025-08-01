# 开发文档

## 开发环境设置

### 必需工具
- 微信开发者工具 v1.06.2504010+
- Node.js v16+
- Git

### 项目初始化
```bash
git clone <repository-url>
cd bull
npm install  # 安装测试依赖
```

### 开发调试
1. 打开微信开发者工具
2. 导入项目目录
3. 配置AppID和后台域名
4. 启动实时预览

## 代码结构详解

### 目录结构
```
bull/
├── pages/              # 页面文件
│   ├── index/         # 首页
│   │   ├── index.js   # 页面逻辑
│   │   ├── index.wxml # 页面结构
│   │   ├── index.wxss # 页面样式
│   │   └── index.json # 页面配置
│   └── detail/        # 详情页
├── utils/             # 工具模块
│   ├── api.js        # API接口
│   ├── util.js       # 工具函数
│   └── track.js      # 埋点统计
├── components/        # 自定义组件
├── images/           # 静态资源
├── test/             # 单元测试
├── scripts/          # 构建脚本
└── docs/             # 项目文档
```

### 核心模块详解

#### API模块 (utils/api.js)
```javascript
// 主要接口
getStockHistory(symbol, period)    // 获取历史市值数据
getHotSearchStocks()               // 获取热门股票列表
searchStock(keyword)               // 搜索股票
getStockActualTurnover()          // 获取实际换手率
getStableShareholders()           // 获取稳定股东信息
```

#### 工具函数 (utils/util.js)
```javascript
// 存储操作
setStorage(key, value)            // 设置存储
getStorage(key, defaultValue)     // 获取存储
removeStorage(key)                // 删除存储

// UI反馈
showToast(title, icon)           // 显示提示
showLoading(title)               // 显示加载
hideLoading()                    // 隐藏加载

// 其他工具
formatTime(date)                 // 时间格式化
debounce(func, delay)           // 防抖函数
```

#### 埋点模块 (utils/track.js)
```javascript
// 搜索相关
searchSubmit(keyword, count)     // 搜索提交
searchResultClick(symbol, name, position) // 搜索结果点击
hotStockClick(symbol, name, position)     // 热门股票点击

// 功能交互  
favoriteAdd(symbol, name, source)         // 添加自选
favoriteRemove(symbol, name, source)      // 移除自选
tabSwitch(fromTab, toTab)                 // 标签切换
```

## 页面开发指南

### 首页 (pages/index/)

#### 核心功能
1. **搜索功能**
   - 实时搜索建议
   - 防抖优化（500ms）
   - 搜索历史记录

2. **Tab切换**
   - 热门搜索 / 最近搜索 / 我的自选
   - 支持点击和滑动切换
   - 状态同步和埋点统计

3. **列表操作**
   - 滑动删除（最近搜索、自选股）
   - 一键清空操作
   - 确认弹窗保护

#### 关键实现
```javascript
// 防抖搜索
this.debouncedSearch = util.debounce(this.performSearch.bind(this), 500)

// Swiper切换处理
onSwiperChange(e) {
  const currentIndex = e.detail.current
  const tab = this.data.tabList[currentIndex]
  // 同步状态和埋点
}

// 滑动删除
onRecentMoveChange(e) {
  const { x } = e.detail
  const threshold = -60
  // 处理滑动位置
}
```

### 详情页 (pages/detail/)

#### 核心功能
1. **数据展示**
   - 股票基本信息
   - 自选状态管理
   - 数据加载状态

2. **图表分析**
   - ECharts图表集成
   - 多时间范围切换
   - 数据类型切换（市值/换手率）

3. **统计计算**
   - 分位数算法
   - 流动性判断
   - 稳定股东分析

#### 关键实现
```javascript
// 分位数计算
calculatePercentile(currentValue, dataArray) {
  const countBelow = dataArray.filter(val => val < currentValue).length
  return ((countBelow / dataArray.length) * 100).toFixed(1)
}

// 导航状态保持
clearPreviousPageSearchState() {
  const fromPage = this.data.fromPage
  // 只有从搜索进入才清除状态
  if (fromPage === 'search') {
    // 清除搜索状态
  }
}
```

## 样式开发规范

### CSS组织结构
```css
/* 1. 布局容器 */
.container, .fixed-header, .scrollable-content

/* 2. 组件样式 */
.search-header, .tab-header, .results-list  

/* 3. 状态样式 */
.loading, .error, .empty

/* 4. 交互样式 */
.active, :hover, :active

/* 5. 响应式适配 */
@media, calc(), rpx单位
```

### 颜色系统
```css
/* 主色调 */
--primary-color: #1296db;
--primary-gradient: linear-gradient(135deg, #00C2FF 0%, #0081FF 100%);

/* 功能色 */
--success-color: #4CAF50;
--danger-color: #ff4757;
--warning-color: #FFC107;

/* 中性色 */
--text-primary: #1A1D24;
--text-secondary: #666;
--text-disabled: #999;
--border-color: #f0f0f0;
--background-color: #f5f5f5;
```

## 数据流设计

### 状态管理
```javascript
// 首页状态
data: {
  keyword: '',              // 搜索关键词
  searchResults: [],        // 搜索结果
  recentSearches: [],       // 最近搜索
  favoriteStocks: [],       // 自选股票
  currentTab: 'hot',        // 当前标签
  currentTabIndex: 0,       // 标签索引
  showResults: false,       // 显示搜索结果
}

// 详情页状态  
data: {
  stock: {},               // 股票信息
  currentPeriod: '1y',     // 时间范围
  currentDataType: 'marketCap', // 数据类型
  historyData: [],         // 历史数据
  stats: {},              // 统计信息
  loading: false,         // 加载状态
}
```

### 数据持久化
```javascript
// 本地存储键值
'recent_searches'    // 最近搜索历史
'favorite_stocks'    // 自选股票列表

// 存储格式
{
  symbol: '000001',
  name: '平安银行', 
  market: '深市',
  timestamp: 1643723400000
}
```

## 性能优化策略

### 1. 请求优化
- API接口防抖
- 数据缓存机制
- 错误重试逻辑

### 2. 渲染优化
- 列表虚拟滚动
- 图片懒加载
- 组件按需加载

### 3. 交互优化
- 骨架屏加载
- 乐观更新
- 触觉反馈

### 4. 包体积优化
- 资源压缩
- 代码分割
- 按需引入

## 错误处理机制

### API错误处理
```javascript
try {
  const result = await stockAPI.searchStock(keyword)
  // 处理成功结果
} catch (error) {
  console.error('搜索失败:', error)
  util.showToast('搜索失败，请重试')
  // 恢复UI状态
}
```

### 埋点错误处理
```javascript
reportEvent(eventName, params) {
  try {
    wx.reportEvent(eventName, params)
  } catch (error) {
    console.error('埋点上报失败:', error)
    // 静默失败，不影响主要功能
  }
}
```

## 调试技巧

### 1. 开发者工具
- Console面板查看日志
- Network面板监控请求
- AppData面板查看状态
- Storage面板管理缓存

### 2. 日志规范
```javascript
console.log('[页面加载]', data)
console.warn('[性能警告]', message) 
console.error('[错误信息]', error)
```

### 3. 调试参数
```javascript
// 开发环境配置
const isDev = process.env.NODE_ENV === 'development'
if (isDev) {
  // 开发调试代码
}
```

## 发布流程

### 1. 代码检查
```bash
npm test              # 运行单元测试
npm run lint          # 代码规范检查
npm run build         # 构建检查
```

### 2. 版本发布
```bash
# 预览版本
npm run deploy:preview

# 正式版本  
npm run deploy:upload
```

### 3. 发布清单
- [ ] 功能测试完成
- [ ] 单元测试通过
- [ ] 性能测试通过
- [ ] 兼容性测试通过
- [ ] 用户体验验收
- [ ] 数据埋点验证

---

更多技术细节请参考具体模块的代码注释和单元测试用例。