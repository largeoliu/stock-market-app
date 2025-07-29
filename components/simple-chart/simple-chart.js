// 简单的原生 canvas 图表组件
Component({
  properties: {
    data: {
      type: Array,
      value: []
    },
    xData: {
      type: Array,
      value: []
    },
    width: {
      type: Number,
      value: 300
    },
    height: {
      type: Number,
      value: 200
    }
  },

  data: {
    canvasId: 'simple-chart',
    hoveredIndex: -1, // 当前悬停的数据点索引
    showTooltip: false // 是否显示提示信息
  },

  ready() {
    // 组件准备好后绘制图表
    this.drawChart()
    
    // 绑定触摸事件
    this.bindTouchEvents()
  },

  observers: {
    'data, xData': function(data, xData) {
      // 数据变化时重新绘制
      if (data && data.length > 0) {
        setTimeout(() => {
          this.drawChart()
        }, 100)
      }
    }
  },

  methods: {
    drawChart() {
      const { data, xData, width, height } = this.properties
      
      if (!data || data.length === 0) {
        this.drawEmpty()
        return
      }

      const ctx = wx.createCanvasContext(this.data.canvasId, this)
      
      // 清空画布
      ctx.clearRect(0, 0, width, height)
      
      // 绘制背景 - Longbridge风格
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#FAFBFC')
      gradient.addColorStop(1, '#F5F7FA')
      ctx.setFillStyle(gradient)
      ctx.fillRect(0, 0, width, height)
      
      // 计算绘图区域 - 为信息面板留出空间
      const padding = 40
      const topPadding = 80 // 为信息面板留出更多空间
      const chartWidth = width - padding * 2
      const chartHeight = height - topPadding - padding
      
      // 计算数据范围
      const minValue = Math.min(...data)
      const maxValue = Math.max(...data)
      const valueRange = Math.max(maxValue - minValue, 1)
      
      // 绘制网格线
      this.drawGrid(ctx, padding, topPadding, chartWidth, chartHeight)
      
      // 绘制面积填充
      this.drawArea(ctx, data, padding, topPadding, chartWidth, chartHeight, minValue, valueRange)
      
      // 绘制折线
      this.drawLine(ctx, data, padding, topPadding, chartWidth, chartHeight, minValue, valueRange)
      
      // 绘制标签
      this.drawLabels(ctx, data, xData, padding, topPadding, chartWidth, chartHeight, minValue, maxValue)
      
      // 绘制信息面板（仅在有悬停时显示）
      if (this.data.showTooltip && this.data.hoveredIndex !== -1) {
        this.drawInfoPanel(ctx, data, xData, padding, topPadding, chartWidth, chartHeight, minValue, maxValue)
      }
      
      // 绘制悬停指示器
      if (this.data.showTooltip && this.data.hoveredIndex !== -1) {
        this.drawHoverIndicator(ctx, data, padding, topPadding, chartWidth, chartHeight, minValue, Math.max(maxValue - minValue, 1))
      }
      
      // 执行绘制
      ctx.draw()
    },

    drawGrid(ctx, padding, topPadding, chartWidth, chartHeight) {
      // 网格线 - Longbridge风格
      ctx.setStrokeStyle('rgba(0, 0, 0, 0.05)')
      ctx.setLineWidth(1)
      
      // 水平网格线
      for (let i = 1; i < 4; i++) {
        const y = topPadding + (i / 4) * chartHeight
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(padding + chartWidth, y)
        ctx.stroke()
      }
      
      // 坐标轴
      ctx.setStrokeStyle('rgba(0, 194, 255, 0.2)')
      ctx.setLineWidth(1)
      ctx.beginPath()
      ctx.moveTo(padding, topPadding)
      ctx.lineTo(padding, topPadding + chartHeight)
      ctx.lineTo(padding + chartWidth, topPadding + chartHeight)
      ctx.stroke()
    },

    drawArea(ctx, data, padding, topPadding, chartWidth, chartHeight, minValue, valueRange) {
      if (data.length < 2) return
      
      // 创建渐变色 - Longbridge风格
      const gradient = ctx.createLinearGradient(0, topPadding, 0, topPadding + chartHeight)
      gradient.addColorStop(0, 'rgba(0, 194, 255, 0.3)')
      gradient.addColorStop(0.5, 'rgba(0, 129, 255, 0.15)')
      gradient.addColorStop(1, 'rgba(0, 194, 255, 0.01)')
      ctx.setFillStyle(gradient)
      
      ctx.beginPath()
      
      // 绘制面积路径
      data.forEach((value, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth
        const y = topPadding + chartHeight - ((value - minValue) / valueRange) * chartHeight
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      // 闭合到x轴
      const lastX = padding + chartWidth
      const baseY = topPadding + chartHeight
      ctx.lineTo(lastX, baseY)
      ctx.lineTo(padding, baseY)
      ctx.closePath()
      ctx.fill()
    },

    drawLine(ctx, data, padding, topPadding, chartWidth, chartHeight, minValue, valueRange) {
      if (data.length < 2) return
      
      // 主线条 - Longbridge风格
      ctx.setStrokeStyle('#00C2FF')
      ctx.setLineWidth(2)
      ctx.setLineCap('round')
      ctx.setLineJoin('round')
      ctx.beginPath()

      data.forEach((value, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth
        const y = topPadding + chartHeight - ((value - minValue) / valueRange) * chartHeight
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
    },

    drawLabels(ctx, data, xData, padding, topPadding, chartWidth, chartHeight, minValue, maxValue) {
      ctx.setFillStyle('#9CA3AF')
      ctx.setFontSize(11)
      
      // Y轴标签
      ctx.setTextAlign('right')
      ctx.setTextBaseline('middle')
      for (let i = 0; i <= 3; i++) {
        const value = minValue + (maxValue - minValue) * (i / 3)
        const y = topPadding + chartHeight - (i / 3) * chartHeight
        const label = this.formatValue(value)
        ctx.fillText(label, padding - 8, y)
      }

      // X轴标签 - 只显示起始和结束时间
      if (xData && xData.length > 0) {
        ctx.setTextAlign('center')
        ctx.setTextBaseline('top')
        
        // 起始时间
        const startX = padding
        const startDateStr = xData[0]
        const startDate = new Date(startDateStr)
        if (!isNaN(startDate.getTime())) {
          const startLabel = startDate.toISOString().split('T')[0] // YYYY-MM-DD格式
          ctx.fillText(startLabel, startX, topPadding + chartHeight + 8)
        }
        
        // 结束时间
        const endX = padding + chartWidth
        const endDateStr = xData[xData.length - 1]
        const endDate = new Date(endDateStr)
        if (!isNaN(endDate.getTime())) {
          const endLabel = endDate.toISOString().split('T')[0] // YYYY-MM-DD格式
          ctx.fillText(endLabel, endX, topPadding + chartHeight + 8)
        }
      }
    },

    // 绘制信息面板
    drawInfoPanel(ctx, data, xData, padding, topPadding, chartWidth, chartHeight, minValue, maxValue) {
      if (!data || data.length === 0 || this.data.hoveredIndex === -1) return
      
      // 获取悬停点的数据
      const hoveredValue = data[this.data.hoveredIndex]
      const hoveredDate = xData && xData.length > this.data.hoveredIndex ? xData[this.data.hoveredIndex] : null
      
      // 计算分位值（当前值在历史数据中的百分位）
      const sortedData = [...data].sort((a, b) => a - b)
      const currentIndex = sortedData.findIndex(val => val >= hoveredValue)
      const percentile = ((currentIndex / (sortedData.length - 1)) * 100).toFixed(2)
      
      // 设置文字样式
      ctx.setTextAlign('left')
      ctx.setTextBaseline('top')
      
      let yOffset = 15
      
      // 显示日期
      if (hoveredDate) {
        const date = new Date(hoveredDate)
        if (!isNaN(date.getTime())) {
          ctx.setFillStyle('#6B7280')
          ctx.setFontSize(12)
          const dateLabel = date.toISOString().split('T')[0]
          ctx.fillText(dateLabel, padding, yOffset)
          yOffset += 25
        }
      }
      
      // 显示市值标签和数值
      ctx.setFillStyle('#374151')
      ctx.setFontSize(13)
      ctx.fillText('市值', padding, yOffset)
      
      ctx.setFillStyle('#00C2FF')
      ctx.setFontSize(16)
      ctx.fillText(this.formatValue(hoveredValue), padding + 60, yOffset)
      yOffset += 25
      
      // 显示分位值
      ctx.setFillStyle('#374151')
      ctx.setFontSize(13)
      ctx.fillText('分位值', padding, yOffset)
      
      ctx.setFillStyle('#6B7280')
      ctx.setFontSize(16)
      ctx.fillText(percentile, padding + 60, yOffset)
    },

    // 绘制悬停指示器
    drawHoverIndicator(ctx, data, padding, topPadding, chartWidth, chartHeight, minValue, valueRange) {
      if (this.data.hoveredIndex === -1 || !data || data.length === 0) return
      
      const hoveredValue = data[this.data.hoveredIndex]
      const x = padding + (this.data.hoveredIndex / (data.length - 1)) * chartWidth
      const y = topPadding + chartHeight - ((hoveredValue - minValue) / valueRange) * chartHeight
      
      // 绘制垂直参考线
      ctx.setStrokeStyle('rgba(0, 194, 255, 0.5)')
      ctx.setLineWidth(1)
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.moveTo(x, topPadding)
      ctx.lineTo(x, topPadding + chartHeight)
      ctx.stroke()
      ctx.setLineDash([]) // 重置虚线
      
      // 绘制悬停点
      ctx.setFillStyle('#FFFFFF')
      ctx.setStrokeStyle('#00C2FF')
      ctx.setLineWidth(2)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
    },

    // 绑定触摸事件
    bindTouchEvents() {
      // 这里需要使用小程序的触摸事件
      // 由于canvas组件的限制，我们需要在父组件中处理触摸事件
    },

    // 处理触摸移动
    onTouchMove(e) {
      const { data, width } = this.properties
      if (!data || data.length === 0) return
      
      const touch = e.touches[0]
      const x = touch.x
      
      // 计算触摸点对应的数据索引
      const padding = 40
      const chartWidth = width - padding * 2
      const relativeX = x - padding
      
      if (relativeX >= 0 && relativeX <= chartWidth) {
        const index = Math.round((relativeX / chartWidth) * (data.length - 1))
        const clampedIndex = Math.max(0, Math.min(index, data.length - 1))
        
        this.setData({
          hoveredIndex: clampedIndex,
          showTooltip: true
        })
        
        this.drawChart()
      }
    },

    // 处理触摸结束
    onTouchEnd() {
      this.setData({
        hoveredIndex: -1,
        showTooltip: false
      })
      this.drawChart()
    },

    drawEmpty() {
      const { width, height } = this.properties
      const ctx = wx.createCanvasContext(this.data.canvasId, this)
      
      // 背景 - Longbridge风格
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#FAFBFC')
      gradient.addColorStop(1, '#F5F7FA')
      ctx.setFillStyle(gradient)
      ctx.fillRect(0, 0, width, height)
      
      // 文字
      ctx.setFillStyle('#6B7280')
      ctx.setFontSize(14)
      ctx.setTextAlign('center')
      ctx.setTextBaseline('middle')
      ctx.fillText('暂无数据', width / 2, height / 2)
      
      ctx.draw()
    },

    formatValue(value) {
      if (typeof value !== 'number' || isNaN(value)) return '0'
      
      if (value >= 1000000000000) {
        return (value / 1000000000000).toFixed(1) + '万亿'
      } else if (value >= 100000000) {
        return (value / 100000000).toFixed(1) + '亿'
      } else if (value >= 10000) {
        return (value / 10000).toFixed(1) + '万'
      } else {
        return value.toFixed(0)
      }
    },

    // 添加光晕效果
    addGlowEffect(ctx, color, blur = 10) {
      ctx.setShadowColor(color)
      ctx.setShadowBlur(blur)
      ctx.setShadowOffsetX(0)
      ctx.setShadowOffsetY(0)
    },

    // 清除光晕效果
    clearGlowEffect(ctx) {
      ctx.setShadowColor('transparent')
      ctx.setShadowBlur(0)
      ctx.setShadowOffsetX(0)
      ctx.setShadowOffsetY(0)
    }
  }
})