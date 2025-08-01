// 骨架屏组件
Component({
  properties: {
    // 是否显示骨架屏
    show: {
      type: Boolean,
      value: false
    },
    // 骨架屏类型
    type: {
      type: String,
      value: 'text' // text, stock-list, chart, search, detail
    },
    // 行数（适用于列表类型）
    rows: {
      type: Number,
      value: 3
    },
    // 自定义根节点样式类
    rootClass: {
      type: String,
      value: ''
    }
  },

  data: {},

  methods: {
    /**
     * 显示骨架屏
     */
    showSkeleton() {
      this.setData({ show: true })
    },

    /**
     * 隐藏骨架屏
     */
    hideSkeleton() {
      this.setData({ show: false })
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      console.log('[Skeleton] 骨架屏组件初始化', {
        type: this.data.type,
        show: this.data.show,
        rows: this.data.rows
      })
    }
  }
})