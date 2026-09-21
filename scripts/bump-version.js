#!/usr/bin/env node
/**
 * 每次构建 APK 前自动推进版本号。
 *
 * Android 有两个版本号，职责不同：
 *   · versionCode —— 整数，机器用来判断「哪个包更新」。每次构建 +1。
 *   · versionName —— 字符串，人看的语义版本。每次构建 patch 位 +1。
 *
 * 也就是 `1.0.0` → `1.0.1` → `1.0.2` …… 一路小步往前走，永远不重复。
 *
 * major / minor 仍然由人掌握：想做有意义的升级（比如加了一组新功能要发
 * `1.1.0`），直接改 app.json 的 version 就行，脚本会在新基线上继续 +patch。
 *
 * 顺带把这两个值写回 android/app/build.gradle，省掉一次 expo prebuild
 * （prebuild 会清空整个 android/ 目录，触发全量重新编译，很慢）。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJsonPath = path.join(root, 'app.json');
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');

const config = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

if (!config.expo) {
  console.error('app.json 里找不到 expo 配置');
  process.exit(1);
}

const currentName = config.expo.version ?? '1.0.0';
const currentCode = Number(config.expo.android?.versionCode ?? 0);
const nextCode = currentCode + 1;

/** 只推进最后一位：`1.2.3` → `1.2.4`。格式不认识就原样返回，不猜。 */
function bumpPatch(name) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(name);
  if (!match) return name;
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

const nextName = bumpPatch(currentName);

config.expo.version = nextName;
config.expo.android = { ...config.expo.android, versionCode: nextCode };
fs.writeFileSync(appJsonPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(
  `[bump-version] app.json     versionName ${currentName} → ${nextName}` +
    ` · versionCode ${currentCode} → ${nextCode}`,
);

// 原生工程存在时才同步（没跑过 prebuild 的机器上会跳过）
if (fs.existsSync(gradlePath)) {
  const before = fs.readFileSync(gradlePath, 'utf8');
  const after = before
    .replace(/(\bversionCode\s+)\d+/, `$1${nextCode}`)
    .replace(/(\bversionName\s+")[^"]*(")/, `$1${nextName}$2`);

  if (after !== before) {
    fs.writeFileSync(gradlePath, after);
    console.log('[bump-version] build.gradle 已同步');
  }
}

// 桌面显示名存在 strings.xml 里，改了 app.json 的 name 也要跟上
const stringsPath = path.join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsPath) && config.expo.name) {
  const before = fs.readFileSync(stringsPath, 'utf8');
  const after = before.replace(
    /(<string name="app_name">)[^<]*(<\/string>)/,
    `$1${config.expo.name}$2`,
  );

  if (after !== before) {
    fs.writeFileSync(stringsPath, after);
    console.log(`[bump-version] strings.xml  app_name → ${config.expo.name}`);
  }
}
