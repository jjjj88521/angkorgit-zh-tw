import test from 'node:test';
import assert from 'node:assert/strict';
import { injectSource } from '../transform/inject.mjs';

test('inject adds code around a unique anchor and its import at the top', () => {
  const edits = [
    { file: 'a.tsx', anchor: '<Fonts />', after: '\n<Lang />', import: "import { Lang } from './Lang';" },
    { file: 'b.ts', anchor: '  { id: 2 },', before: '  { id: 1 },\n' },
  ];
  assert.equal(injectSource('a.tsx', 'x\n<Fonts />\ny', edits), "import { Lang } from './Lang';\nx\n<Fonts />\n<Lang />\ny");
  assert.equal(injectSource('b.ts', '[\n  { id: 2 },\n]', edits), '[\n  { id: 1 },\n  { id: 2 },\n]');
  assert.equal(injectSource('c.ts', 'same', edits), 'same');
});

test('inject fails when the anchor is missing or ambiguous', () => {
  const edits = [{ file: 'a.tsx', anchor: '<Fonts />', after: 'x' }];
  assert.throws(() => injectSource('a.tsx', 'nothing here', edits), /found 0 times/);
  assert.throws(() => injectSource('a.tsx', '<Fonts /><Fonts />', edits), /found 2 times/);
});
