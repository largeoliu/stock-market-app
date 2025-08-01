# 环境配置说明

## 多环境支持

小程序支持两套服务器环境：
- **test**: 测试环境，用于开发和调试
- **bull**: 生产环境，用于正式发布

## 自动环境切换

系统会根据运行环境自动切换：

### 开发环境 (使用test服务)
- 在微信开发者工具中运行时
- 手动设置了开发模式标识时
- 检测到调试模式时

### 生产环境 (使用bull服务)
- 通过VSCode task上传的正式版本
- 用户手机上运行的小程序
- 其他非开发环境

## 手动控制环境

### 方法1: 代码控制
```javascript
const stockAPI = require('../../utils/api.js')

// 切换到开发环境
stockAPI.setDevelopmentMode(true)

// 切换到生产环境  
stockAPI.setDevelopmentMode(false)
```

### 方法2: 存储标识
在微信开发者工具的Storage面板中：
- 添加key: `__dev_mode__`, value: `true` → 强制使用test环境
- 删除该key → 恢复自动判断

## 环境判断逻辑

系统按以下优先级判断环境：

1. **平台检测**: `systemInfo.platform === 'devtools'`
2. **存储标识**: `wx.getStorageSync('__dev_mode__')`  
3. **调试模式**: `__wxConfig.debug`
4. **默认**: 生产环境

## 开发流程建议

### 开发调试时
1. 在微信开发者工具中直接运行（自动使用test环境）
2. 或手动调用 `stockAPI.setDevelopmentMode(true)`

### 发布上线时
1. 使用VSCode task: `Ctrl+Shift+P` → `Tasks: Run Task` → `上传小程序`
2. 系统自动使用bull生产环境

### 验证环境
查看控制台日志：
- `API环境: 开发环境(test)` → 使用test服务
- `API环境: 生产环境(bull)` → 使用bull服务

## 注意事项

- 环境切换后会立即生效，无需重启小程序
- 生产版本用户无法切换到test环境（安全考虑）
- 开发时建议验证数据是否正确同步到对应环境

---

这样的配置确保了开发和生产环境的完全隔离，避免测试数据污染生产环境。