#!/usr/bin/env node
/**
 * 每次构建 APK 前把 android.versionCode 自增 1。
 *
 * versionCode 是 Android 用来判断「哪个版本更新」的整数：值不变的话系统不认为
 * 新包装的是升级，覆盖安装有时会被拒绝，也无法在应用商店上架新版本。
 *
 * versionName（app.json 的 version，如 "1.0.0"）保持手动维护 —— 那是给人看的
 * 语义版本，什么时候升由你决定。
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

const versionName = config.expo.version ?? '1.0.0';
const current = Number(config.expo.android?.versionCode ?? 0);
const next = current + 1;

config.expo.android = { ...config.expo.android, versionCode: next };
fs.writeFileSync(appJsonPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`[bump-version] app.json     versionCode ${current} → ${next}`);

// 原生工程存在时才同步（没跑过 prebuild 的机器上会跳过）
if (fs.existsSync(gradlePath)) {
  const before = fs.readFileSync(gradlePath, 'utf8');
  const after = before
    .replace(/(\bversionCode\s+)\d+/, `$1${next}`)
    .replace(/(\bversionName\s+")[^"]*(")/, `$1${versionName}$2`);

  if (after !== before) {
    fs.writeFileSync(gradlePath, after);
    console.log(`[bump-version] build.gradle versionCode ${next} · versionName ${versionName}`);
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
