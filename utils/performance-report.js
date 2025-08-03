/**
 * 性能监控报告和分析工具
 * 提供性能数据的收集、分析和报告功能
 */

const performanceMonitor = require('./performance.js')
const track = require('./track.js')

class PerformanceReport {
  constructor() {
    this.reportData = {
      appLaunch: [],
      pageLoad: [],
      apiCalls: [],
      memoryUsage: [],
      errors: []
    }
    
    this.thresholds = {
      appLaunch: { excellent: 1500, good: 2500, poor: 4000 },
      pageLoad: { excellent: 800, good: 1500, poor: 3000 },
      apiResponse: { excellent: 500, good: 1500, poor: 3000 }
    }
    
    this.isEnabled = true
    this.reportInterval = 5 * 60 * 1000 // 5分钟生成一次报告
    
    this.startPeriodicReporting()
  }

  /**
   * 启动定期报告
   */
  startPeriodicReporting() {
    if (!this.isEnabled) return
    
    setInterval(() => {
      this.generatePerformanceReport()
    }, this.reportInterval)
  }

  /**
   * 记录应用启动性能
   * @param {Object} data 启动性能数据
   */
  recordAppLaunch(data) {
    this.reportData.appLaunch.push({
      ...data,
      timestamp: Date.now(),
      grade: this.gradePerformance('appLaunch', data.totalTime)
    })
    
    // 保持最近20条记录
    if (this.reportData.appLaunch.length > 20) {
      this.reportData.appLaunch.shift()
    }
  }

  /**
   * 记录页面加载性能
   * @param {Object} data 页面加载性能数据
   */
  recordPageLoad(data) {
    this.reportData.pageLoad.push({
      ...data,
      timestamp: Date.now(),
      grade: this.gradePerformance('pageLoad', data.totalTime)
    })
    
    // 保持最近50条记录
    if (this.reportData.pageLoad.length > 50) {
      this.reportData.pageLoad.shift()
    }
  }

  /**
   * 记录API调用性能
   * @param {Object} data API调用性能数据
   */
  recordApiCall(data) {
    this.reportData.apiCalls.push({
      ...data,
      timestamp: Date.now(),
      grade: this.gradePerformance('apiResponse', data.responseTime)
    })
    
    // 保持最近100条记录
    if (this.reportData.apiCalls.length > 100) {
      this.reportData.apiCalls.shift()
    }
  }

  /**
   * 记录内存使用
   * @param {Object} data 内存使用数据
   */
  recordMemoryUsage(data) {
    this.reportData.memoryUsage.push({
      ...data,
      timestamp: Date.now()
    })
    
    // 保持最近30条记录
    if (this.reportData.memoryUsage.length > 30) {
      this.reportData.memoryUsage.shift()
    }
  }

  /**
   * 记录错误信息
   * @param {Object} data 错误数据
   */
  recordError(data) {
    this.reportData.errors.push({
      ...data,
      timestamp: Date.now()
    })
    
    // 保持最近50条记录
    if (this.reportData.errors.length > 50) {
      this.reportData.errors.shift()
    }
  }

  /**
   * 性能评分
   * @param {string} type 性能类型
   * @param {number} value 性能值
   * @returns {string} 评分等级
   */
  gradePerformance(type, value) {
    const threshold = this.thresholds[type]
    if (!threshold) return 'unknown'
    
    if (value <= threshold.excellent) return 'excellent'
    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'poor'
    return 'very-poor'
  }

  /**
   * 计算性能统计
   * @param {Array} data 性能数据数组
   * @returns {Object} 统计结果
   */
  calculateStats(data) {
    if (!data || data.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p90: 0, p99: 0 }
    }
    
    const values = data.map(item => item.totalTime || item.responseTime || 0)
    values.sort((a, b) => a - b)
    
    const count = values.length
    const sum = values.reduce((acc, val) => acc + val, 0)
    const avg = Math.round(sum / count)
    const min = values[0]
    const max = values[count - 1]
    
    // 计算百分位数
    const p50 = values[Math.floor(count * 0.5)]
    const p90 = values[Math.floor(count * 0.9)]
    const p99 = values[Math.floor(count * 0.99)]
    
    return { count, avg, min, max, p50, p90, p99 }
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport() {
    try {
      const now = Date.now()
      const report = {
        timestamp: now,
        timeRange: '最近5分钟',
        
        // 应用启动性能
        appLaunch: {
          stats: this.calculateStats(this.reportData.appLaunch),
          gradeDistribution: this.getGradeDistribution(this.reportData.appLaunch),
          recentData: this.reportData.appLaunch.slice(-5)
        },
        
        // 页面加载性能
        pageLoad: {
          stats: this.calculateStats(this.reportData.pageLoad),
          gradeDistribution: this.getGradeDistribution(this.reportData.pageLoad),
          byPage: this.getPerformanceByPage(),
          recentData: this.reportData.pageLoad.slice(-10)
        },
        
        // API调用性能
        apiCalls: {
          stats: this.calculateStats(this.reportData.apiCalls),
          gradeDistribution: this.getGradeDistribution(this.reportData.apiCalls),
          byApi: this.getPerformanceByApi(),
          errorRate: this.getApiErrorRate(),
          recentData: this.reportData.apiCalls.slice(-10)
        },
        
        // 内存使用
        memoryUsage: {
          current: this.reportData.memoryUsage.slice(-1)[0]?.memoryUsage || 0,
          peak: Math.max(...this.reportData.memoryUsage.map(item => item.memoryUsage || 0)),
          average: this.getAverageMemoryUsage(),
          trend: this.getMemoryTrend()
        },
        
        // 错误统计
        errors: {
          count: this.reportData.errors.length,
          types: this.getErrorTypes(),
          recentErrors: this.reportData.errors.slice(-5)
        },
        
        // 总体健康度评分
        healthScore: this.calculateHealthScore()
      }
      
      
      // 上报性能报告
      this.uploadReport(report)
      
      return report
      
    } catch (error) {
      console.error('生成性能报告失败:', error)
    }
  }

  /**
   * 获取评分分布
   * @param {Array} data 性能数据
   * @returns {Object} 评分分布
   */
  getGradeDistribution(data) {
    const distribution = { excellent: 0, good: 0, poor: 0, 'very-poor': 0 }
    
    data.forEach(item => {
      if (item.grade) {
        distribution[item.grade] = (distribution[item.grade] || 0) + 1
      }
    })
    
    return distribution
  }

  /**
   * 按页面统计性能
   * @returns {Object} 页面性能统计
   */
  getPerformanceByPage() {
    const pageStats = {}
    
    this.reportData.pageLoad.forEach(item => {
      const pageName = item.pageName || 'unknown'
      if (!pageStats[pageName]) {
        pageStats[pageName] = []
      }
      pageStats[pageName].push(item)
    })
    
    // 计算每个页面的统计信息
    Object.keys(pageStats).forEach(pageName => {
      pageStats[pageName] = this.calculateStats(pageStats[pageName])
    })
    
    return pageStats
  }

  /**
   * 按API统计性能
   * @returns {Object} API性能统计
   */
  getPerformanceByApi() {
    const apiStats = {}
    
    this.reportData.apiCalls.forEach(item => {
      const apiPath = item.apiPath || 'unknown'
      if (!apiStats[apiPath]) {
        apiStats[apiPath] = []
      }
      apiStats[apiPath].push(item)
    })
    
    // 计算每个API的统计信息
    Object.keys(apiStats).forEach(apiPath => {
      apiStats[apiPath] = this.calculateStats(apiStats[apiPath])
    })
    
    return apiStats
  }

  /**
   * 获取API错误率
   * @returns {number} 错误率百分比
   */
  getApiErrorRate() {
    const totalCalls = this.reportData.apiCalls.length
    if (totalCalls === 0) return 0
    
    const errorCalls = this.reportData.apiCalls.filter(item => !item.success).length
    return Math.round((errorCalls / totalCalls) * 100 * 100) / 100 // 保留两位小数
  }

  /**
   * 获取平均内存使用
   * @returns {number} 平均内存使用量
   */
  getAverageMemoryUsage() {
    if (this.reportData.memoryUsage.length === 0) return 0
    
    const sum = this.reportData.memoryUsage.reduce((acc, item) => acc + (item.memoryUsage || 0), 0)
    return Math.round(sum / this.reportData.memoryUsage.length)
  }

  /**
   * 获取内存使用趋势
   * @returns {string} 趋势描述
   */
  getMemoryTrend() {
    if (this.reportData.memoryUsage.length < 2) return 'stable'
    
    const recent = this.reportData.memoryUsage.slice(-5)
    const first = recent[0].memoryUsage || 0
    const last = recent[recent.length - 1].memoryUsage || 0
    
    const change = ((last - first) / first) * 100
    
    if (change > 10) return 'increasing'
    if (change < -10) return 'decreasing'
    return 'stable'
  }

  /**
   * 获取错误类型统计
   * @returns {Object} 错误类型分布
   */
  getErrorTypes() {
    const errorTypes = {}
    
    this.reportData.errors.forEach(error => {
      const type = error.errorType || 'unknown'
      errorTypes[type] = (errorTypes[type] || 0) + 1
    })
    
    return errorTypes
  }

  /**
   * 计算健康度评分
   * @returns {number} 健康度评分 (0-100)
   */
  calculateHealthScore() {
    let score = 100
    
    // 应用启动性能评分 (权重: 25%)
    const appLaunchStats = this.calculateStats(this.reportData.appLaunch)
    if (appLaunchStats.avg > this.thresholds.appLaunch.poor) score -= 25
    else if (appLaunchStats.avg > this.thresholds.appLaunch.good) score -= 15
    else if (appLaunchStats.avg > this.thresholds.appLaunch.excellent) score -= 5
    
    // 页面加载性能评分 (权重: 25%)
    const pageLoadStats = this.calculateStats(this.reportData.pageLoad)
    if (pageLoadStats.avg > this.thresholds.pageLoad.poor) score -= 25
    else if (pageLoadStats.avg > this.thresholds.pageLoad.good) score -= 15
    else if (pageLoadStats.avg > this.thresholds.pageLoad.excellent) score -= 5
    
    // API调用性能评分 (权重: 30%)
    const apiErrorRate = this.getApiErrorRate()
    if (apiErrorRate > 10) score -= 30
    else if (apiErrorRate > 5) score -= 20
    else if (apiErrorRate > 1) score -= 10
    
    // 内存使用评分 (权重: 10%)
    const avgMemory = this.getAverageMemoryUsage()
    if (avgMemory > 100) score -= 10
    else if (avgMemory > 50) score -= 5
    
    // 错误率评分 (权重: 10%)
    const errorCount = this.reportData.errors.length
    if (errorCount > 10) score -= 10
    else if (errorCount > 5) score -= 5
    
    return Math.max(0, Math.round(score))
  }

  /**
   * 上报性能报告
   * @param {Object} report 性能报告
   */
  uploadReport(report) {
    try {
      track.reportEvent('performance_report', {
        health_score: report.healthScore,
        app_launch_avg: report.appLaunch.stats.avg,
        page_load_avg: report.pageLoad.stats.avg,
        api_error_rate: report.apiCalls.errorRate,
        memory_usage: report.memoryUsage.current,
        error_count: report.errors.count
      })
    } catch (error) {
      console.error('上报性能报告失败:', error)
    }
  }

  /**
   * 获取实时性能摘要
   * @returns {Object} 性能摘要
   */
  getPerformanceSummary() {
    return {
      healthScore: this.calculateHealthScore(),
      appLaunchTime: this.reportData.appLaunch.slice(-1)[0]?.totalTime || 0,
      avgPageLoadTime: this.calculateStats(this.reportData.pageLoad).avg,
      apiErrorRate: this.getApiErrorRate(),
      memoryUsage: this.reportData.memoryUsage.slice(-1)[0]?.memoryUsage || 0,
      errorCount: this.reportData.errors.length
    }
  }

  /**
   * 清理旧数据
   */
  cleanupOldData() {
    const maxAge = 24 * 60 * 60 * 1000 // 24小时
    const now = Date.now()
    
    Object.keys(this.reportData).forEach(key => {
      this.reportData[key] = this.reportData[key].filter(item => 
        now - item.timestamp < maxAge
      )
    })
    
  }

  /**
   * 启用/禁用性能报告
   * @param {boolean} enabled 是否启用
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
  }
}

// 创建全局单例
const performanceReport = new PerformanceReport()

module.exports = performanceReport