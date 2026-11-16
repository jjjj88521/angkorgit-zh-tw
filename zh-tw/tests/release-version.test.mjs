import test from 'node:test';
import assert from 'node:assert/strict';
import { nextVersion } from '../scripts/release-version.mjs';

test('the first zh-TW release of an upstream version is .1', () => {
  assert.equal(nextVersion('0.27.0', ['v0.26.0', 'v0.26.0+zh-TW.3', '']), '0.27.0+zh-TW.1');
});

test('a re-release counts past the highest N, numerically', () => {
  assert.equal(nextVersion('0.27.0', ['v0.27.0+zh-TW.2', 'v0.27.0+zh-TW.10', 'v0.27.0+zh-TW.9']), '0.27.0+zh-TW.11');
  assert.equal(nextVersion('0.27.0', ['v0.27.0+zh-TW.x', 'v0.27.0']), '0.27.0+zh-TW.1');
});

test('a version that is not plain x.y.z is refused', () => {
  assert.throws(() => nextVersion('0.27.0+zh-TW.1', []), /not an upstream version/);
});
