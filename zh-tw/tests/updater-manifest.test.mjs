import test from 'node:test';
import assert from 'node:assert/strict';
import { updaterManifest } from '../scripts/updater-manifest.mjs';

const base = { repo: 'o/r', tag: 'v0.27.0+zh-TW.1', version: '0.27.0+zh-TW.1', pubDate: 'now' };

test('every platform gets an entry from its signature, universal macOS on both arches', () => {
  const { platforms, version } = updaterManifest({
    ...base,
    sigs: {
      'AngKorGit.zh-TW_universal.app.tar.gz.sig': 'mac\n',
      'AngKorGit.zh-TW_0.27.0+zh-TW.1_amd64.AppImage.sig': 'appimage',
      'AngKorGit.zh-TW_0.27.0+zh-TW.1_amd64.deb.sig': 'deb',
      'AngKorGit.zh-TW_0.27.0+zh-TW.1_x64-setup.exe.sig': 'nsis',
    },
  });
  assert.equal(version, '0.27.0+zh-TW.1');
  assert.deepEqual(Object.keys(platforms), [
    'darwin-aarch64', 'darwin-aarch64-app', 'darwin-x86_64', 'darwin-x86_64-app',
    'linux-x86_64', 'linux-x86_64-appimage', 'linux-x86_64-deb', 'windows-x86_64', 'windows-x86_64-nsis',
  ]);
  assert.equal(platforms['darwin-x86_64'].signature, 'mac');
  assert.equal(platforms['linux-x86_64'].signature, 'appimage');
  assert.equal(
    platforms['windows-x86_64'].url,
    'https://github.com/o/r/releases/download/v0.27.0%2Bzh-TW.1/AngKorGit.zh-TW_0.27.0%2Bzh-TW.1_x64-setup.exe',
  );
});

test('an unknown signature file or none at all is an error', () => {
  assert.throws(() => updaterManifest({ ...base, sigs: { 'notes.txt.sig': 'x' } }), /cannot tell the platform/);
  assert.throws(() => updaterManifest({ ...base, sigs: {} }), /no signature files/);
});

test('a required platform without a signature is an error', () => {
  const sigs = { 'A_universal.app.tar.gz.sig': 'mac', 'A_x64-setup.exe.sig': 'nsis' };
  const require = ['darwin-aarch64', 'darwin-x86_64', 'linux-x86_64', 'windows-x86_64'];
  assert.throws(() => updaterManifest({ ...base, sigs, require }), /no updater signature for linux-x86_64$/);
  assert.ok(updaterManifest({ ...base, sigs: { ...sigs, 'A_amd64.AppImage.sig': 'linux' }, require }).platforms['linux-x86_64']);
});
