import test from 'node:test';
import assert from 'node:assert/strict';
import { batches, checkLocale, decode, encode, placeholderProblem, translateBatch } from '../translate/lib.mjs';

test('encode protects placeholders, escapes markup and keeps outer whitespace aside', () => {
  assert.deepEqual(encode(' Push {{0}} to <{{1}}> & wait\n'), {
    html: 'Push <span translate="no">{{0}}</span> to &lt;<span translate="no">{{1}}</span>&gt; &amp; wait',
    lead: ' ',
    trail: '\n',
  });
});

test('decode restores placeholders, line breaks, entities and outer whitespace', () => {
  const html = '推送 <span translate="no"> {{0}} </span> 到 &lt;<span translate="no">{{1}}</span>&gt;<br>完成 &amp; 等待';
  assert.equal(decode(html, ' ', '\n'), ' 推送 {{0}} 到 <{{1}}>\n完成 & 等待\n');
});

test('a string survives an identity round trip', () => {
  for (const source of ['Delete "{{0}}"?', ', will conflict', 'A <b> tag & more\nsecond line', '{{0}}m ago']) {
    const { html, lead, trail } = encode(source);
    assert.equal(decode(html, lead, trail), source);
  }
});

test('batches split on count and on characters', () => {
  assert.deepEqual(batches(['a', 'b', 'c'], 2), [['a', 'b'], ['c']]);
  assert.deepEqual(batches(['aaaa', 'bbbb', 'c'], 50, 6), [['aaaa'], ['bbbb', 'c']]);
});

test('translateBatch sends the glossary request and prefers glossary translations', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return {
      ok: true,
      json: async () => ({
        translations: [{ translatedText: '將 <span translate="no">{{0}}</span> 推' }],
        glossaryTranslations: [{ translatedText: '推送 <span translate="no">{{0}}</span>' }],
      }),
    };
  };
  const out = await translateBatch(['Push {{0}}'], { project: 'p', token: 't', glossary: 'git-zh-tw' }, fetchImpl);
  assert.deepEqual(out, ['推送 {{0}}']);
  assert.equal(calls[0].url, 'https://translation.googleapis.com/v3/projects/p/locations/us-central1:translateText');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer t');
  assert.deepEqual(calls[0].body, {
    sourceLanguageCode: 'en',
    targetLanguageCode: 'zh-TW',
    mimeType: 'text/html',
    contents: ['Push <span translate="no">{{0}}</span>'],
    glossaryConfig: { glossary: 'projects/p/locations/us-central1/glossaries/git-zh-tw', ignoreCase: true },
  });
});

test('translateBatch works without a glossary and surfaces API errors', async () => {
  const ok = async (_, init) => {
    assert.equal('glossaryConfig' in JSON.parse(init.body), false);
    return { ok: true, json: async () => ({ translations: [{ translatedText: '取消' }] }) };
  };
  assert.deepEqual(await translateBatch(['Cancel'], { project: 'p', token: 't' }, ok), ['取消']);
  const denied = async () => ({ ok: false, status: 403, text: async () => 'PERMISSION_DENIED' });
  await assert.rejects(translateBatch(['Cancel'], { project: 'p', token: 't' }, denied), /403.*PERMISSION_DENIED/);
  const short = async () => ({ ok: true, json: async () => ({ translations: [] }) });
  await assert.rejects(translateBatch(['Cancel'], { project: 'p', token: 't' }, short), /0 results for 1 strings/);
});

test('placeholders must match, except a suffix slot glued to a word', () => {
  assert.equal(placeholderProblem('Push {{0}} to {{1}}', '將 {{0}} 推送到 {{1}}'), null);
  assert.match(placeholderProblem('Push {{0}} to {{1}}', '推送到 {{1}}'), /missing \{\{0\}\}/);
  assert.match(placeholderProblem('Push {{0}}', '推送 {{0}} {{1}}'), /uses \{\{1\}\}/);
  assert.equal(placeholderProblem('{{0}} commit{{1}} to push', '{{0}} 個提交待推送'), null);
});

test('checkLocale reports placeholder errors, prefix violations and missing entries', () => {
  const rules = { prefixConstraints: [{ prefix: 'Pull', except: '^Pull requests?\\b' }] };
  const locale = {
    Pull: '拉取',
    'Pull (rebase)': '拉取（重定基底）',
    'Pull from {{0}}': '從 {{0}} 拉取',
    'Pull requests': 'PR',
    'Pulling group…': '正在更新群組…',
    'Push {{0}}': '推送',
    Fetch: '',
  };
  const { errors, missing } = checkLocale(locale, rules);
  assert.deepEqual(missing, ['Fetch']);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /"Push \{\{0\}\}".*missing/);
  assert.match(errors[1], /"Pull from \{\{0\}\}".*must start with "拉取"/);
});

test('prefix constraints wait until the prefix itself is translated', () => {
  const rules = { prefixConstraints: [{ prefix: 'Pull' }] };
  assert.deepEqual(checkLocale({ Pull: '', 'Pull (merge)': '合併式拉取' }, rules).errors, []);
});
