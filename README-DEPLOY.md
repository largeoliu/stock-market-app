# 微信小程序自动部署使用指南

## 快速开始

### 1. 确保微信开发者工具已安装

脚本会自动检测以下位置的微信开发者工具CLI：
- `/Applications/wechatwebdevtools.app/Contents/MacOS/cli` (macOS默认路径)  
- 系统PATH中的 `wx-cli` 命令

如果检测失败，请：
1. 确保微信开发者工具已正确安装
2. 或在微信开发者工具中：设置 -> 安全设置 -> 安装命令行

### 2. 使用VSCode任务

按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows)，然后：

#### 基础部署任务
- 输入 "Tasks: Run Task" 
- 选择 "微信小程序：上传" - 使用自动递增版本号上传
- 选择 "微信小程序：上传（指定版本）" - 手动输入版本号和描述

#### 辅助任务  
- "微信小程序：预览" - 生成预览二维码
- "微信小程序：检查配置" - 验证部署环境

### 3. 直接运行脚本

```bash
# 检查环境
node scripts/wx-upload.js --check

# 生成预览
node scripts/wx-upload.js --preview

# 默认上传（自动版本号）
node scripts/wx-upload.js

# 指定版本号上传
node scripts/wx-upload.js --version 1.2.0 --desc "修复搜索功能"
```

## 配置文件说明

### deploy.config.js
```javascript
{
  version: '1.0.0',        // 当前版本号
  desc: '版本描述',         // 默认版本描述
  ignoreFiles: [...],      // 上传时忽略的文件
  versionIncrement: {      // 版本号递增规则
    type: 'patch'          // patch/minor/major
  }
}
```

## 部署流程

1. **环境检查** - 自动检查微信CLI和项目配置
2. **版本管理** - 自动递增或手动指定版本号
3. **代码上传** - 调用微信CLI上传代码
4. **配置更新** - 自动更新本地配置文件
5. **提醒审核** - 提示去微信公众平台提交审核

## 常见问题

### Q: 提示"微信开发者工具 CLI 未安装"？
A: 请按照上面步骤1安装CLI工具

### Q: 上传失败？
A: 
1. 检查微信开发者工具是否登录
2. 确认project.config.json中的appid正确
3. 检查网络连接

### Q: 如何配置快捷键？
A: 在VSCode中按 `Cmd+K Cmd+S`，搜索 "workbench.action.tasks.runTask"，配置快捷键

## 文件结构

```
.vscode/
  tasks.json              # VSCode任务配置
scripts/
  wx-upload.js           # 核心上传脚本
deploy.config.js         # 部署配置
README-DEPLOY.md         # 本说明文件
```

## 版本号规则

- `patch` (1.0.0 -> 1.0.1): bug修复
- `minor` (1.0.0 -> 1.1.0): 新功能
- `major` (1.0.0 -> 2.0.0): 重大更新

默认使用patch递增，可在deploy.config.js中修改。