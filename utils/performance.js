/**
 * 性能监控工具类
 * 提供统一的性能数据收集、分析和上报功能
 */

const track = require('./track.js')
// 延迟加载避免循环依赖
let performanceReport = null

class PerformanceMonitor {
  constructor() {
    this.isEnabled = true
    this.timers = new Map() // 存储计时器
    this.metrics = new Map() // 存储性能指标
    this.thresholds = {
      // 性能阈值配置
      appLaunch: 2000,      // 启动时间阈值 2s
      pageLoad: 1000,       // 页面加载阈值 1s
      apiResponse: 3000,    // API响应阈值 3s
      renderTime: 500       // 渲染时间阈值 500ms
    }
    
    // 启动时记录应用启动时间
    this.appStartTime = Date.now()
    this.bindGlobalErrorHandler()
    
    // 延迟初始化报告模块
    setTimeout(() => {
      this.initReportModule()
    }, 1000)
  }

  /**
   * 初始化报告模块
   */
  initReportModule() {
    try {
      if (!performanceReport) {
        performanceReport = require('./performance-report.js')
      }
    } catch (error) {
    }
  }

  /**
   * 开始计时
   * @param {string} key 计时器键名
   */
  startTimer(key) {
    if (!this.isEnabled) return
    
    this.timers.set(key, {
      startTime: Date.now(),
      phases: {}
    })
  }

  /**
   * 记录阶段时间
   * @param {string} key 计时器键名
   * @param {string} phase 阶段名称
   */
  markPhase(key, phase) {
    if (!this.isEnabled) return
    
    const timer = this.timers.get(key)
    if (timer) {
      timer.phases[phase] = Date.now() - timer.startTime
    }
  }

  /**
   * 结束计时并上报
   * @param {string} key 计时器键名
   * @param {Object} context 额外上下文信息
   */
  endTimer(key, context = {}) {
    if (!this.isEnabled) return
    
    const timer = this.timers.get(key)
    if (!timer) return

    const totalTime = Date.now() - timer.startTime
    const result = {
      key,
      totalTime,
      phases: timer.phases,
      ...context
    }


    // 根据不同类型上报
    this.reportPerformance(key, result)
    
    // 清理计时器
    this.timers.delete(key)
    
    return result
  }

  /**
   * 上报性能数据
   * @param {string} type 性能类型
   * @param {Object} data 性能数据
   */
  reportPerformance(type, data) {
    try {
      // 检查是否超过阈值
      const isSlowPerformance = this.checkThreshold(type, data.totalTime)
      
      if (type.includes('app_launch')) {
        track.appLaunchPerformance(
          data.totalTime, 
          data.launchType || 'cold',
          data.phases
        )
        
        // 记录到性能报告
        if (performanceReport) {
          performanceReport.recordAppLaunch(data)
        }
      } else if (type.includes('page_load')) {
        track.pageLoadPerformance(
          data.pageName || 'unknown',
          data.totalTime,
          data.phases
        )
        
        // 记录到性能报告
        if (performanceReport) {
          performanceReport.recordPageLoad(data)
        }
      } else if (type.includes('api')) {
        track.apiPerformance(
          data.apiPath || 'unknown',
          data.totalTime,
          data.success !== false,
          data.errorType || ''
        )
        
        // 记录到性能报告
        if (performanceReport) {
          performanceReport.recordApiCall(data)
        }
      }

      // 慢性能告警
      if (isSlowPerformance) {
        this.reportSlowPerformance(type, data)
      }

    } catch (error) {
      console.error('[性能监控] 上报失败:', error)
    }
  }

  /**
   * 检查性能阈值
   * @param {string} type 性能类型
   * @param {number} time 耗时
   */
  checkThreshold(type, time) {
    const thresholdMap = {
      'app_launch': this.thresholds.appLaunch,
      'page_load': this.thresholds.pageLoad,
      'api': this.thresholds.apiResponse,
      'render': this.thresholds.renderTime
    }

    for (const [key, threshold] of Object.entries(thresholdMap)) {
      if (type.includes(key) && time > threshold) {
        return true
      }
    }
    return false
  }

  /**
   * 上报慢性能
   * @param {string} type 性能类型
   * @param {Object} data 性能数据
   */
  reportSlowPerformance(type, data) {
    console.warn(`[性能告警] ${type} 性能较慢: ${data.totalTime}ms`, data)
    
    track.errorReport('slow_performance', `${type} took ${data.totalTime}ms`, type)
  }

  /**
   * API性能监控装饰器
   * @param {string} apiPath API路径
   * @param {Function} apiCall API调用函数
   */
  async monitorApiCall(apiPath, apiCall) {
    const startTime = Date.now()
    let success = true
    let errorType = ''

    try {
      const result = await apiCall()
      return result
    } catch (error) {
      success = false
      errorType = this.getErrorType(error)
      throw error
    } finally {
      const responseTime = Date.now() - startTime
      
      // 上报API性能
      track.apiPerformance(apiPath, responseTime, success, errorType)
      
      // 检查慢查询
      if (responseTime > this.thresholds.apiResponse) {
        console.warn(`[API性能告警] ${apiPath} 响应较慢: ${responseTime}ms`)
      }
    }
  }

  /**
   * 获取错误类型
   * @param {Error} error 错误对象
   */
  getErrorType(error) {
    if (error.message.includes('timeout')) return 'timeout'
    if (error.message.includes('network')) return 'network'
    if (error.message.includes('400')) return 'client_error'
    if (error.message.includes('500')) return 'server_error'
    return 'unknown'
  }

  /**
   * 内存使用监控
   * @param {string} context 上下文
   */
  checkMemoryUsage(context = '') {
    if (!this.isEnabled) return
    
    try {
      // 小程序内存监控
      const memoryInfo = wx.getPerformance && wx.getPerformance().memory
      if (memoryInfo) {
        const memoryUsage = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)
        
        track.memoryUsage(memoryUsage, context)
        
        // 内存告警 (假设超过50MB告警)
        if (memoryUsage > 50) {
          console.warn(`[内存告警] 内存使用过高: ${memoryUsage}MB in ${context}`)
          track.errorReport('high_memory_usage', `Memory usage: ${memoryUsage}MB`, context)
        }
      }
    } catch (error) {
      console.error('[内存监控] 获取内存信息失败:', error)
    }
  }

  /**
   * 绑定全局错误处理
   */
  bindGlobalErrorHandler() {
    // 小程序全局错误监听
    if (typeof App !== 'undefined') {
      const originalApp = App
      App = function(appConfig) {
        const originalOnError = appConfig.onError
        appConfig.onError = function(error) {
          // 上报错误
          track.errorReport('js_error', error, 'global')
          
          // 调用原始错误处理
          if (originalOnError) {
            originalOnError.call(this, error)
          }
        }
        return originalApp.call(this, appConfig)
      }
    }

    // Promise rejection 监听
    if (typeof wx !== 'undefined' && wx.onUnhandledRejection) {
      wx.onUnhandledRejection((res) => {
        track.errorReport('promise_rejection', res.reason, 'global')
      })
    }
  }

  /**
   * 设置性能阈值
   * @param {Object} thresholds 阈值配置
   */
  setThresholds(thresholds) {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * 获取性能摘要
   */
  getPerformanceSummary() {
    const summary = {
      appRuntime: Date.now() - this.appStartTime,
      activeTimers: this.timers.size,
      metrics: Object.fromEntries(this.metrics),
      thresholds: this.thresholds
    }
    
    // 如果有性能报告模块，获取详细摘要
    if (performanceReport) {
      const reportSummary = performanceReport.getPerformanceSummary()
      summary.detailedReport = reportSummary
    }
    
    return summary
  }

  /**
   * 生成性能报告
   * @returns {Object} 性能报告
   */
  generatePerformanceReport() {
    if (performanceReport) {
      return performanceReport.generatePerformanceReport()
    } else {
      console.warn('[性能监控] 性能报告模块未初始化')
      return null
    }
  }

  /**
   * 启用/禁用性能监控
   * @param {boolean} enabled 是否启用
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
  }

  /**
   * 清理资源
   */
  destroy() {
    this.timers.clear()
    this.metrics.clear()
    this.isEnabled = false
  }
}

// 创建全局单例
const performanceMonitor = new PerformanceMonitor()

module.exports = performanceMonitor