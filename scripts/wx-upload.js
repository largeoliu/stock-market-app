#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class WxUploader {
  constructor() {
    this.projectPath = process.cwd();
    this.configPath = path.join(this.projectPath, 'deploy.config.js');
    this.projectConfigPath = path.join(this.projectPath, 'project.config.json');
    
    // 解析命令行参数
    this.args = this.parseArgs();
    
    // 加载配置
    this.config = this.loadConfig();
    this.projectConfig = this.loadProjectConfig();
  }

  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {
      preview: false,
      check: false,
      version: null,
      desc: null,
      autoGit: true, // 默认自动提交git
      noGit: false
    };

    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--preview':
          parsed.preview = true;
          break;
        case '--check':
          parsed.check = true;
          break;
        case '--version':
          parsed.version = args[++i];
          break;
        case '--desc':
          parsed.desc = args[++i];
          break;
        case '--auto-git':
          parsed.autoGit = true;
          break;
        case '--no-git':
          parsed.noGit = true;
          parsed.autoGit = false;
          break;
      }
    }

    return parsed;
  }

  loadConfig() {
    if (fs.existsSync(this.configPath)) {
      return require(this.configPath);
    }
    
    // 默认配置
    return {
      version: '1.0.0',
      desc: '版本更新',
      outputPath: './dist',
      ignoreFiles: ['node_modules/**/*', '.git/**/*']
    };
  }

  loadProjectConfig() {
    if (!fs.existsSync(this.projectConfigPath)) {
      this.error('找不到 project.config.json 文件');
      process.exit(1);
    }
    
    return JSON.parse(fs.readFileSync(this.projectConfigPath, 'utf8'));
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m'
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}\x1b[0m`);
  }

  error(message) {
    this.log(message, 'error');
  }

  success(message) {
    this.log(message, 'success');
  }

  warning(message) {
    this.log(message, 'warning');
  }

  checkWxCli() {
    // macOS微信开发者工具CLI的完整路径
    const wxCliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';
    
    // 先检查固定路径
    if (fs.existsSync(wxCliPath)) {
      this.wxCliPath = wxCliPath;
      this.success('找到微信开发者工具 CLI');
      return true;
    }
    
    // 再检查是否在PATH中
    try {
      execSync('wx-cli --version', { stdio: 'pipe' });
      this.wxCliPath = 'wx-cli';
      this.success('微信开发者工具 CLI 已安装');
      return true;
    } catch (error) {
      this.error('微信开发者工具 CLI 未找到');
      this.log('请确保微信开发者工具已安装在：');
      this.log('/Applications/wechatwebdevtools.app/');
      this.log('或者设置 -> 安全设置 -> 安装命令行');
      return false;
    }
  }

  checkProjectConfig() {
    if (!this.projectConfig.appid) {
      this.error('project.config.json 中缺少 appid');
      return false;
    }
    
    if (!this.projectConfig.projectname) {
      this.warning('project.config.json 中缺少 projectname');
    }
    
    this.success(`项目配置检查通过 - AppID: ${this.projectConfig.appid}`);
    return true;
  }

  getNextVersion() {
    if (this.args.version) {
      return this.args.version;
    }
    
    // 自动递增版本号
    const currentVersion = this.config.version || '1.0.0';
    const parts = currentVersion.split('.');
    parts[2] = (parseInt(parts[2]) + 1).toString();
    
    return parts.join('.');
  }

  updateConfig(version, desc) {
    const newConfig = {
      ...this.config,
      version,
      desc,
      lastUpload: new Date().toISOString()
    };
    
    const configContent = `module.exports = ${JSON.stringify(newConfig, null, 2)};`;
    fs.writeFileSync(this.configPath, configContent);
    
    this.success(`配置已更新 - 版本: ${version}`);
  }

  async gitCommitAndPush(version, desc) {
    this.log('开始提交代码到Git...');
    
    try {
      // 检查git状态
      try {
        execSync('git status --porcelain', { stdio: 'pipe' });
      } catch (error) {
        this.warning('当前目录不是git仓库，跳过git操作');
        return false;
      }
      
      // 添加所有文件
      this.log('添加文件到暂存区...');
      execSync('git add .', { stdio: 'inherit' });
      
      // 提交
      const commitMessage = `release: v${version} - ${desc}

🚀 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;
      
      this.log(`提交代码: ${commitMessage.split('\n')[0]}`);
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      
      // 添加tag
      this.log(`创建版本标签: v${version}`);
      execSync(`git tag -a v${version} -m "Release v${version}: ${desc}"`, { stdio: 'inherit' });
      
      // 推送到远程
      this.log('推送到远程仓库...');
      execSync('git push origin main', { stdio: 'inherit' });
      execSync('git push origin --tags', { stdio: 'inherit' });
      
      this.success('代码已成功提交并推送到远程仓库！');
      this.success(`版本标签 v${version} 已创建`);
      
      return true;
      
    } catch (error) {
      this.error(`Git操作失败: ${error.message}`);
      this.warning('小程序已上传成功，但Git提交失败');
      return false;
    }
  }

  async upload() {
    const version = this.getNextVersion();
    const desc = this.args.desc || this.config.desc || '版本更新';
    
    this.log(`开始上传小程序...`);
    this.log(`版本号: ${version}`);
    this.log(`描述: ${desc}`);
    this.log(`AppID: ${this.projectConfig.appid}`);
    
    try {
      const cmd = [
        this.wxCliPath,
        'upload',
        '--project', this.projectPath,
        '--version', version,
        '--desc', desc
      ];
      
      this.log(`执行命令: ${cmd.join(' ')}`);
      
      const child = spawn(cmd[0], cmd.slice(1), {
        stdio: 'inherit',
        cwd: this.projectPath
      });
      
      child.on('close', async (code) => {
        if (code === 0) {
          this.success('小程序上传成功！');
          this.updateConfig(version, desc);
          
          let gitOperationSuccess = false;
          
          // 根据参数决定是否执行git操作
          if (this.args.autoGit && !this.args.noGit) {
            gitOperationSuccess = await this.gitCommitAndPush(version, desc);
          } else {
            this.log('跳过Git操作（使用了 --no-git 参数）');
          }
          
          this.log('');
          this.success('=== 部署完成 ===');
          this.log('✅ 小程序已上传');
          
          if (gitOperationSuccess) {
            this.log('✅ 代码已提交到Git');
            this.log('✅ 版本标签已创建');
          } else {
            this.log('⚠️  Git操作已跳过');
          }
          
          this.log('');
          this.log('请前往微信公众平台提交审核');
          this.log('https://mp.weixin.qq.com/');
        } else {
          this.error(`上传失败，退出代码: ${code}`);
          process.exit(1);
        }
      });
      
    } catch (error) {
      this.error(`上传失败: ${error.message}`);
      process.exit(1);
    }
  }

  async preview() {
    this.log('生成预览二维码...');
    
    try {
      const cmd = [
        this.wxCliPath,
        'preview',
        '--project', this.projectPath
      ];
      
      this.log(`执行命令: ${cmd.join(' ')}`);
      
      const child = spawn(cmd[0], cmd.slice(1), {
        stdio: 'inherit',
        cwd: this.projectPath
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          this.success('预览二维码生成成功！');
        } else {
          this.error(`预览失败，退出代码: ${code}`);
          process.exit(1);
        }
      });
      
    } catch (error) {
      this.error(`预览失败: ${error.message}`);
      process.exit(1);
    }
  }

  checkEnvironment() {
    this.log('检查部署环境...');
    
    let allOk = true;
    
    // 检查微信CLI
    if (!this.checkWxCli()) {
      allOk = false;
    }
    
    // 检查项目配置
    if (!this.checkProjectConfig()) {
      allOk = false;
    }
    
    // 检查必要文件
    const requiredFiles = ['app.js', 'app.json', 'app.wxss'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(this.projectPath, file))) {
        this.error(`缺少必要文件: ${file}`);
        allOk = false;
      }
    }
    
    if (allOk) {
      this.success('环境检查通过，可以进行部署！');
    } else {
      this.error('环境检查失败，请修复上述问题后重试');
      process.exit(1);
    }
  }

  async run() {
    if (this.args.check) {
      this.checkEnvironment();
      return;
    }
    
    if (this.args.preview) {
      this.checkEnvironment();
      await this.preview();
      return;
    }
    
    // 默认是上传
    this.checkEnvironment();
    await this.upload();
  }
}

// 运行
const uploader = new WxUploader();
uploader.run().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});