// 微信小程序专用图表库 - 简化版本
// 避免 Foundation.onLoad 等兼容性问题

// 阻止所有可能的全局污染
(function() {
  'use strict';
  
  // 安全的全局对象处理
  const safeGlobal = (function() {
    try {
      return (typeof global !== 'undefined') ? global : 
             (typeof window !== 'undefined') ? window : 
             (typeof self !== 'undefined') ? self : {};
    } catch (e) {
      return {};
    }
  })();

  // 防护性设置 Foundation
  if (!safeGlobal.Foundation) {
    try {
      safeGlobal.Foundation = {
        onLoad: function() { /* noop */ }
      };
    } catch (e) {
      // 忽略设置失败
    }
  }

  class SimpleChart {
    constructor(canvas, width, height, dpr) {
      this.canvas = canvas || {};
      this.width = Math.max(width || 300, 200);
      this.height = Math.max(height || 200, 150);
      this.dpr = dpr || 1;
      this._options = null;
      this._ready = false;
      
      // 延迟标记为就绪，确保画布已初始化
      setTimeout(() => {
        this._ready = true;
        if (this._pendingOptions) {
          this.setOption(this._pendingOptions);
          this._pendingOptions = null;
        }
      }, 100);
    }

    setOption(option) {
      if (!option) return;
      
      if (!this._ready) {
        this._pendingOptions = option;
        return;
      }
      
      this._options = option;
      this._render();
    }

    _render() {
      if (!this._options || !this._ready) return;
      
      try {
        this._drawChart();
      } catch (error) {
        console.warn('图表渲染失败:', error.message);
        this._drawFallback();
      }
    }

    _getContext() {
      try {
        if (this.canvas.getContext) {
          return this.canvas.getContext();
        } else if (this.canvas.ctx) {
          return this.canvas.ctx;
        }
        return null;
      } catch (e) {
        console.warn('获取canvas上下文失败:', e.message);
        return null;
      }
    }

    _drawChart() {
      const ctx = this._getContext();
      if (!ctx) {
        this._drawFallback();
        return;
      }

      // 检查数据
      const series = this._options.series && this._options.series[0];
      const data = series && series.data;
      const xData = this._options.xAxis && this._options.xAxis.data;
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        this._drawEmpty(ctx);
        return;
      }

      // 清空画布
      try {
        ctx.clearRect(0, 0, this.width, this.height);
      } catch (e) {
        // 清空失败时尝试填充白色背景
        try {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, this.width, this.height);
        } catch (e2) {
          // 忽略
        }
      }

      // 绘制参数
      const padding = 40;
      const chartWidth = Math.max(this.width - padding * 2, 100);
      const chartHeight = Math.max(this.height - padding * 2, 80);
      
      const minValue = Math.min(...data);
      const maxValue = Math.max(...data);
      const valueRange = Math.max(maxValue - minValue, 1);

      this._drawGrid(ctx, padding, chartWidth, chartHeight);
      this._drawArea(ctx, data, padding, chartWidth, chartHeight, minValue, valueRange, series.areaStyle);
      this._drawLine(ctx, data, padding, chartWidth, chartHeight, minValue, valueRange);
      this._drawLabels(ctx, data, xData, padding, chartWidth, chartHeight, minValue, maxValue);
      
      // 调用微信小程序draw方法
      try {
        if (ctx.draw) {
          ctx.draw();
        }
      } catch (e) {
        // 忽略draw调用失败
      }
    }

    _drawGrid(ctx, padding, chartWidth, chartHeight) {
      try {
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        
        // 水平网格线
        for (let i = 1; i < 4; i++) {
          const y = padding + (i / 4) * chartHeight;
          ctx.beginPath();
          ctx.moveTo(padding, y);
          ctx.lineTo(padding + chartWidth, y);
          ctx.stroke();
        }

        // 坐标轴
        ctx.strokeStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.stroke();
      } catch (e) {
        // 忽略网格绘制失败
      }
    }

    _drawArea(ctx, data, padding, chartWidth, chartHeight, minValue, valueRange, areaStyle) {
      if (!areaStyle || data.length < 2) return;
      
      try {
        ctx.fillStyle = 'rgba(18, 150, 219, 0.15)';
        ctx.beginPath();
        
        // 绘制面积路径
        data.forEach((value, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth;
          const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        
        // 闭合到x轴
        const lastX = padding + chartWidth;
        const baseY = padding + chartHeight;
        ctx.lineTo(lastX, baseY);
        ctx.lineTo(padding, baseY);
        ctx.closePath();
        ctx.fill();
      } catch (e) {
        // 忽略面积绘制失败
      }
    }

    _drawLine(ctx, data, padding, chartWidth, chartHeight, minValue, valueRange) {
      if (data.length < 2) return;
      
      try {
        ctx.strokeStyle = '#1296db';
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((value, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth;
          const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        
        ctx.stroke();
      } catch (e) {
        // 忽略线条绘制失败
      }
    }

    _drawLabels(ctx, data, xData, padding, chartWidth, chartHeight, minValue, maxValue) {
      try {
        ctx.fillStyle = '#666666';
        ctx.font = `${Math.max(10, 12 * this.dpr)}px Arial`;
        
        // Y轴标签
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 3; i++) {
          const value = minValue + (maxValue - minValue) * (i / 3);
          const y = padding + chartHeight - (i / 3) * chartHeight;
          const label = this._formatValue(value);
          ctx.fillText(label, padding - 8, y);
        }

        // X轴标签
        if (xData && xData.length > 0) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const labelCount = Math.min(4, xData.length);
          for (let i = 0; i < labelCount; i++) {
            const index = Math.floor(i * (xData.length - 1) / Math.max(labelCount - 1, 1));
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const dateStr = xData[index];
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              const label = `${date.getMonth() + 1}/${date.getDate()}`;
              ctx.fillText(label, x, padding + chartHeight + 8);
            }
          }
        }
      } catch (e) {
        // 忽略标签绘制失败
      }
    }

    _drawEmpty(ctx) {
      try {
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.fillStyle = '#999999';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('暂无数据', this.width / 2, this.height / 2);
        
        if (ctx.draw) ctx.draw();
      } catch (e) {
        // 忽略
      }
    }

    _drawFallback() {
      // 如果所有绘制都失败，至少不要报错
      console.log('图表绘制降级处理');
    }

    _formatValue(value) {
      if (typeof value !== 'number' || isNaN(value)) return '0';
      
      if (value >= 1000000000000) {
        return (value / 1000000000000).toFixed(1) + '万亿';
      } else if (value >= 100000000) {
        return (value / 100000000).toFixed(1) + '亿';
      } else if (value >= 10000) {
        return (value / 10000).toFixed(1) + '万';
      } else {
        return value.toFixed(0);
      }
    }

    getZr() {
      return {
        handler: {
          dispatch: function() {},
          processGesture: function() {}
        }
      };
    }

    dispose() {
      this._ready = false;
      this._options = null;
      this._pendingOptions = null;
    }
  }

  // 导出对象
  const echarts = {
    init: function(canvas, theme, options) {
      try {
        const opts = options || {};
        return new SimpleChart(
          canvas, 
          opts.width || 300, 
          opts.height || 200, 
          opts.devicePixelRatio || 1
        );
      } catch (error) {
        console.error('图表初始化失败:', error);
        return {
          setOption: function() {},
          getZr: function() { return { handler: { dispatch: function() {}, processGesture: function() {} } }; },
          dispose: function() {}
        };
      }
    },

    setCanvasCreator: function(creator) {
      // 存储创建器函数
    }
  };

  // 模块导出
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = echarts;
  } else if (typeof exports !== 'undefined') {
    exports.echarts = echarts;
  }

})();