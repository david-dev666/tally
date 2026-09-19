#!/usr/bin/env node
/**
 * 确保 src/config/activities.local.ts 存在。
 * 该文件被 .gitignore 忽略，所以别人 clone 项目后需要从示例生成一份。
 * 通过 package.json 的 postinstall 自动执行。
 */
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '..', 'src', 'config');
const localFile = path.join(configDir, 'activities.local.ts');
const exampleFile = path.join(configDir, 'activities.example.ts');

try {
  if (fs.existsSync(localFile)) process.exit(0);

  if (!fs.existsSync(exampleFile)) {
    console.warn('[tally] 找不到 activities.example.ts，跳过个人配置初始化');
    process.exit(0);
  }

  fs.copyFileSync(exampleFile, localFile);
  console.log('[tally] 已从示例生成 src/config/activities.local.ts');
  console.log('[tally] 可以自由修改它，该文件不会被提交到 git');
} catch (error) {
  console.warn('[tally] 初始化个人配置失败：', error.message);
}
