# 股值通 - 智能股票分析小程序

<div align="center">
  <h3>基于历史数据的股票价值分析工具</h3>
  
  [![小程序版本](https://img.shields.io/badge/版本-v1.0.11-blue.svg)](https://github.com/your-repo)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
  [![微信小程序](https://img.shields.io/badge/平台-微信小程序-09b955.svg)](https://mp.weixin.qq.com/)
</div>

## 📱 项目简介

股值通是一款专注于股票历史数据分析的微信小程序，通过展示股票的历史市值和实际换手率数据，帮助投资者了解股票的历史表现和流动性特征。

### 核心功能

- 🔍 **智能搜索** - 支持股票代码和名称搜索，提供热门推荐
- 📊 **历史市值分析** - 展示多时间维度的市值变化趋势
- 💹 **实际换手率** - 独特的流动性分析指标
- ⭐ **自选管理** - 云端同步的自选股列表
- 📈 **数据可视化** - 交互式图表，支持触摸查看详情
- 🏢 **稳定股东** - 展示主要股东持股信息

## 🚀 快速开始

### 环境要求

- 微信开发者工具最新版
- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/your-username/bull.git

# 进入项目目录
cd bull

# 安装依赖
npm install

# 配置API密钥
cp utils/api-config.example.js utils/api-config.js
# 编辑 utils/api-config.js 填入您的API配置
```

### 开发运行

1. 打开微信开发者工具
2. 导入项目，选择项目根目录
3. 填写AppID（测试可使用测试号）
4. 编译运行

## 📋 功能详情

### 搜索功能
- 实时搜索建议
- 搜索历史记录
- 热门股票推荐
- 支持A股、港股、美股

### 数据展示
- **市值走势**：1个月、3个月、6个月、1年、3年、5年
- **实际换手率**：展示流动性变化趋势
- **分位值计算**：当前数据在历史中的位置
- **稳定股东信息**：展示主要股东持股情况

### 交互特性
- 图表触摸交互，实时显示数据
- 下拉刷新数据
- 左滑删除功能
- 数据缓存优化

## 🏗️ 项目结构

```
bull/
├── pages/              # 页面文件
│   ├── index/         # 首页（搜索页）
│   └── detail/        # 详情页
├── components/        # 组件
│   ├── simple-chart/  # 原生canvas图表组件
│   ├── skeleton/      # 骨架屏组件
│   └── stock-compare/ # 股票对比组件
├── utils/            # 工具函数
│   ├── api.js        # API封装
│   ├── util.js       # 通用工具
│   ├── track.js      # 埋点统计
│   └── performance.js # 性能监控
├── ec-canvas/        # ECharts组件（备用）
└── images/           # 图片资源
```

## 🔧 配置说明

### API配置

在 `utils/api-config.js` 中配置：

```javascript
module.exports = {
  // Longbridge API配置
  LONGBRIDGE_APP_KEY: '你的APP_KEY',
  LONGBRIDGE_APP_SECRET: '你的APP_SECRET',
  LONGBRIDGE_ACCESS_TOKEN: '你的ACCESS_TOKEN',
  
  // API基础URL
  LONGBRIDGE_BASE_URL: 'https://openapi.longbridgeapp.com',
  
  // 其他配置...
}
```

### 小程序配置

在 `app.json` 中可以修改：
- 页面路由
- 窗口样式  
- 导航栏配置

## 📊 性能优化

- **数据缓存**：智能缓存策略，减少网络请求
- **懒加载**：按需加载组件和数据
- **防抖节流**：优化搜索和滚动性能
- **骨架屏**：提升加载体验
- **图表优化**：使用原生canvas提升性能

## 🛠️ 开发指南

### 代码规范
- 使用2空格缩进
- 使用async/await处理异步
- 组件采用Component构造器
- 遵循微信小程序官方规范

### 调试技巧
- 使用微信开发者工具的调试器
- 查看Network面板监控API请求
- 使用真机调试功能测试实际效果
- 性能面板分析页面性能

### Git提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- test: 测试相关
- chore: 构建/工具

## 📝 更新日志

### v1.0.11 (2024-01-20)
- ✨ 添加用户行为埋点功能
- 🚀 优化页面加载性能
- 🐛 修复图表交互问题
- 📊 新增性能监控功能

### v1.0.10 (2024-01-15)
- ✨ 新增实际换手率功能
- 🎨 优化图表交互体验
- 🔧 改进搜索算法
- 🐛 修复已知问题

[查看完整更新日志](docs/CHANGELOG.md)

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Longbridge](https://longbridgeapp.com/) - 提供股票数据API
- [微信小程序](https://mp.weixin.qq.com/) - 小程序平台支持
- 所有贡献者和使用者

---

<div align="center">
  <sub>Built with ❤️ by Bull Team</sub>
</div>