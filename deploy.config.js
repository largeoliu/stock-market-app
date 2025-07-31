module.exports = {
  "version": "1.0.4",
  "desc": "添加用户行为埋点功能",
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
  "lastUpload": "2025-07-31T06:41:53.768Z",
  "deployHistory": []
};