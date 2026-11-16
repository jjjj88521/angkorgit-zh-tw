#!/usr/bin/env node
// Builds latest.json for the updater from the `.sig` files of a release, once every build is done.
// tauri-action's per-job manifest upload is read-modify-write, so parallel jobs can drop a platform.
//
//   node zh-tw/scripts/updater-manifest.mjs --repo owner/name --tag v0.27.0+zh-TW.1 --version 0.27.0+zh-TW.1 --sigs dir
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUNDLES = [
  { suffix: '.app.tar.gz', os: 'darwin', bundle: 'app', rank: 1 },
  { suffix: '.AppImage', os: 'linux', bundle: 'appimage', rank: 3 },
  { suffix: '.deb', os: 'linux', bundle: 'deb', rank: 2 },
  { suffix: '.rpm', os: 'linux', bundle: 'rpm', rank: 1 },
  { suffix: '-setup.exe', os: 'windows', bundle: 'nsis', rank: 2 },
  { suffix: '.msi', os: 'windows', bundle: 'msi', rank: 1 },
];

function archesOf(name) {
  if (/universal/i.test(name)) return ['aarch64', 'x86_64'];
  if (/aarch64|arm64/i.test(name)) return ['aarch64'];
  if (/x86_64|amd64|x64/i.test(name)) return ['x86_64'];
  return [];
}

/** `sigs` maps an asset name ending in `.sig` to the signature text. */
export function updaterManifest({ repo, tag, version, notes = '', pubDate, sigs }) {
  const platforms = {};
  const primary = {};
  for (const [sigName, signature] of Object.entries(sigs)) {
    const asset = sigName.replace(/\.sig$/, '');
    const kind = BUNDLES.find((b) => asset.endsWith(b.suffix));
    const arches = archesOf(asset);
    if (!kind || !arches.length) throw new Error(`cannot tell the platform of ${sigName}`);
    const url = `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(asset)}`;
    const entry = { signature: signature.trim(), url };
    for (const arch of arches) {
      const key = `${kind.os}-${arch}`;
      platforms[`${key}-${kind.bundle}`] = entry;
      if (!primary[key] || primary[key].rank < kind.rank) primary[key] = { rank: kind.rank, entry };
    }
  }
  for (const [key, { entry }] of Object.entries(primary)) platforms[key] = entry;
  if (!Object.keys(primary).length) throw new Error('no signature files found');
  const sorted = Object.fromEntries(Object.entries(platforms).sort(([a], [b]) => a.localeCompare(b)));
  return { version, notes, pub_date: pubDate ?? new Date().toISOString(), platforms: sorted };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const dir = option('--sigs');
  const sigs = Object.fromEntries(
    fs.readdirSync(dir).filter((f) => f.endsWith('.sig')).map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]),
  );
  const manifest = updaterManifest({ repo: option('--repo'), tag: option('--tag'), version: option('--version'), notes: option('--notes') ?? '', sigs });
  process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
}
