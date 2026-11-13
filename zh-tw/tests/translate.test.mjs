import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLocale, mainlandWarnings, placeholderProblem } from '../translate/check.mjs';
import { ENDPOINT, USER_AGENT, batches, chat, normalize, parseReply, parseTermbase, systemPrompt, translateBatch, userPrompt } from '../translate/llm.mjs';

const reply = (content) => async () => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });

test('placeholders must match; English plural slots must be dropped', () => {
  assert.equal(placeholderProblem('Push {{0}} to {{1}}', '將 {{0}} 推送到 {{1}}'), null);
  assert.match(placeholderProblem('Push {{0}} to {{1}}', '推送到 {{1}}'), /missing \{\{0\}\}/);
  assert.match(placeholderProblem('Push {{0}}', '推送 {{0}} {{1}}'), /uses \{\{1\}\}/);
  assert.equal(placeholderProblem('{{0}} commit{{1}} to push', '{{0}} 個提交待推送'), null);
  assert.match(placeholderProblem('{{0}} commit{{1}}', '{{0}} 提交{{1}}'), /plural slot \{\{1\}\}/);
});

test('Mainland wording is reported as a warning, never an error', () => {
  assert.deepEqual(mainlandWarnings('打開這個文件'), ['文件', '打開']);
  const { errors, warnings } = checkLocale({ 'Open file': '打開文件' });
  assert.equal(errors.length, 0);
  assert.match(warnings[0], /文件 → 檔案, 打開 → 開啟/);
});

test('checkLocale reports placeholder errors, prefix violations and missing entries', () => {
  const rules = { prefixConstraints: [{ prefix: 'Pull', except: '^Pull requests?\\b' }] };
  const locale = {
    Pull: '拉取',
    'Pull (rebase)': '拉取（重定基底）',
    'Pull from {{0}}': '從 {{0}} 拉取',
    'Pull requests': '拉取請求',
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

test('termbase parses into pairs, and the system prompt carries terms and Mainland words to avoid', () => {
  const terms = parseTermbase('stash,貯存\ncherry-pick,揀選\n\n');
  assert.deepEqual(terms, [['stash', '貯存'], ['cherry-pick', '揀選']]);
  const prompt = systemPrompt(terms);
  assert.match(prompt, /stash → 貯存/);
  assert.match(prompt, /文件→檔案/);
  assert.match(prompt, /\{"t": \{"<id>"/);
});

test('user prompt numbers items from 1 and keeps their context', () => {
  const items = JSON.parse(userPrompt([{ source: 'Push', where: 'a.tsx:3', code: '<b>Push</b>' }]));
  assert.deepEqual(items, [{ id: '1', en: 'Push', where: 'a.tsx:3', code: '<b>Push</b>' }]);
});

test('parseReply reads fenced or bare JSON and marks missing ids', () => {
  assert.deepEqual(parseReply('```json\n{"t": {"1": "推送", "2": "拉取"}}\n```', 2), ['推送', '拉取']);
  assert.deepEqual(parseReply('Here you go: {"t": {"2": "拉取"}}', 2), [null, '拉取']);
  assert.throws(() => parseReply('sorry', 1), /no JSON/);
});

test('normalize restores edge whitespace and removes plural slots', () => {
  assert.equal(normalize(' Commits stay. ', '提交會保留。'), ' 提交會保留。 ');
  assert.equal(normalize('{{0}} file{{1}}', ' {{0}} 個檔案{{1}} '), '{{0}} 個檔案');
});

test('batches split on count and size', () => {
  const item = (source) => ({ source, code: '' });
  assert.equal(batches([item('a'), item('b'), item('c')], 2).length, 2);
  assert.equal(batches([item('aaaa'), item('bbbb'), item('c')], 50, 6).length, 2);
});

test('chat sends the OpenCode Go request with identity and session headers', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return reply('{"t":{}}')();
  };
  await chat({ apiKey: 'k', model: 'm', session: 'ses_x', messages: [] }, fetchImpl);
  assert.equal(calls[0].url, ENDPOINT);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer k');
  assert.equal(calls[0].init.headers['User-Agent'], USER_AGENT);
  assert.equal(calls[0].init.headers['x-opencode-session'], 'ses_x');
  assert.equal(JSON.parse(calls[0].init.body).model, 'm');
});

test('chat retries 429 and surfaces other errors', async () => {
  let n = 0;
  const flaky = async () => (++n === 1 ? { ok: false, status: 429, text: async () => 'slow down' } : reply('ok')());
  assert.equal(await chat({ apiKey: 'k', model: 'm', session: 's', messages: [] }, flaky), 'ok');
  let m = 0;
  const dropped = async () => {
    if (++m === 1) throw new TypeError('fetch failed', { cause: { code: 'UND_ERR_SOCKET' } });
    return reply('ok')();
  };
  assert.equal(await chat({ apiKey: 'k', model: 'm', session: 's', messages: [] }, dropped), 'ok');
  const down = async () => {
    throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });
  };
  await assert.rejects(chat({ apiKey: 'k', model: 'm', session: 's', messages: [] }, down, 1), /fetch failed \(ECONNRESET\)/);
  const denied = async () => ({ ok: false, status: 403, text: async () => 'forbidden' });
  await assert.rejects(chat({ apiKey: 'k', model: 'm', session: 's', messages: [] }, denied), /403.*forbidden/);
});

test('translateBatch keeps good drafts and rejects broken ones with a reason', async () => {
  const items = [{ source: 'Push {{0}}' }, { source: 'Fetch' }, { source: 'Pull' }];
  const out = await translateBatch(items, { apiKey: 'k', model: 'm', session: 's', termbase: [] }, reply('{"t":{"1":"推送","2":"取得"}}'));
  assert.deepEqual(out, [
    { target: null, reason: 'draft is missing {{0}}' },
    { target: '取得' },
    { target: null, reason: 'missing from the reply' },
  ]);
});
