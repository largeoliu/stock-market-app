// 工具函数
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 格式化日期为 YYYY-MM-DD
const formatDate = (date) => {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 计算日期差
const getDaysDiff = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000
  const firstDate = new Date(date1)
  const secondDate = new Date(date2)
  return Math.round(Math.abs((firstDate - secondDate) / oneDay))
}

// 获取指定时间范围的开始日期
const getStartDate = (period) => {
  const now = new Date()
  let startDate = new Date()
  
  switch (period) {
    case '3y':
      startDate.setFullYear(now.getFullYear() - 3)
      break
    case '5y':
      startDate.setFullYear(now.getFullYear() - 5)
      break
    case '10y':
      startDate.setFullYear(now.getFullYear() - 10)
      break
    case 'max':
      startDate = new Date('2000-01-01') // 假设最早从2000年开始
      break
    default:
      startDate.setFullYear(now.getFullYear() - 1) // 默认1年
  }
  
  return formatDate(startDate)
}

// 防抖函数
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 节流函数
const throttle = (func, limit) => {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 显示提示消息
const showToast = (title, icon = 'none', duration = 2000) => {
  wx.showToast({
    title,
    icon,
    duration
  })
}

// 显示加载中
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  })
}

// 隐藏加载中
const hideLoading = () => {
  wx.hideLoading()
}

// 存储数据到本地
const setStorage = (key, data) => {
  try {
    wx.setStorageSync(key, data)
    return true
  } catch (error) {
    console.error('存储数据失败:', error)
    return false
  }
}

// 从本地获取数据
const getStorage = (key, defaultValue = null) => {
  try {
    const data = wx.getStorageSync(key)
    return data || defaultValue
  } catch (error) {
    console.error('获取数据失败:', error)
    return defaultValue
  }
}

// 删除本地数据
const removeStorage = (key) => {
  try {
    wx.removeStorageSync(key)
    return true
  } catch (error) {
    console.error('删除数据失败:', error)
    return false
  }
}

module.exports = {
  formatTime,
  formatDate,
  getDaysDiff,
  getStartDate,
  debounce,
  throttle,
  showToast,
  showLoading,
  hideLoading,
  setStorage,
  getStorage,
  removeStorage
}