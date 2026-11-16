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
  assert.equal(injectSource('d.tsx', 'a <b /> c', [{ file: 'd.tsx', anchor: '<b />', replace: '<i />' }]), 'a <i /> c');
});

test('inject matches multi-line anchors in a CRLF checkout and keeps its line endings', () => {
  const edits = [{ file: 'a.tsx', anchor: 'one\ntwo', replace: 'x\ny', import: 'import z;' }];
  assert.equal(injectSource('a.tsx', 'a\r\none\r\ntwo\r\nb', edits), 'import z;\r\na\r\nx\r\ny\r\nb');
  assert.equal(injectSource('a.tsx', 'a\none\ntwo\nb', edits), 'import z;\na\nx\ny\nb');
});

test('inject fails when the anchor is missing or ambiguous', () => {
  const edits = [{ file: 'a.tsx', anchor: '<Fonts />', after: 'x' }];
  assert.throws(() => injectSource('a.tsx', 'nothing here', edits), /found 0 times/);
  assert.throws(() => injectSource('a.tsx', '<Fonts /><Fonts />', edits), /found 2 times/);
});
