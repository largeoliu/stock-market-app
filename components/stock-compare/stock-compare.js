// components/stock-compare/stock-compare.js
Component({
  properties: {
    stocks: {
      type: Array,
      value: []
    },
    period: {
      type: String,
      value: '1y'
    }
  },

  data: {
    chartOptions: {},
    loading: false
  },

  lifetimes: {
    attached() {
      this.updateChart()
    }
  },

  observers: {
    'stocks, period': function(stocks, period) {
      if (stocks && stocks.length > 0) {
        this.updateChart()
      }
    }
  },

  methods: {
    // 更新对比图表
    updateChart() {
      const { stocks } = this.data
      if (!stocks || stocks.length === 0) return

      // 生成对比图表数据
      const colors = ['#1296db', '#52c41a', '#ff4d4f', '#faad14', '#722ed1']
      const series = []
      const legend = []

      stocks.forEach((stock, index) => {
        if (stock.historyData && stock.historyData.length > 0) {
          const data = stock.historyData.map(item => item.marketCap)
          
          series.push({
            name: stock.name,
            type: 'line',
            data: data,
            smooth: true,
            symbol: 'none',
            lineStyle: {
              color: colors[index % colors.length],
              width: 2
            }
          })
          
          legend.push(stock.name)
        }
      })

      const dates = stocks[0]?.historyData?.map(item => item.date) || []

      const option = {
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            let result = `${params[0].name}<br/>`
            params.forEach(param => {
              const marketCap = this.formatMarketCap(param.value)
              result += `${param.seriesName}: ${marketCap}<br/>`
            })
            return result
          }
        },
        legend: {
          data: legend,
          top: 10
        },
        grid: {
          left: 40,
          right: 40,
          top: 60,
          bottom: 60
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: {
            formatter: (value) => {
              const date = new Date(value)
              return `${date.getMonth() + 1}/${date.getDate()}`
            }
          }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: (value) => {
              return this.formatMarketCap(value)
            }
          }
        },
        series: series
      }

      this.setData({ chartOptions: option })
    },

    // 格式化市值（统一使用亿为单位）
    formatMarketCap(value) {
      if (value >= 10000) {
        return (value / 10000).toFixed(1) + '万亿'
      } else {
        return value.toFixed(1) + '亿'
      }
    },

    // 初始化图表
    initChart(canvas, width, height, dpr) {
      const echarts = require('../../ec-canvas/echarts')
      
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      })
      
      canvas.setChart(chart)
      
      if (this.data.chartOptions && Object.keys(this.data.chartOptions).length > 0) {
        chart.setOption(this.data.chartOptions)
      }
      
      return chart
    }
  }
})