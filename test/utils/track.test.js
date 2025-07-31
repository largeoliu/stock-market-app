// utils/track.js 的单元测试
const Track = require('../../utils/track.js')

// Mock wx API
const mockWx = {
  reportEvent: jest.fn()
}

global.wx = mockWx

describe('Track 埋点工具测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('搜索相关埋点', () => {
    test('searchSubmit 应能正确上报搜索提交事件', () => {
      Track.searchSubmit('平安银行', 5)
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('search_submit', 
        expect.objectContaining({
          keyword: '平安银行',
          result_count: 5,
          timestamp: expect.any(Number)
        })
      )
    })

    test('searchResultClick 应能正确上报搜索结果点击事件', () => {
      Track.searchResultClick('000001', '平安银行', 2)
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('search_result_click', 
        expect.objectContaining({
          stock_symbol: '000001',
          stock_name: '平安银行',
          position: 2,
          timestamp: expect.any(Number)
        })
      )
    })

    test('clearSearchHistory 应能正确上报清空搜索历史事件', () => {
      Track.clearSearchHistory(10)
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('clear_search_history', 
        expect.objectContaining({
          history_count: 10,
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('热门股票相关埋点', () => {
    test('hotStockClick 应能正确上报热门股票点击事件', () => {
      Track.hotStockClick('000002', '万科A', 0)
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('hot_stock_click', 
        expect.objectContaining({
          stock_symbol: '000002',
          stock_name: '万科A',
          position: 0,
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('历史搜索相关埋点', () => {
    test('recentSearchClick 应能正确上报历史搜索点击事件', () => {
      Track.recentSearchClick('600036', '招商银行')
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('recent_search_click', 
        expect.objectContaining({
          stock_symbol: '600036',
          stock_name: '招商银行',
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('自选股相关埋点', () => {
    test('favoriteAdd 应能正确上报添加自选事件', () => {
      Track.favoriteAdd('000001', '平安银行', 'detail')
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('favorite_add', 
        expect.objectContaining({
          stock_symbol: '000001',
          stock_name: '平安银行',
          source: 'detail',
          timestamp: expect.any(Number)
        })
      )
    })

    test('favoriteRemove 应能正确上报移除自选事件', () => {
      Track.favoriteRemove('000001', '平安银行', 'list')
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('favorite_remove', 
        expect.objectContaining({
          stock_symbol: '000001',
          stock_name: '平安银行',
          source: 'list',
          timestamp: expect.any(Number)
        })
      )
    })

    test('clearFavorites 应能正确上报清空自选事件', () => {
      Track.clearFavorites(8)
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('clear_favorites', 
        expect.objectContaining({
          favorite_count: 8,
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('页面交互相关埋点', () => {
    test('tabSwitch 应能正确上报标签切换事件', () => {
      Track.tabSwitch('hot', 'favorites')
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('tab_switch', 
        expect.objectContaining({
          from_tab: 'hot',
          to_tab: 'favorites',
          timestamp: expect.any(Number)
        })
      )
    })

    test('periodSwitch 应能正确上报时间段切换事件', () => {
      Track.periodSwitch('1y', '3y', '000001', 'marketCap')
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('period_switch', 
        expect.objectContaining({
          from_period: '1y',
          to_period: '3y',
          stock_symbol: '000001',
          data_type: 'marketCap',
          timestamp: expect.any(Number)
        })
      )
    })

    test('dataTypeSwitch 应能正确上报数据类型切换事件', () => {
      Track.dataTypeSwitch('marketCap', 'actualTurnover', '600036', '1y')
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('data_type_switch', 
        expect.objectContaining({
          from_type: 'marketCap',
          to_type: 'actualTurnover',
          stock_symbol: '600036',
          period: '1y',
          timestamp: expect.any(Number)
        })
      )
    })

    test('shareClick 应能正确上报分享点击事件', () => {
      Track.shareClick('000002', '万科A')
      
      expect(mockWx.reportEvent).toHaveBeenCalledWith('share_click', 
        expect.objectContaining({
          stock_symbol: '000002',
          stock_name: '万科A',
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('错误处理', () => {
    test('当 wx.reportEvent 不存在时应静默失败', () => {
      const originalReportEvent = mockWx.reportEvent
      delete mockWx.reportEvent
      
      // 应该不会抛出错误
      expect(() => {
        Track.searchSubmit('test', 0)
      }).not.toThrow()
      
      // 恢复 mock
      mockWx.reportEvent = originalReportEvent
    })

    test('当 wx.reportEvent 抛出错误时应静默失败', () => {
      mockWx.reportEvent.mockImplementation(() => {
        throw new Error('Network error')
      })
      
      // 应该不会抛出错误
      expect(() => {
        Track.searchSubmit('test', 0)
      }).not.toThrow()
    })
  })
})