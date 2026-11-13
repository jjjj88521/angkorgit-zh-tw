#!/usr/bin/env node
// Rewrites upstream sources in the working tree so UI strings go through __t().
// The result is never committed: CI runs this on a fresh checkout right before building.
//
//   node zh-tw/scripts/apply.mjs                 dry run, prints a summary
//   node zh-tw/scripts/apply.mjs --write         rewrite files in place
//   node zh-tw/scripts/apply.mjs --report f.json write every key and candidate with its location
//   node zh-tw/scripts/apply.mjs --sync-locale   add newly found keys to zh-tw/locales/zh-TW.json
//   node zh-tw/scripts/apply.mjs --restore       undo --write in a local checkout
//
// --write needs a clean checkout under the roots and records what it wrote, so --restore
// only undoes files that still hold the rewrite and keeps any edit made afterwards.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectSource } from '../transform/inject.mjs';
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
const injectFiles = (rules.inject?.files ?? []).map((f) => ({ from: path.join(overlay, f.from), to: path.join(repo, f.to) }));
const injectEdits = rules.inject?.edits ?? [];
const git = (...cmd) => execFileSync('git', cmd, { cwd: repo, encoding: 'utf8' });
const manifestPath = path.join(git('rev-parse', '--absolute-git-dir').trim(), 'zh-tw-applied.json');
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fail = (message) => {
  console.error(`error: ${message}`);
  process.exit(1);
};

if (flag('--restore')) {
  if (!fs.existsSync(manifestPath)) fail(`nothing to restore: ${path.relative(repo, manifestPath)} is missing`);
  const written = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const kept = [];
  for (const [rel, digest] of Object.entries(written)) {
    const file = path.join(repo, rel);
    if (!fs.existsSync(file)) continue;
    if (hash(file) !== digest) {
      kept.push(rel);
      continue;
    }
    const tracked = git('ls-files', '--', rel).trim() !== '';
    if (tracked) git('checkout', '--', rel);
    else fs.rmSync(file);
  }
  fs.rmSync(manifestPath);
  for (const rel of kept) console.warn(`kept ${rel}: edited after --write, restore it by hand`);
  console.log('restored upstream sources');
  process.exit(0);
}

if (flag('--write')) {
  if (fs.existsSync(manifestPath)) fail('sources are already rewritten; run --restore first');
  const dirty = git('status', '--porcelain', '--', ...rules.roots).trim();
  if (dirty) fail(`commit or stash these changes before --write:\n${dirty}`);
}

const virtual = new Map(injectFiles.map((f) => [f.to, f.from]));

function sourceFiles(dir) {
  const injected = [...virtual.keys()].filter((file) => file.startsWith(dir + path.sep) && !fs.existsSync(file));
  return [...injected, ...listFiles(dir)];
}

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : listFiles(full);
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
const skipped = [];
const written = {};

for (const root of rules.roots) {
  for (const file of sourceFiles(path.join(repo, root))) {
    const rel = path.relative(repo, file).split(path.sep).join('/');
    const original = fs.readFileSync(virtual.has(file) && !fs.existsSync(file) ? virtual.get(file) : file, 'utf8');
    if (new RegExp(`^import \\{ __[ts][^}]*\\} from '${importPathFrom(file)}';$`, 'm').test(original)) {
      skipped.push(rel);
      continue;
    }
    const source = injectSource(rel, original, injectEdits);
    const result = transform(source, file, rules, importPathFrom(file));
    for (const entry of result.entries) {
      if (!keys.has(entry.key)) keys.set(entry.key, []);
      keys.get(entry.key).push(`${rel}:${entry.line}`);
      byKind[entry.kind] = (byKind[entry.kind] ?? 0) + 1;
    }
    for (const c of result.candidates) candidates.push({ ...c, file: rel });
    if (result.code !== original || virtual.has(file)) {
      changed++;
      if (flag('--write')) {
        fs.writeFileSync(file, result.code);
        written[rel] = hash(file);
      }
    }
  }
}

const locale = JSON.parse(fs.readFileSync(localePath, 'utf8'));
const missing = [...keys.keys()].filter((k) => !locale[k]);
const obsolete = Object.keys(locale).filter((k) => !keys.has(k));

if (flag('--sync-locale')) {
  // Keys of rewritten files are not collected, so syncing now would drop their translations.
  if (skipped.length) fail(`${skipped.length} files are already rewritten (${skipped[0]}, …); run --restore before --sync-locale`);
  const next = {};
  for (const key of [...keys.keys()].sort()) next[key] = locale[key] ?? '';
  fs.writeFileSync(localePath, JSON.stringify(next, null, 2) + '\n');
}

if (flag('--write')) {
  fs.copyFileSync(path.join(overlay, 'runtime/i18n.ts'), `${runtimeModule}.ts`);
  fs.copyFileSync(localePath, path.join(runtimeDir, 'zhtw-locale.json'));
  for (const file of [`${runtimeModule}.ts`, path.join(runtimeDir, 'zhtw-locale.json')]) written[path.relative(repo, file).split(path.sep).join('/')] = hash(file);
  fs.writeFileSync(manifestPath, JSON.stringify(written, null, 2) + '\n');
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
