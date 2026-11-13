#!/usr/bin/env node
// Validates zh-tw/locales/zh-TW.json.
//
//   node zh-tw/scripts/check-locale.mjs                     placeholder and prefix rules
//   node zh-tw/scripts/check-locale.mjs --require-complete  also fail on untranslated entries
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLocale } from '../translate/check.mjs';

const overlay = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locale = JSON.parse(fs.readFileSync(path.join(overlay, 'locales/zh-TW.json'), 'utf8'));
const rules = JSON.parse(fs.readFileSync(path.join(overlay, 'transform/rules.json'), 'utf8'));

const { errors, warnings, missing } = checkLocale(locale, rules);
const total = Object.keys(locale).length;
console.log(`${total - missing.length}/${total} entries translated`);
for (const warning of warnings) console.warn(`warning: Mainland wording ${warning}`);
for (const error of errors) console.error(`error: ${error}`);

const incomplete = process.argv.includes('--require-complete') && missing.length > 0;
if (incomplete) console.error(`error: ${missing.length} entries are untranslated`);
process.exit(errors.length || incomplete ? 1 : 0);
