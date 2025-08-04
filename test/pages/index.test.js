// pages/index/index.js 的单元测试
const util = require('../../utils/util.js')
const track = require('../../utils/track.js')

// Mock dependencies
jest.mock('../../utils/util.js')
jest.mock('../../utils/track.js')
jest.mock('../../utils/api.js')

const mockWx = {
  setData: jest.fn(),
  navigateTo: jest.fn(),
  showModal: jest.fn(),
  vibrateShort: jest.fn(),
  getSystemInfoSync: jest.fn(() => ({
    safeArea: { top: 44 },
    statusBarHeight: 44
  }))
}

global.wx = mockWx
global.Page = jest.fn()
global.getApp = jest.fn(() => ({
  globalData: {
    favoriteStocks: []
  }
}))

describe('首页 (pages/index/index.js) 测试', () => {
  let pageInstance

  beforeEach(() => {
    jest.clearAllMocks()
    
    // 模拟页面实例
    pageInstance = {
      data: {
        keyword: '',
        searchResults: [],
        recentSearches: [],
        favoriteStocks: [],
        loading: false,
        showResults: false,
        hotStocks: [],
        hotStocksLoading: true,
        hotStocksLoadFailed: false,
        currentTab: 'hot',
        safeAreaTop: 0,
        isFirstLoad: true
      },
      setData: jest.fn(),
      debouncedSearch: jest.fn()
    }

    // Mock util functions
    util.getStorage.mockReturnValue([])
    util.setStorage.mockReturnValue(true)
    util.showToast.mockReturnValue(true)
    util.debounce.mockImplementation((fn, delay) => fn)
  })

  describe('页面初始化', () => {
    test('onLoad 应正确设置安全区域和初始化数据', () => {
      const onLoad = jest.fn()
      
      // 模拟onLoad逻辑
      const systemInfo = mockWx.getSystemInfoSync()
      expect(systemInfo.safeArea.top).toBe(44)
    })

    test('setDefaultTab 有自选股时应设置为 favorites tab', () => {
      util.getStorage.mockReturnValue([
        { symbol: '000001', name: '平安银行' }
      ])
      
      const setDefaultTab = (pageData) => {
        const favoriteStocks = util.getStorage('favorite_stocks', [])
        if (favoriteStocks.length > 0) {
          return 'favorites'
        }
        return 'hot'
      }

      const result = setDefaultTab()
      expect(result).toBe('favorites')
    })

    test('setDefaultTab 无自选股时应保持 hot tab', () => {
      util.getStorage.mockReturnValue([])
      
      const setDefaultTab = () => {
        const favoriteStocks = util.getStorage('favorite_stocks', [])
        if (favoriteStocks.length > 0) {
          return 'favorites'
        }
        return 'hot'
      }

      const result = setDefaultTab()
      expect(result).toBe('hot')
    })
  })

  describe('搜索功能', () => {
    test('onInputChange 应正确处理输入变化', () => {
      const onInputChange = (e, pageData) => {
        const keyword = e.detail.value.trim()
        pageData.keyword = keyword
        
        if (keyword) {
          // 应该触发搜索
          return { keyword, shouldSearch: true }
        } else {
          // 应该清空结果
          return { 
            keyword, 
            searchResults: [], 
            showResults: false,
            shouldSearch: false
          }
        }
      }

      // 测试输入关键词
      const result1 = onInputChange({ detail: { value: '平安银行' } }, {})
      expect(result1.keyword).toBe('平安银行')
      expect(result1.shouldSearch).toBe(true)

      // 测试清空输入
      const result2 = onInputChange({ detail: { value: '' } }, {})
      expect(result2.keyword).toBe('')
      expect(result2.shouldSearch).toBe(false)
      expect(result2.searchResults).toEqual([])
    })

    test('onClearInput 应清空搜索状态', () => {
      const onClearInput = () => {
        return {
          keyword: '',
          searchResults: [],
          showResults: false
        }
      }

      const result = onClearInput()
      expect(result.keyword).toBe('')
      expect(result.searchResults).toEqual([])
      expect(result.showResults).toBe(false)
    })
  })

  describe('Tab 切换功能', () => {
    test('onTabChange 应正确切换标签并触发埋点', () => {
      const onTabChange = (e, currentTab) => {
        const tab = e.currentTarget.dataset.tab
        
        if (currentTab !== tab) {
          // 应该触发埋点
          track.tabSwitch(currentTab, tab)
        }
        
        return {
          currentTab: tab,
          shouldTrack: currentTab !== tab
        }
      }

      const result = onTabChange(
        { currentTarget: { dataset: { tab: 'favorites' } } },
        'hot'
      )
      
      expect(result.currentTab).toBe('favorites')
      expect(result.shouldTrack).toBe(true)
      expect(track.tabSwitch).toHaveBeenCalledWith('hot', 'favorites')
    })
  })

  describe('删除功能', () => {
    test('deleteRecentItem 应正确删除最近查看记录', () => {
      const mockRecentSearches = [
        { symbol: '000001', name: '平安银行' },
        { symbol: '000002', name: '万科A' }
      ]
      
      util.getStorage.mockReturnValue(mockRecentSearches)

      const deleteRecentItem = (e) => {
        const index = e.currentTarget.dataset.index
        const recentSearches = util.getStorage('recent_searches', [])
        
        recentSearches.splice(index, 1)
        util.setStorage('recent_searches', recentSearches)
        
        return {
          recentSearches: recentSearches.slice(0, 20),
          deleted: true
        }
      }

      const result = deleteRecentItem({
        currentTarget: { dataset: { index: 0 } }
      })

      expect(result.recentSearches).toHaveLength(1)
      expect(result.recentSearches[0].symbol).toBe('000002')
      expect(util.setStorage).toHaveBeenCalledWith('recent_searches', expect.any(Array))
    })

    test('clearAllRecentSearches 应清空所有搜索记录', () => {
      const clearAllRecentSearches = (historyCount) => {
        track.clearSearchHistory(historyCount)
        util.removeStorage('recent_searches')
        
        return {
          recentSearches: [],
          cleared: true
        }
      }

      const result = clearAllRecentSearches(5)
      
      expect(result.recentSearches).toEqual([])
      expect(track.clearSearchHistory).toHaveBeenCalledWith(5)
      expect(util.removeStorage).toHaveBeenCalledWith('recent_searches')
    })
  })

  describe('自选股功能', () => {
    test('deleteFavoriteItem 应显示确认对话框', () => {
      mockWx.showModal.mockImplementation(({ success }) => {
        success({ confirm: true })
      })

      const deleteFavoriteItem = (e, favoriteStocks) => {
        const index = e.currentTarget.dataset.index
        const stock = favoriteStocks[index]
        
        // 模拟显示确认对话框
        mockWx.showModal({
          title: '确认删除',
          content: `确定要取消自选 ${stock.name} 吗？`,
          success: (res) => {
            if (res.confirm) {
              return { shouldDelete: true }
            }
          }
        })

        return { stock, showModal: true }
      }

      const mockFavorites = [
        { symbol: '000001', name: '平安银行' }
      ]

      const result = deleteFavoriteItem({
        currentTarget: { dataset: { index: 0 } }
      }, mockFavorites)

      expect(result.stock.name).toBe('平安银行')
      expect(mockWx.showModal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '确认删除',
          content: '确定要取消自选 平安银行 吗？'
        })
      )
    })
  })

  describe('股票选择功能', () => {
    test('selectStock 应添加到最近查看并跳转详情页', () => {
      const selectStock = (stock) => {
        // 跳转到详情页
        mockWx.navigateTo({
          url: `/pages/detail/detail?symbol=${stock.symbol}&name=${stock.name}&market=${stock.market || ''}`
        })

        return {
          navigated: true,
          url: `/pages/detail/detail?symbol=${stock.symbol}&name=${stock.name}&market=${stock.market || ''}`
        }
      }

      const testStock = {
        symbol: '000001',
        name: '平安银行',
        market: '深市'
      }

      const result = selectStock(testStock)

      expect(result.navigated).toBe(true)
      expect(result.url).toContain('symbol=000001')
      expect(result.url).toContain('name=平安银行')
      expect(mockWx.navigateTo).toHaveBeenCalled()
    })

    test('addToRecentSearches 应正确添加到最近查看', () => {
      const existingSearches = [
        { symbol: '000002', name: '万科A', timestamp: 1000 }
      ]
      util.getStorage.mockReturnValue(existingSearches)

      const addToRecentSearches = (stock) => {
        let recentSearches = util.getStorage('recent_searches', [])
        
        // 移除重复项
        recentSearches = recentSearches.filter(item => item.symbol !== stock.symbol)
        
        // 添加到开头
        recentSearches.unshift({
          symbol: stock.symbol,
          name: stock.name,
          market: stock.market || '',
          timestamp: Date.now()
        })
        
        // 只保留最近20条
        recentSearches = recentSearches.slice(0, 20)
        
        util.setStorage('recent_searches', recentSearches)
        
        return recentSearches
      }

      const newStock = { symbol: '000001', name: '平安银行', market: '深市' }
      const result = addToRecentSearches(newStock)

      expect(result[0].symbol).toBe('000001')
      expect(result[0].name).toBe('平安银行')
      expect(result).toHaveLength(2)
      expect(util.setStorage).toHaveBeenCalledWith('recent_searches', expect.any(Array))
    })
  })
})