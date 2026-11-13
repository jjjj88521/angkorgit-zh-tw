#!/usr/bin/env node
// Prints the next zh-TW release version, `<upstream>+zh-TW.N` (ADR 0002).
//
//   node zh-tw/scripts/release-version.mjs <upstream version> < existing-tags.txt
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export function nextVersion(upstream, tags) {
  if (!/^\d+\.\d+\.\d+$/.test(upstream)) throw new Error(`not an upstream version: ${upstream}`);
  const prefix = `v${upstream}+zh-TW.`;
  const used = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.startsWith(prefix) && /^\d+$/.test(tag.slice(prefix.length)))
    .map((tag) => Number(tag.slice(prefix.length)));
  return `${upstream}+zh-TW.${Math.max(0, ...used) + 1}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(nextVersion(process.argv[2] ?? '', fs.readFileSync(0, 'utf8').split('\n')));
}
