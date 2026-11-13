import { MAINLAND_TERMS, placeholderProblem, suffixSlots } from './check.mjs';

export const ENDPOINT = 'https://opencode.ai/inference/go/openai/v1/chat/completions';
export const USER_AGENT = 'angkorgit-zh-tw-translator/0.1';

export function parseTermbase(csv) {
  return csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const comma = line.indexOf(',');
      return [line.slice(0, comma).trim(), line.slice(comma + 1).trim()];
    });
}

export function systemPrompt(termbase) {
  const terms = termbase.map(([en, zh]) => `${en} → ${zh}`).join('\n');
  const avoid = Object.entries(MAINLAND_TERMS).map(([cn, tw]) => `${cn}→${tw}`).join('、');
  return `You translate the user interface of AngKorGit, a desktop Git client, from English to Traditional Chinese as used in Taiwan (zh-TW).

Rules:
1. Write natural Taiwanese software wording, the way Taiwanese Git GUI and developer tools read. Never use Simplified Chinese characters or Mainland Chinese wording. Avoid: ${avoid}.
2. Use these Git terms exactly (they follow Git's official zh_TW translation). Apply them to inflected forms too (stashing, checked-out, committed, rebased):
${terms}
3. Address the user as 你, never 您.
4. Keep every {{n}} placeholder exactly as written. A placeholder directly after an English word, like the "s" in commit{{1}} or file{{1}}, is an English plural suffix: drop it.
5. Do not translate product names, code identifiers, file paths, command names, keyboard keys, URLs or text in backticks: AngKorGit, Git, GitHub, GitLab, Bitbucket, HEAD, main, origin, git cherry-pick -x.
6. Use full-width punctuation (，。：；？！（）「」) between Chinese words. Keep the ellipsis … as is.
7. Some strings are fragments of one sentence split around a variable or a link; their context line shows how they join. Translate each fragment so the joined sentence reads naturally, keep its leading or trailing punctuation role, and never add text that belongs to a neighbouring fragment.
8. Keep it as short as the English. No explanations, no quotes around the result.

Each item has an id, the English text, and where it appears in the source code. Answer with JSON only:
{"t": {"<id>": "<translation>", ...}} containing every id.`;
}

export function userPrompt(items) {
  return JSON.stringify(
    items.map((item, i) => ({ id: String(i + 1), en: item.source, where: item.where, code: item.code })),
    null,
    1,
  );
}

export function parseReply(text, count) {
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('reply contains no JSON object');
  const data = JSON.parse(cleaned.slice(start, end + 1));
  const map = data.t ?? data.translations ?? data;
  const out = [];
  for (let i = 1; i <= count; i++) out.push(typeof map[String(i)] === 'string' ? map[String(i)] : null);
  return out;
}

// The model decides wording; whitespace at the edges and English plural slots are restored by code.
export function normalize(source, target) {
  const lead = source.match(/^\s*/)[0];
  const trail = source.match(/\s*$/)[0];
  let text = target.trim();
  for (const slot of suffixSlots(source)) text = text.split(slot).join('');
  return lead + text + trail;
}

export function batches(items, maxCount = 40, maxChars = 6000) {
  const out = [];
  let current = [];
  let chars = 0;
  for (const item of items) {
    const size = item.source.length + (item.code?.length ?? 0);
    if (current.length && (current.length >= maxCount || chars + size > maxChars)) {
      out.push(current);
      current = [];
      chars = 0;
    }
    current.push(item);
    chars += size;
  }
  if (current.length) out.push(current);
  return out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function chat({ apiKey, model, session, messages }, fetchImpl = fetch, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
        'x-opencode-session': session,
      },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 8192 }),
    });
    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new Error(`${model} returned no content`);
      return content;
    }
    const body = (await response.text()).slice(0, 300);
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= attempts) throw new Error(`${model} request failed (${response.status}): ${body}`);
    await sleep(2000 * attempt);
  }
}

/** Translates one batch; returns a translation (or null when the draft was rejected) per item, with reasons. */
export async function translateBatch(items, { apiKey, model, session, termbase }, fetchImpl = fetch) {
  const messages = [
    { role: 'system', content: systemPrompt(termbase) },
    { role: 'user', content: userPrompt(items) },
  ];
  const reply = await chat({ apiKey, model, session, messages }, fetchImpl);
  const raw = parseReply(reply, items.length);
  return raw.map((target, i) => {
    const source = items[i].source;
    if (target === null) return { target: null, reason: 'missing from the reply' };
    const text = normalize(source, target);
    const problem = placeholderProblem(source, text);
    return problem ? { target: null, reason: `draft ${problem}` } : { target: text };
  });
}
