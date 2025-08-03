module.exports = {
  "version": "1.0.13",
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
  "lastUpload": "2025-08-03T00:36:27.175Z",
  "deployHistory": []
};