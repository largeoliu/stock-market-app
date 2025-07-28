// 这是一个简化的ECharts模拟文件
// 实际项目中需要使用完整的echarts-for-weixin库

let canvasCreator

class MockChart {
  constructor(canvas, width, height, dpr) {
    this.canvas = canvas
    this.width = width
    this.height = height
    this.dpr = dpr
    this._options = {}
  }

  setOption(option) {
    this._options = option
    this.render()
  }

  render() {
    const ctx = this.canvas.getContext()
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, this.width, this.height)

    // 绘制背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, this.width, this.height)

    if (!this._options.series || !this._options.series[0] || !this._options.series[0].data) {
      return
    }

    const data = this._options.series[0].data
    const xData = this._options.xAxis.data || []
    
    if (data.length === 0) return

    // 计算绘图区域
    const padding = 40
    const chartWidth = this.width - padding * 2
    const chartHeight = this.height - padding * 2
    
    // 计算数据范围
    const minValue = Math.min(...data)
    const maxValue = Math.max(...data)
    const valueRange = maxValue - minValue

    // 绘制坐标轴
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    
    // X轴
    ctx.beginPath()
    ctx.moveTo(padding, this.height - padding)
    ctx.lineTo(this.width - padding, this.height - padding)
    ctx.stroke()
    
    // Y轴
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, this.height - padding)
    ctx.stroke()

    // 绘制数据线
    if (data.length > 1) {
      ctx.strokeStyle = '#1296db'
      ctx.lineWidth = 2
      ctx.beginPath()

      data.forEach((value, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth
        const y = this.height - padding - ((value - minValue) / valueRange) * chartHeight
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()

      // 绘制填充区域
      if (this._options.series[0].areaStyle) {
        ctx.fillStyle = 'rgba(18, 150, 219, 0.1)'
        ctx.beginPath()
        
        data.forEach((value, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth
          const y = this.height - padding - ((value - minValue) / valueRange) * chartHeight
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        
        // 闭合到x轴
        ctx.lineTo(padding + chartWidth, this.height - padding)
        ctx.lineTo(padding, this.height - padding)
        ctx.closePath()
        ctx.fill()
      }
    }

    // 绘制网格线
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1
    
    // 水平网格线
    for (let i = 1; i < 4; i++) {
      const y = padding + (i / 4) * chartHeight
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(this.width - padding, y)
      ctx.stroke()
    }

    // 绘制标签
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    // X轴标签（显示部分日期）
    const labelCount = Math.min(5, xData.length)
    for (let i = 0; i < labelCount; i++) {
      const index = Math.floor(i * (xData.length - 1) / (labelCount - 1))
      const x = padding + (index / (data.length - 1)) * chartWidth
      const date = new Date(xData[index])
      const label = `${date.getMonth() + 1}/${date.getDate()}`
      ctx.fillText(label, x, this.height - padding + 10)
    }

    // Y轴标签
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let i = 0; i <= 4; i++) {
      const value = minValue + (maxValue - minValue) * (i / 4)
      const y = this.height - padding - (i / 4) * chartHeight
      const label = this.formatValue(value)
      ctx.fillText(label, padding - 10, y)
    }

    // 如果有canvas实例，需要调用draw
    if (this.canvas.ctx && this.canvas.ctx.draw) {
      this.canvas.ctx.draw()
    }
  }

  formatValue(value) {
    if (value >= 1000000000000) {
      return (value / 1000000000000).toFixed(1) + '万亿'
    } else if (value >= 100000000) {
      return (value / 100000000).toFixed(1) + '亿'
    } else if (value >= 10000) {
      return (value / 10000).toFixed(1) + '万'
    } else {
      return value.toFixed(0)
    }
  }

  getZr() {
    return {
      handler: {
        dispatch: () => {},
        processGesture: () => {}
      }
    }
  }

  dispose() {
    // 清理资源
  }
}

const echarts = {
  init: function(canvas, theme, options) {
    const { width, height, devicePixelRatio } = options
    return new MockChart(canvas, width, height, devicePixelRatio)
  },

  setCanvasCreator: function(creator) {
    canvasCreator = creator
  }
}

module.exports = echarts