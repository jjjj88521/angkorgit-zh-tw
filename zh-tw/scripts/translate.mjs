#!/usr/bin/env node
// Fills empty entries of zh-tw/locales/zh-TW.json with LLM drafts from OpenCode Go.
// Drafts are not approved copy: they go into a pull request for review.
//
//   node zh-tw/scripts/translate.mjs                        translate every empty entry
//   node zh-tw/scripts/translate.mjs --dry-run              count what would be sent, no network
//   node zh-tw/scripts/translate.mjs --limit 100            at most 100 entries
//   node zh-tw/scripts/translate.mjs --keys k.json --out o.json --model m
//                                                           translate the keys listed in k.json into o.json, locale untouched
//
// The key comes from OPENCODE_API_KEY, or from .git/zh-tw-wizard.env.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { missingKeys } from '../translate/check.mjs';
import { batches, parseTermbase, translateBatch } from '../translate/llm.mjs';

const overlay = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(overlay, '..');
const localePath = path.join(overlay, 'locales/zh-TW.json');
const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);

const model = option('--model', process.env.ZHTW_MODEL || 'claude-haiku-5-5');
const limit = Number(option('--limit', Infinity));
const keysFile = option('--keys');
const outFile = option('--out');

function apiKey() {
  if (process.env.OPENCODE_API_KEY) return process.env.OPENCODE_API_KEY;
  const envFile = path.join(execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: repo, encoding: 'utf8' }).trim(), 'zh-tw-wizard.env');
  if (!fs.existsSync(envFile)) return null;
  const line = fs.readFileSync(envFile, 'utf8').split('\n').reverse().find((l) => l.startsWith('OPENCODE_API_KEY='));
  if (!line) return null;
  const value = line.slice('OPENCODE_API_KEY='.length);
  return value.startsWith("'") && value.endsWith("'") ? value.slice(1, -1).replace(/'\\''/g, "'") : value;
}

function locations() {
  const report = path.join(fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR || '/tmp'), 'zhtw-')), 'report.json');
  execFileSync(process.execPath, [path.join(overlay, 'scripts/apply.mjs'), '--report', report], { cwd: repo, stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(report, 'utf8')).keys;
}

function sourceLine(location) {
  const [file, line] = location.split(/:(?=\d+$)/);
  const lines = fs.readFileSync(path.join(repo, file), 'utf8').split('\n');
  return lines[Number(line) - 1]?.trim().slice(0, 200) ?? '';
}

const locale = JSON.parse(fs.readFileSync(localePath, 'utf8'));
const wanted = (keysFile ? JSON.parse(fs.readFileSync(keysFile, 'utf8')) : missingKeys(locale)).slice(0, limit);
const characters = wanted.reduce((sum, key) => sum + key.length, 0);
console.log(`${wanted.length} entries to translate with ${model}, ${characters} characters`);
if (args.includes('--dry-run') || !wanted.length) process.exit(0);

const key = apiKey();
if (!key) {
  console.error('Set OPENCODE_API_KEY, or store it in .git/zh-tw-wizard.env.');
  process.exit(1);
}

const where = locations();
const items = wanted.map((source) => {
  const locs = where[source] ?? [];
  return { source, where: locs.slice(0, 2).join(', '), code: locs[0] ? sourceLine(locs[0]) : '' };
});
const termbase = parseTermbase(fs.readFileSync(path.join(overlay, 'termbase.csv'), 'utf8'));
const session = `ses_angkorgit_zhtw_${Date.now().toString(36)}`;
const results = outFile && fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const rejected = [];
let done = 0;

for (const batch of batches(items)) {
  let drafts;
  try {
    drafts = await translateBatch(batch, { apiKey: key, model, session, termbase });
  } catch (error) {
    console.error(`batch of ${batch.length} failed: ${error.message}`);
    batch.forEach((item) => rejected.push(`${JSON.stringify(item.source)}: batch failed`));
    continue;
  }
  batch.forEach((item, i) => {
    const { target, reason } = drafts[i];
    if (!target) return rejected.push(`${JSON.stringify(item.source)}: ${reason}`);
    if (outFile) results[item.source] = target;
    else locale[item.source] = target;
  });
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(results, null, 2) + '\n');
  else fs.writeFileSync(localePath, JSON.stringify(locale, null, 2) + '\n');
  done += batch.length;
  console.log(`translated ${done}/${items.length}`);
}

if (rejected.length) {
  console.warn(`${rejected.length} entries stay untranslated:`);
  for (const line of rejected) console.warn(`  ${line}`);
}
