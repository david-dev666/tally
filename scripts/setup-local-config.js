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

/**
 * 生成出来的文件开头用它自己的说明，不能照抄示例文件的注释
 * —— 示例文件是「会被 git 跟踪的模板」，这个是「不会被跟踪的个人配置」，
 * 直接复制过去会出现自相矛盾的描述。
 */
const LOCAL_HEADER = `import type { Activity } from '../types';

/**
 * 你的个人配置 —— 本文件已被 .gitignore 忽略，不会被提交到任何地方
 *
 * 随便改：名称、图标、颜色。改完重启 App 即可生效（启动时会自动检测变化）。
 * 字段说明见同目录的 activities.example.ts。
 *
 * 想恢复成示例内容：删掉本文件，再跑一次 npm install。
 */
`;

try {
  if (fs.existsSync(localFile)) process.exit(0);

  if (!fs.existsSync(exampleFile)) {
    console.warn('[tally] 找不到 activities.example.ts，跳过个人配置初始化');
    process.exit(0);
  }

  // 去掉示例文件的头部（import 与注释块），只保留导出的数组
  const body = fs
    .readFileSync(exampleFile, 'utf8')
    .replace(/^[\s\S]*?\*\//, '')
    .replace(/^\s*\n/, '');

  fs.writeFileSync(localFile, `${LOCAL_HEADER}\n${body}`);
  console.log('[tally] 已从示例生成 src/config/activities.local.ts');
  console.log('[tally] 可以自由修改它，该文件不会被提交到 git');
} catch (error) {
  console.warn('[tally] 初始化个人配置失败：', error.message);
}
