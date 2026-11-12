#!/usr/bin/env node
// Rewrites upstream sources in the working tree so UI strings go through __t().
// The result is never committed: CI runs this on a fresh checkout right before building.
//
//   node zh-tw/scripts/apply.mjs                 dry run, prints a summary
//   node zh-tw/scripts/apply.mjs --write         rewrite files in place
//   node zh-tw/scripts/apply.mjs --report f.json write every key and candidate with its location
//   node zh-tw/scripts/apply.mjs --sync-locale   add newly found keys to zh-tw/locales/zh-TW.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from '../transform/transform.mjs';

const overlay = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(overlay, '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const rules = JSON.parse(fs.readFileSync(path.join(overlay, 'transform/rules.json'), 'utf8'));
const exclude = rules.exclude.map((p) => new RegExp(p));
const localePath = path.join(overlay, 'locales/zh-TW.json');
const runtimeDir = path.join(repo, 'packages/core/src');
const runtimeModule = path.join(runtimeDir, 'zhtw-i18n');

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(full);
    const rel = path.relative(repo, full).split(path.sep).join('/');
    return /\.tsx?$/.test(entry.name) && !exclude.some((p) => p.test(rel)) ? [full] : [];
  });
}

function importPathFrom(file) {
  const rel = path.relative(path.dirname(file), runtimeModule).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

const keys = new Map();
const candidates = [];
const byKind = {};
let changed = 0;

for (const root of rules.roots) {
  for (const file of sourceFiles(path.join(repo, root))) {
    const rel = path.relative(repo, file).split(path.sep).join('/');
    const source = fs.readFileSync(file, 'utf8');
    if (source.includes("from '" + importPathFrom(file) + "'")) continue;
    const result = transform(source, file, rules, importPathFrom(file));
    for (const entry of result.entries) {
      if (!keys.has(entry.key)) keys.set(entry.key, []);
      keys.get(entry.key).push(`${rel}:${entry.line}`);
      byKind[entry.kind] = (byKind[entry.kind] ?? 0) + 1;
    }
    for (const c of result.candidates) candidates.push({ ...c, file: rel });
    if (result.code !== source) {
      changed++;
      if (flag('--write')) fs.writeFileSync(file, result.code);
    }
  }
}

const locale = JSON.parse(fs.readFileSync(localePath, 'utf8'));
const missing = [...keys.keys()].filter((k) => !locale[k]);
const obsolete = Object.keys(locale).filter((k) => !keys.has(k));

if (flag('--sync-locale')) {
  const next = {};
  for (const key of [...keys.keys()].sort()) next[key] = locale[key] ?? '';
  fs.writeFileSync(localePath, JSON.stringify(next, null, 2) + '\n');
}

if (flag('--write')) {
  fs.copyFileSync(path.join(overlay, 'runtime/i18n.ts'), `${runtimeModule}.ts`);
  fs.copyFileSync(localePath, path.join(runtimeDir, 'zhtw-locale.json'));
}

const reportPath = option('--report');
if (reportPath) {
  fs.writeFileSync(reportPath, JSON.stringify({ keys: Object.fromEntries(keys), candidates, missing, obsolete }, null, 2) + '\n');
}

const occurrences = Object.values(byKind).reduce((a, b) => a + b, 0);
console.log(`${flag('--write') ? 'rewrote' : 'would rewrite'} ${changed} files`);
console.log(`wrapped ${occurrences} strings, ${keys.size} unique keys`);
console.log(Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
console.log(`locale: ${keys.size - missing.length} translated, ${missing.length} missing, ${obsolete.length} obsolete`);
console.log(`candidates left in English (need a rule or a keep entry): ${candidates.length}`);
