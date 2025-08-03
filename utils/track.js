/**
 * 埋点工具类 - 基于 wx.reportEvent
 * 用于统计用户关键操作行为
 */

class Track {
  constructor() {
    this.isEnabled = true; // 可以通过配置控制是否启用埋点
  }

  /**
   * 上报事件
   * @param {string} eventName 事件名称
   * @param {object} params 事件参数
   */
  reportEvent(eventName, params = {}) {
    if (!this.isEnabled) return;

    try {
      // 添加通用参数
      const commonParams = {
        timestamp: Date.now(),
        ...params
      };


      wx.reportEvent(eventName, commonParams);
    } catch (error) {
      console.error('埋点上报失败:', error);
    }
  }

  // ==================== 搜索相关埋点 ====================

  /**
   * 搜索提交
   * @param {string} keyword 搜索关键词
   * @param {number} resultCount 搜索结果数量
   */
  searchSubmit(keyword, resultCount = 0) {
    this.reportEvent('search_submit', {
      keyword: keyword,
      result_count: resultCount
    });
  }

  /**
   * 点击搜索结果
   * @param {string} stockSymbol 股票代码
   * @param {string} stockName 股票名称
   * @param {number} position 在搜索结果中的位置
   */
  searchResultClick(stockSymbol, stockName, position = 0) {
    this.reportEvent('search_result_click', {
      stock_symbol: stockSymbol,
      stock_name: stockName,
      position: position
    });
  }

  /**
   * 点击热门股票
   * @param {string} stockSymbol 股票代码
   * @param {string} stockName 股票名称
   * @param {number} position 在热门列表中的位置
   */
  hotStockClick(stockSymbol, stockName, position = 0) {
    this.reportEvent('hot_stock_click', {
      stock_symbol: stockSymbol,
      stock_name: stockName,
      position: position
    });
  }

  /**
   * 点击历史搜索
   * @param {string} stockSymbol 股票代码
   * @param {string} stockName 股票名称
   */
  recentSearchClick(stockSymbol, stockName) {
    this.reportEvent('recent_search_click', {
      stock_symbol: stockSymbol,
      stock_name: stockName
    });
  }

  // ==================== 功能交互埋点 ====================

  /**
   * 添加自选股
   * @param {string} stockSymbol 股票代码
   * @param {string} stockName 股票名称
   * @param {string} source 来源页面 index/detail
   */
  favoriteAdd(stockSymbol, stockName, source = '') {
    this.reportEvent('favorite_add', {
      stock_symbol: stockSymbol,
      stock_name: stockName,
      source: source
    });
  }

  /**
   * 取消自选股
   * @param {string} stockSymbol 股票代码
   * @param {string} stockName 股票名称
   * @param {string} source 来源页面 index/detail
   */
  favoriteRemove(stockSymbol, stockName, source = '') {
    this.reportEvent('favorite_remove', {
      stock_symbol: stockSymbol,
      stock_name: stockName,
      source: source
    });
  }

  /**
   * 切换时间段
   * @param {string} fromPeriod 原时间段
   * @param {string} toPeriod 新时间段
   * @param {string} stockSymbol 股票代码
   * @param {string} dataType 数据类型 marketCap/actualTurnover
   */
  periodSwitch(fromPeriod, toPeriod, stockSymbol, dataType = 'marketCap') {
    this.reportEvent('period_switch', {
      from_period: fromPeriod,
      to_period: toPeriod,
      stock_symbol: stockSymbol,
      data_type: dataType
    });
  }

  /**
   * 切换数据类型
   * @param {string} fromType 原数据类型
   * @param {string} toType 新数据类型
   * @param {string} stockSymbol 股票代码
   * @param {string} period 时间段
   */
  dataTypeSwitch(fromType, toType, stockSymbol, period = '1y') {
    this.reportEvent('data_type_switch', {
      from_type: fromType,
      to_type: toType,
      stock_symbol: stockSymbol,
      period: period
    });
  }

  /**
   * 分享点击
   * @param {string} stockSymbol 股票代码
   * @param {string} stockName 股票名称
   */
  shareClick(stockSymbol, stockName) {
    this.reportEvent('share_click', {
      stock_symbol: stockSymbol,
      stock_name: stockName
    });
  }

  // ==================== 功能管理埋点 ====================

  /**
   * 清空搜索历史
   * @param {number} historyCount 清空前的历史记录数量
   */
  clearSearchHistory(historyCount = 0) {
    this.reportEvent('clear_search_history', {
      history_count: historyCount
    });
  }

  /**
   * 清空自选股
   * @param {number} favoriteCount 清空前的自选股数量
   */
  clearFavorites(favoriteCount = 0) {
    this.reportEvent('clear_favorites', {
      favorite_count: favoriteCount
    });
  }

  /**
   * Tab切换
   * @param {string} fromTab 原Tab
   * @param {string} toTab 新Tab
   */
  tabSwitch(fromTab, toTab) {
    this.reportEvent('tab_switch', {
      from_tab: fromTab,
      to_tab: toTab
    });
  }

  // ==================== 性能监控埋点 ====================

  /**
   * 应用启动性能
   * @param {number} launchTime 启动耗时(ms)
   * @param {string} launchType 启动类型 cold/hot
   * @param {Object} phases 启动各阶段耗时
   */
  appLaunchPerformance(launchTime, launchType = 'cold', phases = {}) {
    this.reportEvent('app_launch_performance', {
      launch_time: launchTime,
      launch_type: launchType,
      cloud_init_time: phases.cloudInit || 0,
      data_migration_time: phases.dataMigration || 0,
      first_page_ready_time: phases.firstPageReady || 0
    });
  }

  /**
   * 页面加载性能
   * @param {string} pageName 页面名称
   * @param {number} loadTime 加载耗时(ms)
   * @param {Object} phases 加载各阶段耗时
   */
  pageLoadPerformance(pageName, loadTime, phases = {}) {
    this.reportEvent('page_load_performance', {
      page_name: pageName,
      load_time: loadTime,
      data_load_time: phases.dataLoad || 0,
      render_time: phases.render || 0,
      interactive_time: phases.interactive || 0
    });
  }

  /**
   * API接口性能
   * @param {string} apiPath 接口路径
   * @param {number} responseTime 响应耗时(ms)
   * @param {boolean} success 是否成功
   * @param {string} errorType 错误类型
   */
  apiPerformance(apiPath, responseTime, success = true, errorType = '') {
    this.reportEvent('api_performance', {
      api_path: apiPath,
      response_time: responseTime,
      success: success,
      error_type: errorType,
      is_cached: false // 后续会动态设置
    });
  }

  /**
   * 内存使用监控
   * @param {number} memoryUsage 内存使用量(MB)
   * @param {string} context 上下文(页面或操作)
   */
  memoryUsage(memoryUsage, context = '') {
    this.reportEvent('memory_usage', {
      memory_usage: memoryUsage,
      context: context,
      timestamp: Date.now()
    });
  }

  /**
   * 错误监控
   * @param {string} errorType 错误类型
   * @param {string} errorMessage 错误信息
   * @param {string} context 发生错误的上下文
   */
  errorReport(errorType, errorMessage, context = '') {
    this.reportEvent('error_report', {
      error_type: errorType,
      error_message: errorMessage,
      context: context,
      user_agent: wx.getSystemInfoSync().platform || 'unknown'
    });
  }

  /**
   * 缓存命中率统计
   * @param {string} cacheKey 缓存键
   * @param {boolean} hit 是否命中
   * @param {number} cacheAge 缓存年龄(ms)
   */
  cacheHitRate(cacheKey, hit = true, cacheAge = 0) {
    this.reportEvent('cache_hit_rate', {
      cache_key: cacheKey,
      hit: hit,
      cache_age: cacheAge
    });
  }

  // ==================== 工具方法 ====================

  /**
   * 启用/禁用埋点
   * @param {boolean} enabled 是否启用
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * 获取埋点状态
   */
  getEnabled() {
    return this.isEnabled;
  }
}

// 创建单例实例
const track = new Track();

module.exports = track;