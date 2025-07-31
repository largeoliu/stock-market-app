// utils/util.js 的单元测试
const util = require('../../utils/util.js')

// Mock wx API
const mockWx = {
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn()
}

// 在测试环境中模拟 wx 全局对象
global.wx = mockWx

describe('util.js 工具函数测试', () => {
  beforeEach(() => {
    // 每个测试前清除所有 mock 调用记录
    jest.clearAllMocks()
  })

  describe('formatTime', () => {
    test('应能正确格式化日期', () => {
      const date = new Date('2023-05-15 14:30:25')
      const result = util.formatTime(date)
      expect(result).toBe('2023/05/15 14:30:25')
    })

    test('应能处理单位数的月份和日期', () => {
      const date = new Date('2023-01-05 09:08:07')
      const result = util.formatTime(date)
      expect(result).toBe('2023/01/05 09:08:07')
    })
  })

  describe('debounce', () => {
    test('应能正确防抖执行函数', (done) => {
      const mockFn = jest.fn()
      const debouncedFn = util.debounce(mockFn, 100)

      // 快速调用多次
      debouncedFn()
      debouncedFn()
      debouncedFn()

      // 立即检查：应该还没有被调用
      expect(mockFn).not.toHaveBeenCalled()

      // 等待防抖时间后检查
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1)
        done()
      }, 150)
    })

    test('应能传递参数给防抖函数', (done) => {
      const mockFn = jest.fn()
      const debouncedFn = util.debounce(mockFn, 50)

      debouncedFn('test', 123)

      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledWith('test', 123)
        done()
      }, 100)
    })
  })

  describe('存储相关函数', () => {
    describe('setStorage', () => {
      test('应能正确设置存储', () => {
        const key = 'test_key'
        const value = { name: 'test', id: 123 }
        
        util.setStorage(key, value)
        
        expect(mockWx.setStorageSync).toHaveBeenCalledWith(key, value)
      })
    })

    describe('getStorage', () => {
      test('应能正确获取存储的数据', () => {
        const key = 'test_key'
        const value = { name: 'test' }
        mockWx.getStorageSync.mockReturnValue(value)

        const result = util.getStorage(key)
        
        expect(result).toEqual(value)
        expect(mockWx.getStorageSync).toHaveBeenCalledWith(key)
      })

      test('获取不存在的键时应返回默认值', () => {
        const key = 'non_existent_key'
        const defaultValue = []
        mockWx.getStorageSync.mockImplementation(() => {
          throw new Error('Storage key not found')
        })

        const result = util.getStorage(key, defaultValue)
        
        expect(result).toEqual(defaultValue)
      })
    })

    describe('removeStorage', () => {
      test('应能正确删除存储', () => {
        const key = 'test_key'
        
        util.removeStorage(key)
        
        expect(mockWx.removeStorageSync).toHaveBeenCalledWith(key)
      })
    })
  })

  describe('Toast 相关函数', () => {
    test('showToast 应能显示成功提示', () => {
      util.showToast('操作成功', 'success')
      
      expect(mockWx.showToast).toHaveBeenCalledWith({
        title: '操作成功',
        icon: 'success',
        duration: 2000
      })
    })

    test('showToast 应能显示错误提示', () => {
      util.showToast('操作失败', 'error')
      
      expect(mockWx.showToast).toHaveBeenCalledWith({
        title: '操作失败',
        icon: 'error',
        duration: 2000
      })
    })

    test('showToast 默认显示普通提示', () => {
      util.showToast('普通提示')
      
      expect(mockWx.showToast).toHaveBeenCalledWith({
        title: '普通提示',
        icon: 'none',
        duration: 2000
      })
    })
  })

  describe('Loading 相关函数', () => {
    test('showLoading 应能显示加载提示', () => {
      util.showLoading('加载中...')
      
      expect(mockWx.showLoading).toHaveBeenCalledWith({
        title: '加载中...',
        mask: true
      })
    })

    test('hideLoading 应能隐藏加载提示', () => {
      util.hideLoading()
      
      expect(mockWx.hideLoading).toHaveBeenCalled()
    })
  })
})