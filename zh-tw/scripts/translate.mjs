#!/usr/bin/env node
// Fills the empty entries of zh-tw/locales/zh-TW.json with Google Cloud Translation drafts.
// Drafts are not approved copy: they go into a pull request for review.
//
//   GOOGLE_ACCESS_TOKEN=… GCP_PROJECT=… GLOSSARY_ID=… node zh-tw/scripts/translate.mjs
//   node zh-tw/scripts/translate.mjs --dry-run     count what would be sent, no network
//   node zh-tw/scripts/translate.mjs --limit 100   translate at most 100 entries
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { batches, missingKeys, placeholderProblem, translateBatch } from '../translate/lib.mjs';

const overlay = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localePath = path.join(overlay, 'locales/zh-TW.json');
const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;

const locale = JSON.parse(fs.readFileSync(localePath, 'utf8'));
const pending = missingKeys(locale).slice(0, limit);
const characters = pending.reduce((sum, key) => sum + key.length, 0);
console.log(`${pending.length} entries to translate, ${characters} characters`);

if (args.includes('--dry-run') || !pending.length) process.exit(0);

const { GOOGLE_ACCESS_TOKEN: token, GCP_PROJECT: project, GLOSSARY_ID: glossary } = process.env;
if (!token || !project) {
  console.error('Set GOOGLE_ACCESS_TOKEN and GCP_PROJECT (and GLOSSARY_ID to apply the termbase).');
  process.exit(1);
}
if (!glossary) console.warn('GLOSSARY_ID is not set: translating without the termbase.');

const rejected = [];
let done = 0;
for (const batch of batches(pending)) {
  const translations = await translateBatch(batch, { project, token, glossary });
  batch.forEach((source, i) => {
    const problem = placeholderProblem(source, translations[i]);
    if (problem) rejected.push(`${JSON.stringify(source)}: draft ${problem}`);
    else locale[source] = translations[i];
  });
  fs.writeFileSync(localePath, JSON.stringify(locale, null, 2) + '\n');
  done += batch.length;
  console.log(`translated ${done}/${pending.length}`);
}

if (rejected.length) {
  console.warn(`${rejected.length} drafts were dropped and stay untranslated:`);
  for (const line of rejected) console.warn(`  ${line}`);
}
