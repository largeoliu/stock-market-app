// API接口测试
const stockAPI = require('../../utils/api.js')

// Mock util模块
jest.mock('../../utils/util.js', () => ({
  getStorage: jest.fn(),
  setStorage: jest.fn(),
  showToast: jest.fn()
}))

const util = require('../../utils/util.js')

describe('自选股API接口测试', () => {
  // 模拟微信云开发调用
  beforeEach(() => {
    // 重置所有mock
    wx.cloud.callContainer.mockClear()
    util.getStorage.mockClear()
    util.setStorage.mockClear()
    util.showToast.mockClear()
    
    // 清除API缓存
    stockAPI.cache.clear()
    
    // 确保测试环境使用test service
    wx.getStorageSync.mockReturnValue(true) // 模拟开发环境标识
    stockAPI.baseConfig.service = 'test'
  })

  describe('添加自选股', () => {
    test('addFavorite 应能正确添加自选股', async () => {
      // 模拟成功响应
      wx.cloud.callContainer.mockImplementation(({ success }) => {
        setTimeout(() => {
          success({
            statusCode: 200,
            data: { success: true, message: '添加成功' }
          })
        }, 0)
      })

      const result = await stockAPI.addFavorite('000001')
      
      expect(wx.cloud.callContainer).toHaveBeenCalledWith({
        config: { env: 'prod-1gs83ryma8b2a51f' },
        path: '/favorites',
        header: {
          'X-WX-SERVICE': 'test',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        data: { stock_code: '000001' },
        timeout: 3000,
        success: expect.any(Function),
        fail: expect.any(Function)
      })
      
      expect(result).toEqual({ 
        success: true, 
        message: '添加成功',
        statusCode: 200,
        isNew: expect.any(Boolean)
      })
    })

    test('addFavorite 应能处理请求失败', async () => {
      wx.cloud.callContainer.mockImplementation(({ fail }) => {
        setTimeout(() => {
          fail({ errMsg: 'network error' })
        }, 0)
      })

      await expect(stockAPI.addFavorite('000001')).rejects.toThrow('添加自选股失败: network error')
    })

    test('addFavorite 应能清理股票代码后缀', async () => {
      wx.cloud.callContainer.mockImplementation(({ success }) => {
        setTimeout(() => {
          success({
            statusCode: 200,
            data: { success: true }
          })
        }, 0)
      })

      await stockAPI.addFavorite('000001.SZ')
      
      expect(wx.cloud.callContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { stock_code: '000001' }
        })
      )
    })
  })

  describe('获取自选股列表', () => {
    test('getFavorites 应能正确获取自选股列表', async () => {
      const mockResponse = {
        count: 2,
        favorites: [
          {
            code: '000001',
            name: '平安银行',
            created_at: '2025-08-01 10:30:15'
          },
          {
            code: '600519',
            name: '贵州茅台',
            created_at: '2025-08-01 14:20:30'
          }
        ]
      }

      wx.cloud.callContainer.mockImplementation(({ success }) => {
        setTimeout(() => {
          success({
            statusCode: 200,
            data: mockResponse
          })
        }, 0)
      })

      const result = await stockAPI.getFavorites()
      
      expect(wx.cloud.callContainer).toHaveBeenCalledWith({
        config: { env: 'prod-1gs83ryma8b2a51f' },
        path: '/favorites',
        header: { 'X-WX-SERVICE': 'test' },
        method: 'GET',
        timeout: 3000,
        success: expect.any(Function),
        fail: expect.any(Function)
      })
      
      expect(result).toEqual({
        count: 2,
        favorites: [
          {
            symbol: '000001',
            name: '平安银行',
            market: 'A股',
            timestamp: expect.any(Number),
            created_at: '2025-08-01 10:30:15'
          },
          {
            symbol: '600519',
            name: '贵州茅台',
            market: 'A股',
            timestamp: expect.any(Number),
            created_at: '2025-08-01 14:20:30'
          }
        ]
      })
    })

    test('getFavorites 应能处理空数据', async () => {
      wx.cloud.callContainer.mockImplementation(({ success }) => {
        setTimeout(() => {
          success({
            statusCode: 200,
            data: { count: 0, favorites: [] }
          })
        }, 0)
      })

      const result = await stockAPI.getFavorites()
      
      expect(result).toEqual({ count: 0, favorites: [] })
    })
  })

  describe('删除自选股', () => {
    test('removeFavorite 应能正确删除自选股', async () => {
      wx.cloud.callContainer.mockImplementation(({ success }) => {
        setTimeout(() => {
          success({
            statusCode: 200,
            data: { success: true, message: '删除成功' }
          })
        }, 0)
      })

      const result = await stockAPI.removeFavorite('000001')
      
      expect(wx.cloud.callContainer).toHaveBeenCalledWith({
        config: { env: 'prod-1gs83ryma8b2a51f' },
        path: '/favorites/000001',
        header: { 'X-WX-SERVICE': 'test' },
        method: 'DELETE',
        timeout: 3000,
        success: expect.any(Function),
        fail: expect.any(Function)
      })
      
      expect(result).toEqual({ success: true, message: '删除成功' })
    })
  })

  describe('数据格式化', () => {
    test('formatFavoritesData 应能正确格式化数据', () => {
      const rawData = {
        count: 2,
        favorites: [
          {
            code: '000001',
            name: '平安银行',
            created_at: '2025-08-01T10:30:15.000Z'
          },
          {
            code: '00700.HK',
            name: '腾讯控股',
            created_at: '2025-08-01T14:20:30.000Z'
          }
        ]
      }

      const result = stockAPI.formatFavoritesData(rawData)

      expect(result).toEqual({
        count: 2,
        favorites: [
          {
            symbol: '000001',
            name: '平安银行',
            market: 'A股',
            timestamp: expect.any(Number),
            created_at: '2025-08-01T10:30:15.000Z'
          },
          {
            symbol: '00700.HK',
            name: '腾讯控股',
            market: '港股',
            timestamp: expect.any(Number),
            created_at: '2025-08-01T14:20:30.000Z'
          }
        ]
      })
    })

    test('formatFavoritesData 应能处理空数据', () => {
      const result1 = stockAPI.formatFavoritesData(null)
      const result2 = stockAPI.formatFavoritesData({ favorites: null })
      
      expect(result1).toEqual({ count: 0, favorites: [] })
      expect(result2).toEqual({ count: 0, favorites: [] })
    })
  })

  describe('数据同步功能', () => {
    beforeEach(() => {
      // 清除本地存储mock
      wx.getStorageSync.mockClear()
      wx.setStorageSync.mockClear()
    })

    test('syncLocalFavorites 应能同步本地数据到服务端', async () => {
      // 模拟本地有2只股票，服务端有1只不同的股票
      const localFavorites = [
        { symbol: '000001', name: '平安银行', timestamp: Date.now() },
        { symbol: '600519', name: '贵州茅台', timestamp: Date.now() }
      ]
      
      const serverFavorites = {
        count: 1,
        favorites: [
          { symbol: '000002', name: '万科A', created_at: '2025-08-01T10:00:00.000Z', timestamp: Date.now() }
        ]
      }

      // Mock本地存储
      util.getStorage.mockReturnValue(localFavorites)

      // Mock获取服务端数据
      wx.cloud.callContainer
        .mockImplementationOnce(({ success }) => {
          // 第一次调用：getFavorites
          setTimeout(() => {
            success({
              statusCode: 200,
              data: serverFavorites
            })
          }, 0)
        })
        .mockImplementationOnce(({ success }) => {
          // 第二次调用：addFavorite('000001')
          setTimeout(() => {
            success({
              statusCode: 200,
              data: { success: true }
            })
          }, 0)
        })
        .mockImplementationOnce(({ success }) => {
          // 第三次调用：addFavorite('600519')
          setTimeout(() => {
            success({
              statusCode: 200,
              data: { success: true }
            })
          }, 0)
        })
        .mockImplementationOnce(({ success }) => {
          // 第四次调用：获取最终数据
          setTimeout(() => {
            success({
              statusCode: 200,
              data: {
                count: 3,
                favorites: [
                  ...serverFavorites.favorites,
                  ...localFavorites.map(stock => ({
                    code: stock.symbol,
                    name: stock.name,
                    created_at: new Date(stock.timestamp).toISOString()
                  }))
                ]
              }
            })
          }, 0)
        })

      const result = await stockAPI.syncLocalFavorites()

      expect(result.syncResult).toEqual({
        uploaded: 2,
        failed: 0,
        total: 2
      })
      
      expect(result.count).toBe(3)
      expect(result.favorites).toHaveLength(3)
    })

    test('syncLocalFavorites 应能处理服务端获取失败的情况', async () => {
      const localFavorites = [
        { symbol: '000001', name: '平安银行', timestamp: Date.now() }
      ]

      util.getStorage.mockReturnValue(localFavorites)

      // Mock服务端请求失败
      wx.cloud.callContainer.mockImplementation(({ fail }) => {
        setTimeout(() => {
          fail({ errMsg: 'network error' })
        }, 0)
      })

      const result = await stockAPI.syncLocalFavorites()

      expect(result.syncResult.fallbackToLocal).toBe(true)
      expect(result.syncResult.error).toContain('network error')
      expect(result.favorites).toHaveLength(1)
    })

    test('syncLocalFavorites 本地无数据时应直接返回服务端数据', async () => {
      util.getStorage.mockReturnValue([])

      const serverFavorites = {
        count: 1,
        favorites: [
          { symbol: '000001', name: '平安银行', created_at: '2025-08-01T10:00:00.000Z', timestamp: Date.now() }
        ]
      }

      wx.cloud.callContainer.mockImplementation(({ success }) => {
        setTimeout(() => {
          success({
            statusCode: 200,
            data: serverFavorites
          })
        }, 0)
      })

      const result = await stockAPI.syncLocalFavorites()

      expect(result.count).toBe(1)
      expect(result.favorites).toHaveLength(1)
      // 不应该有上传操作
      expect(wx.cloud.callContainer).toHaveBeenCalledTimes(1)
    })
  })
})