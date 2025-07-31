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

      console.log(`[埋点] ${eventName}:`, commonParams);

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

  // ==================== 工具方法 ====================

  /**
   * 启用/禁用埋点
   * @param {boolean} enabled 是否启用
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`埋点${enabled ? '已启用' : '已禁用'}`);
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