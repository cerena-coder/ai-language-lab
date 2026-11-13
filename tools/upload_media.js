#!/usr/bin/env node
/* 把本地视频/音频放进仓库 media/ 目录并登记到 manifest.json
   用法：
     node tools/upload_media.js <本地文件> [标题] [难度]
   例：
     node tools/upload_media.js D:/videos/talk.mp4 "我的 TED 演讲" B1
   脚本只做三件事：① 把文件复制到 media/ ② 在 manifest.json 的 items 里加一条
   ③ 提示你 git add / commit / push。不会自动推送，避免误提交。 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mediaDir = path.join(root, 'media');

function fail(msg) { console.error('❌ ' + msg); process.exit(1); }

const src = process.argv[2];
if (!src) fail('缺少本地文件路径。用法：node tools/upload_media.js <本地文件> [标题] [难度]');
if (!fs.existsSync(src)) fail('找不到文件：' + src);

const title = process.argv[3] || '';
const level = process.argv[4] || '';
const name = path.basename(src);
const audioRe = /\.(mp3|wav|m4a|aac|flac|opus)$/i;
const isAudio = audioRe.test(name);

if (!/\.(mp4|webm|ogg|ogv|mov|m4v|mp3|wav|m4a|aac|flac|opus)$/i.test(name))
  fail('文件类型不支持，仅支持 mp4/webm/mov/m4v/mp3/wav/m4a 等常见音视频');

if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

const dest = path.join(mediaDir, name);
fs.copyFileSync(src, dest);
console.log('✅ 已复制：' + name + ' -> media/' + name);

const mPath = path.join(mediaDir, 'manifest.json');
let m = { items: [] };
if (fs.existsSync(mPath)) {
  try { m = JSON.parse(fs.readFileSync(mPath, 'utf8')); } catch (e) { m = { items: [] }; }
}
m.items = (m.items || []).filter(function (x) { return x && x.file !== name; });
const entry = { file: name };
if (title) entry.title = title;
if (level) entry.level = level;
if (isAudio) entry.type = 'audio';
m.items.push(entry);
delete m._example; // 首次登记后去掉示例字段，保持清单干净
fs.writeFileSync(mPath, JSON.stringify(m, null, 2) + '\n', 'utf8');
console.log('✅ 已登记到 media/manifest.json：' + JSON.stringify(entry));

const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
if (fs.statSync(dest).size > 100 * 1024 * 1024)
  console.warn('⚠ 文件 ' + sizeMB + ' MB 超过 GitHub 单文件软上限 100MB，建议压缩或用外链。');

console.log('\n下一步（手动确认无误后执行）：');
console.log('  git add media/' + name + ' media/manifest.json');
console.log('  git commit -m "add repo media: ' + (title || name) + '"');
console.log('  git push');
console.log('推送后等 GitHub Pages 重新构建（约 1 分钟），刷新网站即可在「我的素材库」看到它。');
