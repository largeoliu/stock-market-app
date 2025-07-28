// pages/favorites/favorites.js
const util = require('../../utils/util.js')

Page({
  data: {
    favoriteStocks: [],
    loading: true,
    isEmpty: false
  },

  onLoad() {
    this.loadFavorites()
  },

  onShow() {
    this.loadFavorites()
  },

  // 加载收藏列表
  loadFavorites() {
    try {
      const favoriteStocks = util.getStorage('favorite_stocks', [])
      
      // 格式化时间显示
      const formattedStocks = favoriteStocks.map(stock => ({
        ...stock,
        formatTime: stock.timestamp ? new Date(stock.timestamp).toLocaleDateString() : '--'
      }))
      
      this.setData({
        favoriteStocks: formattedStocks,
        loading: false,
        isEmpty: formattedStocks.length === 0
      })
    } catch (error) {
      console.error('加载收藏列表失败:', error)
      this.setData({ 
        loading: false,
        isEmpty: true 
      })
    }
  },

  // 点击收藏项
  onFavoriteTap(e) {
    const stock = e.currentTarget.dataset.stock
    
    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/detail/detail?symbol=${stock.symbol}&name=${stock.name}&market=${stock.market}`
    })
  },

  // 删除收藏
  onDeleteFavorite(e) {
    e.stopPropagation() // 阻止事件冒泡
    
    const index = e.currentTarget.dataset.index
    const stock = this.data.favoriteStocks[index]
    
    wx.showModal({
      title: '确认删除',
      content: `确定要取消收藏 ${stock.name} 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.deleteFavoriteItem(index)
        }
      }
    })
  },

  // 删除收藏项
  deleteFavoriteItem(index) {
    const favoriteStocks = [...this.data.favoriteStocks]
    favoriteStocks.splice(index, 1)
    
    // 更新存储
    util.setStorage('favorite_stocks', favoriteStocks)
    
    // 更新全局数据
    const app = getApp()
    app.globalData.favoriteStocks = favoriteStocks
    
    // 更新页面
    this.setData({
      favoriteStocks: favoriteStocks,
      isEmpty: favoriteStocks.length === 0
    })
    
    util.showToast('已取消收藏', 'success')
  },

  // 清空所有收藏
  clearAllFavorites() {
    if (this.data.favoriteStocks.length === 0) {
      util.showToast('收藏列表为空')
      return
    }
    
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有收藏吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          util.removeStorage('favorite_stocks')
          
          const app = getApp()
          app.globalData.favoriteStocks = []
          
          this.setData({
            favoriteStocks: [],
            isEmpty: true
          })
          
          util.showToast('已清空收藏', 'success')
        }
      }
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我的股票收藏夹',
      path: '/pages/favorites/favorites'
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadFavorites()
    wx.stopPullDownRefresh()
  }
})