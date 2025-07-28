import * as echarts from './echarts'

let ctx

Component({
  properties: {
    canvasId: {
      type: String,
      value: 'ec-canvas'
    },

    ec: {
      type: Object
    },

    forceUseOldCanvas: {
      type: Boolean,
      value: false
    }
  },

  data: {

  },

  ready: function () {
    if (!this.data.ec) {
      console.warn('组件需绑定 ec 变量，例：<ec-canvas id="mychart-dom-line" '
        + 'canvas-id="mychart-line" ec="{{ ec }}"></ec-canvas>')
      return
    }

    if (!this.data.ec.lazyLoad) {
      this.init()
    }
  },

  methods: {
    init: function (callback) {
      const version = wx.getSystemInfoSync().SDKVersion

      const canUseNewCanvas = wx.canIUse('canvas.type')

      const forceUseOldCanvas = this.data.forceUseOldCanvas
      const isUseNewCanvas = !forceUseOldCanvas && canUseNewCanvas && version >= '2.9.0'

      if (isUseNewCanvas) {
        this.initByNewWay(callback)
      } else {
        const isValid = version >= '1.9.91'
        if (!isValid) {
          console.error('微信基础库版本过低，需要使用 1.9.91 以上的版本。参见：https://github.com/ecomfe/echarts-for-weixin')
          return
        }
        this.initByOldWay(callback)
      }
    },

    initByOldWay(callback) {
      // version < 2.9.0：原来的方式初始化
      ctx = wx.createCanvasContext(this.data.canvasId, this)
      const canvas = new WxCanvas(ctx, this.data.canvasId)

      echarts.setCanvasCreator(() => {
        return canvas
      })
      // 延迟执行
      setTimeout(() => {
        const canvasDpr = wx.getSystemInfoSync().pixelRatio
        const canvasWidth = canvas.width
        const canvasHeight = canvas.height

        var ec = this.data.ec
        if (typeof callback === 'function') {
          this.chart = callback(canvas, canvasWidth, canvasHeight, canvasDpr)
        } else if (ec && typeof ec.onInit === 'function') {
          this.chart = ec.onInit(canvas, canvasWidth, canvasHeight, canvasDpr)
        } else {
          this.triggerEvent('init', {
            canvas: canvas,
            width: canvasWidth,
            height: canvasHeight,
            dpr: canvasDpr
          })
        }
      }, 100)
    },

    initByNewWay(callback) {
      // version >= 2.9.0：使用新的方式初始化
      const query = wx.createSelectorQuery().in(this)
      query
        .select('.ec-canvas')
        .fields({
          node: true,
          size: true
        })
        .exec((res) => {
          const canvasNode = res[0].node
          const canvasWidth = res[0].width
          const canvasHeight = res[0].height

          const ctx = canvasNode.getContext('2d')

          const canvas = new WxCanvas(ctx, this.data.canvasId, true, canvasNode)
          echarts.setCanvasCreator(() => {
            return canvas
          })

          var ec = this.data.ec
          if (typeof callback === 'function') {
            this.chart = callback(canvas, canvasWidth, canvasHeight, wx.getSystemInfoSync().pixelRatio)
          } else if (ec && typeof ec.onInit === 'function') {
            this.chart = ec.onInit(canvas, canvasWidth, canvasHeight, wx.getSystemInfoSync().pixelRatio)
          } else {
            this.triggerEvent('init', {
              canvas: canvas,
              width: canvasWidth,
              height: canvasHeight,
              dpr: wx.getSystemInfoSync().pixelRatio
            })
          }
        })
    },

    canvasToTempFilePath(opt) {
      const version = wx.getSystemInfoSync().SDKVersion

      const canUseNewCanvas = wx.canIUse('canvas.type')
      const forceUseOldCanvas = this.data.forceUseOldCanvas
      const isUseNewCanvas = !forceUseOldCanvas && canUseNewCanvas && version >= '2.9.0'

      if (isUseNewCanvas) {
        // 新版
        const query = wx.createSelectorQuery().in(this)
        query
          .select('.ec-canvas')
          .fields({
            node: true,
            size: true
          })
          .exec((res) => {
            const canvasNode = res[0].node
            opt.canvas = canvasNode
            wx.canvasToTempFilePath(opt)
          })
      } else {
        // 旧版
        if (!opt.canvasId) {
          opt.canvasId = this.data.canvasId
        }
        ctx.draw(true, () => {
          wx.canvasToTempFilePath(opt, this)
        })
      }
    },

    touchStart(e) {
      if (this.chart && e.touches.length > 0) {
        var touch = e.touches[0]
        var handler = this.chart.getZr().handler
        handler.dispatch('mousedown', {
          zrX: touch.x,
          zrY: touch.y
        })
        handler.dispatch('mousemove', {
          zrX: touch.x,
          zrY: touch.y
        })
        handler.processGesture(wrapTouch(e), 'start')
      }
    },

    touchMove(e) {
      if (this.chart && e.touches.length > 0) {
        var touch = e.touches[0]
        var handler = this.chart.getZr().handler
        handler.dispatch('mousemove', {
          zrX: touch.x,
          zrY: touch.y
        })
        handler.processGesture(wrapTouch(e), 'change')
      }
    },

    touchEnd(e) {
      if (this.chart) {
        const touch = e.changedTouches ? e.changedTouches[0] : {}
        var handler = this.chart.getZr().handler
        handler.dispatch('mouseup', {
          zrX: touch.x,
          zrY: touch.y
        })
        handler.dispatch('click', {
          zrX: touch.x,
          zrY: touch.y
        })
        handler.processGesture(wrapTouch(e), 'end')
      }
    }
  }
})

function wrapTouch(event) {
  for (let i = 0; i < event.touches.length; ++i) {
    const touch = event.touches[i]
    touch.offsetX = touch.x
    touch.offsetY = touch.y
  }
  return event
}

function WxCanvas(ctx, canvasId, isNew, canvasNode) {
  this.ctx = ctx
  this.canvasId = canvasId
  this.chart = null
  this.isNew = isNew

  if (isNew) {
    this.canvasNode = canvasNode
  } else {
    this._initStyle(ctx)
  }

  // mock canvas
  this.initCanvas = function() {}
}

WxCanvas.prototype.setChart = function (chart) {
  this.chart = chart
}

WxCanvas.prototype.attachEvent = function () {
  // noop
}

WxCanvas.prototype.detachEvent = function () {
  // noop
}

WxCanvas.prototype._initStyle = function (ctx) {
  var styles = ['fillStyle', 'strokeStyle', 'globalAlpha',
    'textAlign', 'textBaseline', 'font', 'globalCompositeOperation',
    'globalAlpha', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'shadowOffsetX', 'shadowOffsetY', 'shadowBlur', 'shadowColor',
    'lineDashOffset', 'createLinearGradient', 'createCircularGradient', 'createPattern', 'bezierCurveTo', 'quadraticCurveTo', 'scale', 'rotate',
    'translate', 'transform', 'setTransform', 'clearRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'fill', 'stroke',
    'arc', 'arcTo', 'fillText', 'strokeText', 'rect', 'strokeRect',
    'setLineDash', 'getLineDash', 'save', 'restore', 'getImageData', 'putImageData', 'createRadialGradient', 'drawImage',
    'measureText', 'clip', 'ellipse', 'arcTo']

  styles.forEach(style => {
    this[style] = (...args) => {
      return ctx[style](...args)
    }
  })
}

WxCanvas.prototype.getContext = function () {
  return this.ctx
}

WxCanvas.prototype.addEventListener = function () {
  // noop
}

WxCanvas.prototype.removeEventListener = function () {
  // noop
}

WxCanvas.prototype.getAttribute = function () {
  // noop
}

WxCanvas.prototype.releaseEvent = function () {
  // noop
}

WxCanvas.prototype.dispatchEvent = function () {
  // noop
}

WxCanvas.prototype.getBoundingClientRect = function() {
  return {
    top: 0,
    left: 0,
    width: this.width,
    height: this.height
  }
}

WxCanvas.prototype.getClientRects = function() {
  return [this.getBoundingClientRect()]
}

WxCanvas.prototype.setAttribute = function() {
  // noop
}

WxCanvas.prototype.removeAttribute = function() {
  // noop
}

WxCanvas.prototype.setAttributeNS = function() {
  // noop
}

WxCanvas.prototype.removeAttributeNS = function() {
  // noop
}

Object.defineProperty(WxCanvas.prototype, 'width', {
  get: function () {
    if (this.isNew) {
      return this.canvasNode.width
    } else {
      return this.ctx.canvas.width
    }
  },
  set: function (value) {
    if (this.isNew) {
      this.canvasNode.width = value
    } else {
      this.ctx.canvas.width = value
    }
  }
})

Object.defineProperty(WxCanvas.prototype, 'height', {
  get: function () {
    if (this.isNew) {
      return this.canvasNode.height
    } else {
      return this.ctx.canvas.height
    }
  },
  set: function (value) {
    if (this.isNew) {
      this.canvasNode.height = value
    } else {
      this.ctx.canvas.height = value
    }
  }
})

Object.defineProperty(WxCanvas.prototype, 'style', {
  get: function () {
    return {}
  }
})

Object.defineProperty(WxCanvas.prototype, 'clientWidth', {
  get: function () {
    return this.width
  }
})

Object.defineProperty(WxCanvas.prototype, 'clientHeight', {
  get: function () {
    return this.height
  }
})