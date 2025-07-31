module.exports = {
  "version": "1.0.3",
  "desc": "修复忽略文件配置格式",
  "outputPath": "./dist",
  "ignoreFiles": [
    "node_modules/**/*",
    ".git/**/*",
    ".vscode/**/*",
    "scripts/**/*",
    "*.md",
    ".gitignore",
    "deploy.config.js"
  ],
  "requiredFiles": [
    "app.js",
    "app.json",
    "app.wxss",
    "project.config.json"
  ],
  "versionIncrement": {
    "type": "patch"
  },
  "wxConfig": {
    "openMpPlatform": false,
    "preview": {
      "pagePath": "pages/index/index",
      "searchQuery": ""
    }
  },
  "hooks": {
    "beforeDeploy": [],
    "afterDeploy": []
  },
  "lastUpload": "2025-07-31T03:40:22.942Z",
  "deployHistory": []
};