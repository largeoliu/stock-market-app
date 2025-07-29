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
    canvasId: 'simple-chart'
  },

  ready() {
    // 组件准备好后绘制图表
    this.drawChart()
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
      
      // 计算绘图区域
      const padding = 40
      const chartWidth = width - padding * 2
      const chartHeight = height - padding * 2
      
      // 计算数据范围
      const minValue = Math.min(...data)
      const maxValue = Math.max(...data)
      const valueRange = Math.max(maxValue - minValue, 1)
      
      // 绘制网格线
      this.drawGrid(ctx, padding, chartWidth, chartHeight)
      
      // 绘制面积填充
      this.drawArea(ctx, data, padding, chartWidth, chartHeight, minValue, valueRange)
      
      // 绘制折线
      this.drawLine(ctx, data, padding, chartWidth, chartHeight, minValue, valueRange)
      
      // 绘制标签
      this.drawLabels(ctx, data, xData, padding, chartWidth, chartHeight, minValue, maxValue)
      
      // 执行绘制
      ctx.draw()
    },

    drawGrid(ctx, padding, chartWidth, chartHeight) {
      // 网格线 - Longbridge风格
      ctx.setStrokeStyle('rgba(0, 0, 0, 0.08)')
      ctx.setLineWidth(1)
      
      // 水平网格线
      for (let i = 1; i < 4; i++) {
        const y = padding + (i / 4) * chartHeight
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(padding + chartWidth, y)
        ctx.stroke()
      }
      
      // 坐标轴
      ctx.setStrokeStyle('rgba(0, 194, 255, 0.4)')
      ctx.setLineWidth(2)
      ctx.beginPath()
      ctx.moveTo(padding, padding)
      ctx.lineTo(padding, padding + chartHeight)
      ctx.lineTo(padding + chartWidth, padding + chartHeight)
      ctx.stroke()
    },

    drawArea(ctx, data, padding, chartWidth, chartHeight, minValue, valueRange) {
      if (data.length < 2) return
      
      // 创建渐变色 - Longbridge风格
      const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight)
      gradient.addColorStop(0, 'rgba(0, 194, 255, 0.4)')
      gradient.addColorStop(0.5, 'rgba(0, 129, 255, 0.2)')
      gradient.addColorStop(1, 'rgba(0, 194, 255, 0.02)')
      ctx.setFillStyle(gradient)
      
      ctx.beginPath()
      
      // 绘制面积路径
      data.forEach((value, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      // 闭合到x轴
      const lastX = padding + chartWidth
      const baseY = padding + chartHeight
      ctx.lineTo(lastX, baseY)
      ctx.lineTo(padding, baseY)
      ctx.closePath()
      ctx.fill()
    },

    drawLine(ctx, data, padding, chartWidth, chartHeight, minValue, valueRange) {
      if (data.length < 2) return
      
      // 主线条 - Longbridge风格
      ctx.setStrokeStyle('#00C2FF')
      ctx.setLineWidth(3)
      ctx.setLineCap('round')
      ctx.setLineJoin('round')
      ctx.beginPath()

      data.forEach((value, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
    },

    drawLabels(ctx, data, xData, padding, chartWidth, chartHeight, minValue, maxValue) {
      ctx.setFillStyle('#6B7280')
      ctx.setFontSize(12)
      
      // Y轴标签
      ctx.setTextAlign('right')
      ctx.setTextBaseline('middle')
      for (let i = 0; i <= 3; i++) {
        const value = minValue + (maxValue - minValue) * (i / 3)
        const y = padding + chartHeight - (i / 3) * chartHeight
        const label = this.formatValue(value)
        ctx.fillText(label, padding - 8, y)
      }

      // X轴标签
      if (xData && xData.length > 0) {
        ctx.setTextAlign('center')
        ctx.setTextBaseline('top')
        const labelCount = Math.min(4, xData.length)
        for (let i = 0; i < labelCount; i++) {
          const index = Math.floor(i * (xData.length - 1) / Math.max(labelCount - 1, 1))
          const x = padding + (index / (data.length - 1)) * chartWidth
          const dateStr = xData[index]
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            const label = `${date.getMonth() + 1}/${date.getDate()}`
            ctx.fillText(label, x, padding + chartHeight + 8)
          }
        }
      }
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