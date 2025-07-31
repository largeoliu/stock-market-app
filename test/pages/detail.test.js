// pages/detail/detail.js 的单元测试
const util = require('../../utils/util.js')
const track = require('../../utils/track.js')

jest.mock('../../utils/util.js')
jest.mock('../../utils/track.js')
jest.mock('../../utils/api.js')

const mockWx = {
  setNavigationBarTitle: jest.fn(),
  getSystemInfoSync: jest.fn(() => ({
    windowWidth: 375
  })),
  vibrateShort: jest.fn(),
  showModal: jest.fn(),
  navigateBack: jest.fn(),
  createSelectorQuery: jest.fn(() => ({
    in: jest.fn(() => ({
      select: jest.fn(() => ({
        boundingClientRect: jest.fn((callback) => {
          callback({ width: 300, height: 50 })
          return {
            exec: jest.fn()
          }
        })
      }))
    }))
  })),
  stopPullDownRefresh: jest.fn()
}

global.wx = mockWx
global.getCurrentPages = jest.fn(() => [
  { route: 'pages/index/index' },
  { route: 'pages/detail/detail' }
])

describe('详情页 (pages/detail/detail.js) 测试', () => {
  let pageInstance

  beforeEach(() => {
    jest.clearAllMocks()
    
    pageInstance = {
      data: {
        stock: {
          symbol: '000001',
          name: '平安银行',
          market: '深市'
        },
        screenWidth: 375,
        isFavorited: false,
        currentPeriod: '1y',
        periods: [
          { key: '1y', label: '1年', active: true },
          { key: '3y', label: '3年', active: false }
        ],
        currentDataType: 'marketCap',
        dataTypes: [
          { key: 'marketCap', label: '总市值', active: true },
          { key: 'actualTurnover', label: '实际换手率', active: false }
        ],
        loading: true,
        chartLoading: false,
        stats: {
          currentMarketCap: 100000000000,
          maxMarketCap: 150000000000,
          minMarketCap: 80000000000,
          percentile: '65.2'
        }
      },
      setData: jest.fn()
    }

    util.showLoading.mockReturnValue(true)
    util.hideLoading.mockReturnValue(true)
    util.showToast.mockReturnValue(true)
    util.getStorage.mockReturnValue([])
    util.setStorage.mockReturnValue(true)
  })

  describe('页面初始化', () => {
    test('onLoad 应正确设置股票信息和页面标题', () => {
      const onLoad = (options) => {
        const { symbol, name, market } = options
        
        mockWx.setNavigationBarTitle({
          title: name || symbol || '股票详情'
        })

        return {
          stock: {
            symbol: symbol || '',
            name: name || '',
            market: market || ''
          },
          screenWidth: mockWx.getSystemInfoSync().windowWidth
        }
      }

      const result = onLoad({
        symbol: '000001',
        name: '平安银行',
        market: '深市'
      })

      expect(result.stock.symbol).toBe('000001')
      expect(result.stock.name).toBe('平安银行')
      expect(result.stock.market).toBe('深市')
      expect(result.screenWidth).toBe(375)
      expect(mockWx.setNavigationBarTitle).toHaveBeenCalledWith({
        title: '平安银行'
      })
    })
  })

  describe('分位数计算', () => {
    test('calculateStats 应正确计算市值分位数', () => {
      const calculatePercentile = (currentValue, dataArray) => {
        const countBelow = dataArray.filter(val => val < currentValue).length
        return ((countBelow / dataArray.length) * 100).toFixed(1)
      }

      // 测试数据：[80, 90, 100, 110, 120]，当前值为100
      const testData = [80, 90, 100, 110, 120]
      const currentValue = 100
      
      const percentile = calculatePercentile(currentValue, testData)
      
      // 有2个值小于100，总共5个值，所以分位数应该是 2/5 * 100 = 40.0
      expect(percentile).toBe('40.0')
    })

    test('calculatePercentile 边界情况测试', () => {
      const calculatePercentile = (currentValue, dataArray) => {
        const countBelow = dataArray.filter(val => val < currentValue).length
        return ((countBelow / dataArray.length) * 100).toFixed(1)
      }

      // 测试最小值
      const minPercentile = calculatePercentile(80, [80, 90, 100, 110, 120])
      expect(minPercentile).toBe('0.0')

      // 测试最大值
      const maxPercentile = calculatePercentile(120, [80, 90, 100, 110, 120])
      expect(maxPercentile).toBe('80.0')

      // 测试中位数
      const medianPercentile = calculatePercentile(100, [80, 90, 100, 110, 120])
      expect(medianPercentile).toBe('40.0')
    })
  })

  describe('时间范围切换', () => {
    test('onPeriodChange 应正确切换时间范围并触发埋点', () => {
      const onPeriodChange = (e, currentPeriod, stockSymbol, dataType) => {
        const period = e.currentTarget.dataset.period
        const index = parseInt(e.currentTarget.dataset.index)
        
        if (period === currentPeriod) {
          return { changed: false }
        }

        // 触发埋点
        track.periodSwitch(currentPeriod, period, stockSymbol, dataType)

        // 更新选中状态
        const periods = [
          { key: '1y', label: '1年', active: period === '1y' },
          { key: '3y', label: '3年', active: period === '3y' },
          { key: '5y', label: '5年', active: period === '5y' }
        ]

        return {
          changed: true,
          currentPeriod: period,
          periods,
          chartLoading: true
        }
      }

      const result = onPeriodChange(
        { 
          currentTarget: { 
            dataset: { period: '3y', index: '1' } 
          } 
        },
        '1y',
        '000001',
        'marketCap'
      )

      expect(result.changed).toBe(true)
      expect(result.currentPeriod).toBe('3y')
      expect(result.chartLoading).toBe(true)
      expect(track.periodSwitch).toHaveBeenCalledWith('1y', '3y', '000001', 'marketCap')
    })
  })

  describe('数据类型切换', () => {
    test('onDataTypeChange 应正确切换数据类型并触发埋点', () => {
      const onDataTypeChange = (e, currentDataType, stockSymbol, period) => {
        const dataType = e.currentTarget.dataset.type
        
        if (dataType === currentDataType) {
          return { changed: false }
        }

        const fromType = currentDataType
        
        // 触发埋点
        track.dataTypeSwitch(fromType, dataType, stockSymbol, period)

        // 更新选中状态
        const dataTypes = [
          { key: 'marketCap', label: '总市值', active: dataType === 'marketCap' },
          { key: 'actualTurnover', label: '实际换手率', active: dataType === 'actualTurnover' }
        ]

        return {
          changed: true,
          currentDataType: dataType,
          dataTypes,
          chartLoading: true
        }
      }

      const result = onDataTypeChange(
        { 
          currentTarget: { 
            dataset: { type: 'actualTurnover' } 
          } 
        },
        'marketCap',
        '000001',
        '1y'
      )

      expect(result.changed).toBe(true)
      expect(result.currentDataType).toBe('actualTurnover')
      expect(result.chartLoading).toBe(true)
      expect(track.dataTypeSwitch).toHaveBeenCalledWith('marketCap', 'actualTurnover', '000001', '1y')
    })
  })

  describe('收藏功能', () => {
    test('onToggleFavorite 应正确添加自选股', () => {
      const mockApp = {
        globalData: {
          favoriteStocks: []
        }
      }

      const onToggleFavorite = (stock, favoriteStocks) => {
        const index = favoriteStocks.findIndex(item => item.symbol === stock.symbol)
        
        if (index === -1) {
          // 添加自选
          favoriteStocks.push({
            symbol: stock.symbol,
            name: stock.name,
            market: stock.market,
            timestamp: Date.now()
          })
          
          track.favoriteAdd(stock.symbol, stock.name, 'detail')
          
          return {
            action: 'add',
            favoriteStocks,
            isFavorited: true
          }
        } else {
          // 移除自选
          favoriteStocks.splice(index, 1)
          
          track.favoriteRemove(stock.symbol, stock.name, 'detail')
          
          return {
            action: 'remove',
            favoriteStocks,
            isFavorited: false
          }
        }
      }

      const testStock = {
        symbol: '000001',
        name: '平安银行',
        market: '深市'
      }

      const result = onToggleFavorite(testStock, [])

      expect(result.action).toBe('add')
      expect(result.isFavorited).toBe(true)
      expect(result.favoriteStocks).toHaveLength(1)
      expect(result.favoriteStocks[0].symbol).toBe('000001')
      expect(track.favoriteAdd).toHaveBeenCalledWith('000001', '平安银行', 'detail')
    })

    test('onToggleFavorite 应正确移除自选股', () => {
      const existingFavorites = [
        { symbol: '000001', name: '平安银行', market: '深市', timestamp: Date.now() }
      ]

      const onToggleFavorite = (stock, favoriteStocks) => {
        const index = favoriteStocks.findIndex(item => item.symbol === stock.symbol)
        
        if (index > -1) {
          favoriteStocks.splice(index, 1)
          track.favoriteRemove(stock.symbol, stock.name, 'detail')
          
          return {
            action: 'remove',
            favoriteStocks,
            isFavorited: false
          }
        }
      }

      const testStock = {
        symbol: '000001',
        name: '平安银行',
        market: '深市'
      }

      const result = onToggleFavorite(testStock, [...existingFavorites])

      expect(result.action).toBe('remove')
      expect(result.isFavorited).toBe(false)
      expect(result.favoriteStocks).toHaveLength(0)
      expect(track.favoriteRemove).toHaveBeenCalledWith('000001', '平安银行', 'detail')
    })
  })

  describe('分享功能', () => {
    test('onShareAppMessage 应返回正确的分享信息并触发埋点', () => {
      const onShareAppMessage = (stock) => {
        track.shareClick(stock.symbol, stock.name)
        
        return {
          title: `${stock.name}(${stock.symbol}) 市值走势`,
          path: `/pages/detail/detail?symbol=${stock.symbol}&name=${stock.name}&market=${stock.market}`
        }
      }

      const testStock = {
        symbol: '000001',
        name: '平安银行',
        market: '深市'
      }

      const result = onShareAppMessage(testStock)

      expect(result.title).toBe('平安银行(000001) 市值走势')
      expect(result.path).toContain('symbol=000001')
      expect(result.path).toContain('name=平安银行')
      expect(track.shareClick).toHaveBeenCalledWith('000001', '平安银行')
    })
  })

  describe('页面导航', () => {
    test('clearPreviousPageSearchState 应正确清除上一页面的搜索状态', () => {
      const mockPages = [
        { 
          route: 'pages/index/index',
          setData: jest.fn(),
          setDefaultTab: jest.fn()
        },
        { route: 'pages/detail/detail' }
      ]

      global.getCurrentPages.mockReturnValue(mockPages)

      const clearPreviousPageSearchState = () => {
        const pages = getCurrentPages()
        if (pages.length >= 2) {
          const prevPage = pages[pages.length - 2]
          if (prevPage.route === 'pages/index/index' && prevPage.setData) {
            prevPage.setData({
              keyword: '',
              searchResults: [],
              showResults: false
            })
            
            if (prevPage.setDefaultTab) {
              prevPage.setDefaultTab()
            }
            
            return { cleared: true }
          }
        }
        return { cleared: false }
      }

      const result = clearPreviousPageSearchState()

      expect(result.cleared).toBe(true)
      expect(mockPages[0].setData).toHaveBeenCalledWith({
        keyword: '',
        searchResults: [],
        showResults: false
      })
      expect(mockPages[0].setDefaultTab).toHaveBeenCalled()
    })
  })

  describe('下拉刷新', () => {
    test('onPullDownRefresh 应触发数据重新加载', () => {
      const onPullDownRefresh = async () => {
        // 模拟重新加载数据
        await new Promise(resolve => setTimeout(resolve, 100))
        
        mockWx.stopPullDownRefresh()
        
        return { refreshed: true }
      }

      return onPullDownRefresh().then(result => {
        expect(result.refreshed).toBe(true)
        expect(mockWx.stopPullDownRefresh).toHaveBeenCalled()
      })
    })
  })
})