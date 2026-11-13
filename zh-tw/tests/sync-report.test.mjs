import test from 'node:test';
import assert from 'node:assert/strict';
import { syncReport } from '../scripts/sync-report.mjs';

test('sync report counts added, drafted and removed keys and lists them', () => {
  const body = syncReport({
    tag: 'v0.28.0',
    before: { Push: '推送', 'Old | thing': '舊的' },
    after: { Push: '推送', Fetch: '取得', 'Two\nlines': '' },
    candidates: 3,
    check: '3/3 entries translated',
  });
  assert.match(body, /releases\/tag\/v0\.28\.0/);
  assert.match(body, /新增字串 \| 2（AI 草稿 1，未翻譯 1）/);
  assert.match(body, /移除字串 \| 1 \|/);
  assert.match(body, /仍為英文的候選字串 \| 3 \|/);
  assert.match(body, /\| Fetch \| 取得 \|/);
  assert.match(body, /\| Two<br>lines \| \*\*（未翻譯）\*\* \|/);
  assert.match(body, /\| Old \\\| thing \| 舊的 \|/);
  assert.match(body, /Create a merge commit/);
  assert.doesNotMatch(body, /CAUTION/);
});

test('sync report shows a transform failure and skips empty sections', () => {
  const body = syncReport({ tag: 'v1.0.0', before: {}, after: {}, failure: 'inject anchor found 0 times' });
  assert.match(body, /\[!CAUTION\]/);
  assert.match(body, /inject anchor found 0 times/);
  assert.doesNotMatch(body, /## 新增字串/);
  assert.doesNotMatch(body, /移除字串（/);
});
