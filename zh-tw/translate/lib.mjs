const PLACEHOLDER = /\{\{\d+\}\}/g;
const ENDPOINT = 'https://translation.googleapis.com/v3';
// Glossaries can only be hosted in us-central1, so requests that use one must go there too.
export const LOCATION = 'us-central1';

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unescapeHtml = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

/** Turns a source string into HTML whose placeholders the translator must leave alone. */
export function encode(source) {
  const lead = source.match(/^\s*/)[0];
  const trail = source.slice(lead.length).match(/\s*$/)[0];
  const core = source.slice(lead.length, source.length - trail.length);
  const html = escapeHtml(core)
    .replace(PLACEHOLDER, (p) => `<span translate="no">${p}</span>`)
    .replace(/\r?\n/g, '<br>');
  return { html, lead, trail };
}

export function decode(html, lead = '', trail = '') {
  const text = unescapeHtml(
    html
      .replace(/<span translate="no">\s*(\{\{\d+\}\})\s*<\/span>/g, '$1')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?[a-z][^>]*>/gi, ''),
  );
  return lead + text.trim() + trail;
}

export function batches(items, maxCount = 50, maxChars = 5000) {
  const out = [];
  let current = [];
  let chars = 0;
  for (const item of items) {
    if (current.length && (current.length >= maxCount || chars + item.length > maxChars)) {
      out.push(current);
      current = [];
      chars = 0;
    }
    current.push(item);
    chars += item.length;
  }
  if (current.length) out.push(current);
  return out;
}

/** Translates source strings en → zh-TW; returns one translation per input, in order. */
export async function translateBatch(sources, { project, token, glossary }, fetchImpl = fetch) {
  const encoded = sources.map(encode);
  const body = {
    sourceLanguageCode: 'en',
    targetLanguageCode: 'zh-TW',
    mimeType: 'text/html',
    contents: encoded.map((e) => e.html),
  };
  if (glossary) {
    body.glossaryConfig = { glossary: `projects/${project}/locations/${LOCATION}/glossaries/${glossary}`, ignoreCase: true };
  }
  const response = await fetchImpl(`${ENDPOINT}/projects/${project}/locations/${LOCATION}:translateText`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Google Translation request failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  }
  const data = await response.json();
  const results = (glossary && data.glossaryTranslations) || data.translations;
  if (!Array.isArray(results) || results.length !== sources.length) {
    throw new Error(`Google Translation returned ${results?.length ?? 0} results for ${sources.length} strings`);
  }
  return results.map((r, i) => decode(r.translatedText, encoded[i].lead, encoded[i].trail));
}

// A placeholder glued to the end of a word is a suffix slot (the "s" in `commit{{1}}`), which Chinese may drop.
function requiredPlaceholders(source) {
  return [...source.matchAll(PLACEHOLDER)].filter((m) => !/[A-Za-z]/.test(source[m.index - 1] ?? '')).map((m) => m[0]);
}

export function placeholderProblem(source, target) {
  const allowed = new Set(source.match(PLACEHOLDER) ?? []);
  const used = new Set(target.match(PLACEHOLDER) ?? []);
  const unknown = [...used].filter((p) => !allowed.has(p));
  if (unknown.length) return `uses ${unknown.join(', ')} which the source does not have`;
  const missing = requiredPlaceholders(source).filter((p) => !used.has(p));
  if (missing.length) return `is missing ${[...new Set(missing)].join(', ')}`;
  return null;
}

export const missingKeys = (locale) => Object.keys(locale).filter((key) => !locale[key]);

/**
 * Checks translated entries. `prefixConstraints` exist because upstream compares a label with
 * `label.startsWith('Pull')`: once both sides are translated the prefix has to survive.
 */
export function checkLocale(locale, { prefixConstraints = [] } = {}) {
  const errors = [];
  for (const [source, target] of Object.entries(locale)) {
    if (!target) continue;
    const problem = placeholderProblem(source, target);
    if (problem) errors.push(`${JSON.stringify(source)}: translation ${problem}`);
  }
  for (const { prefix, except } of prefixConstraints) {
    const translatedPrefix = locale[prefix];
    if (!translatedPrefix) continue;
    const applies = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|\\(|$)`);
    const skip = except ? new RegExp(except) : null;
    for (const [source, target] of Object.entries(locale)) {
      if (!target || source === prefix || !applies.test(source) || skip?.test(source)) continue;
      if (!target.startsWith(translatedPrefix)) {
        errors.push(`${JSON.stringify(source)}: translation must start with ${JSON.stringify(translatedPrefix)} (the translation of ${JSON.stringify(prefix)})`);
      }
    }
  }
  return { errors, missing: missingKeys(locale) };
}
