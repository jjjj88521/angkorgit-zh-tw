#!/usr/bin/env node
// Writes the body of an upstream sync pull request to stdout.
//
//   node zh-tw/scripts/sync-report.mjs --tag v0.28.0 --before old.json --after zh-tw/locales/zh-TW.json \
//     [--report report.json] [--check check.txt] [--failure apply.log]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const MAX_ROWS = 300;

const cell = (text) => text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');

export function syncReport({ tag, before, after, candidates = 0, check = '', failure = '' }) {
  const added = Object.keys(after).filter((key) => !(key in before));
  const removed = Object.keys(before).filter((key) => !(key in after));
  const drafted = added.filter((key) => after[key]);
  const lines = [`同步上游 [${tag}](https://github.com/cheat2001/angkorgit/releases/tag/${tag})，並更新繁中語系檔。`, ''];

  if (failure) {
    lines.push('> [!CAUTION]', '> 轉換腳本失敗，語系檔沒有更新。請在這個分支修正 `zh-tw/transform/rules.json` 後再審稿。', '', '```', failure.trim(), '```', '');
  }

  lines.push(
    '| 項目 | 數量 |',
    '| --- | --- |',
    `| 新增字串 | ${added.length}（AI 草稿 ${drafted.length}，未翻譯 ${added.length - drafted.length}） |`,
    `| 移除字串 | ${removed.length} |`,
    `| 仍為英文的候選字串 | ${candidates} |`,
    '',
    '## 審稿方式',
    '',
    '- AI 草稿不是定稿，請逐條確認。修改請直接改這個分支的 `zh-tw/locales/zh-TW.json`。',
    '- 合併時請用 **Create a merge commit**。squash 會切斷與上游的歷史，下次同步會產生衝突。',
    '',
  );

  if (added.length) {
    lines.push('## 新增字串', '', '| 英文 | 繁中 |', '| --- | --- |');
    for (const key of added.slice(0, MAX_ROWS)) lines.push(`| ${cell(key)} | ${after[key] ? cell(after[key]) : '**（未翻譯）**'} |`);
    if (added.length > MAX_ROWS) lines.push('', `另有 ${added.length - MAX_ROWS} 條，請看檔案差異。`);
    lines.push('');
  }

  if (removed.length) {
    lines.push('<details><summary>移除字串（上游已不再使用）</summary>', '', '| 英文 | 原譯文 |', '| --- | --- |');
    for (const key of removed.slice(0, MAX_ROWS)) lines.push(`| ${cell(key)} | ${cell(before[key] || '')} |`);
    lines.push('', '</details>', '');
  }

  if (check.trim()) lines.push('<details><summary>語系檔檢查結果</summary>', '', '```', check.trim(), '```', '', '</details>', '');
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const readText = (file) => (file && fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
  const readJson = (file) => JSON.parse(readText(file) || '{}');
  const report = readJson(option('--report'));
  process.stdout.write(
    syncReport({
      tag: option('--tag'),
      before: readJson(option('--before')),
      after: readJson(option('--after')),
      candidates: report.candidates?.length ?? 0,
      check: readText(option('--check')),
      failure: readText(option('--failure')),
    }),
  );
}
