import test from 'node:test';
import assert from 'node:assert/strict';
import { transform } from '../transform/transform.mjs';

const rules = {
  attributes: ['title', 'placeholder'],
  objectKeys: ['label'],
  callSinks: ['toast.error'],
  labelSinks: { act: '*', AiError: [0] },
  proseExclude: ['ipc\\.ts$'],
  proseDenyKeys: ['authorization', 'id'],
  explicit: [{ file: 'utils\\.ts$', texts: ['{{0}}m ago', 'Orange'] }],
  keep: { exact: ['AngKorGit'], patterns: ['\\d+px\\b'] },
};
const run = (code, file = 'a.tsx') => transform(code, file, rules, './i18n');
const body = (code, file) => run(code, file).code.replace("import { __t } from './i18n';\n", '');

test('wraps JSX text and keeps significant same-line whitespace', () => {
  assert.equal(body('const a = <p>Delete <b>x</b></p>;'), 'const a = <p>{__t("Delete")} <b>x</b></p>;');
});

test('collapses multi-line JSX text the way JSX does', () => {
  const out = run('const a = (\n  <p>\n    Hello\n    world\n  </p>\n);');
  assert.deepEqual(out.entries.map((e) => e.key), ['Hello world']);
  assert.match(out.code, /<p>\n    \{__t\("Hello world"\)\}\n  <\/p>/);
});

test('decodes entities in JSX text', () => {
  assert.deepEqual(run('const a = <p>Save &amp; close</p>;').entries.map((e) => e.key), ['Save & close']);
});

test('wraps translatable attributes, literal or expression', () => {
  assert.equal(body('const a = <i title="Open" className="Big box" />;'), 'const a = <i title={__t("Open")} className="Big box" />;');
  assert.equal(body("const a = <i title={on ? 'On' : 'Off'} />;"), 'const a = <i title={on ? __t("On") : __t("Off")} />;');
});

test('never wraps a condition or a comparison operand', () => {
  assert.equal(run("const a = <i title={mode === 'Dark' ? 'Dark mode' : 'Light mode'} />;").entries.length, 2);
});

test('wraps strings rendered as JSX children', () => {
  assert.equal(body("const a = <p>{n === 1 ? 'file' : 'files'}</p>;"), 'const a = <p>{n === 1 ? __t("file") : __t("files")}</p>;');
});

test('wraps object keys only when the value reads as prose', () => {
  assert.equal(body("const a = { label: 'Drop stash', id: 'Drop stash' };", 'a.ts'), 'const a = { label: __t("Drop stash"), id: \'Drop stash\' };');
  assert.equal(run("const a = { label: 'flex gap-2' };", 'a.ts').entries.length, 0);
});

test('wraps arguments of configured sinks only', () => {
  assert.equal(body("toast.error('Push failed'); log('Push failed');", 'a.ts'), 'toast.error(__t("Push failed")); log(\'Push failed\');');
});

test('turns template literals into positional placeholders', () => {
  assert.equal(
    body("toast.error(`Could not open ${name}: ${reason(e)}`);", 'a.ts'),
    'toast.error(__t("Could not open {{0}}: {{1}}", [name, reason(e)]));',
  );
});

test('leaves templates without words alone', () => {
  assert.equal(run('const a = <i title={`${a}/${b}`} />;').entries.length, 0);
});

test('skips kept strings and const assertions', () => {
  assert.equal(run('const a = <p>AngKorGit</p>;').entries.length, 0);
  assert.equal(run("const a = [{ label: 'Theme' }] as const;", 'a.ts').entries.length, 0);
});

test('reports natural-looking strings it did not wrap', () => {
  const out = run("const names = ['Dockerfile'];", 'a.ts');
  assert.equal(out.entries.length, 0);
  assert.deepEqual(out.candidates.map((c) => c.text), ['Dockerfile']);
});

test('label sinks wrap only the listed argument positions', () => {
  assert.equal(
    body("throw new AiError('Request failed', 'Anthropic'); act(`Push ${b}`, op);", 'a.ts'),
    'throw new AiError(__t("Request failed"), \'Anthropic\'); act(__t("Push {{0}}", [b]), op);',
  );
});

test('wraps multi-word prose in arrays, variables and returns', () => {
  const out = run("const a = ['Toggle terminal', 'End']; const b = 'Set up AI'; function f() { return `Fetched ${n} remotes.`; }", 'a.ts');
  assert.deepEqual(out.entries.map((e) => e.key), ['Toggle terminal', 'Set up AI', 'Fetched {{0}} remotes.']);
});

test('prose under an unknown key is wrapped unless the key is denied', () => {
  const out = run("const a = { outcome: 'Nothing was pushed.', authorization: 'Bearer token value' };", 'a.ts');
  assert.deepEqual(out.entries.map((e) => e.key), ['Nothing was pushed.']);
});

test('prose rules skip excluded files and kept patterns', () => {
  assert.equal(run("const a = ['Demo output line'];", 'core/ipc.ts').entries.length, 0);
  assert.equal(run("const a = ['12px Mono Font, monospace'];", 'a.ts').entries.length, 0);
});

test('explicit texts are wrapped only in their file, const assertions included', () => {
  const code = "const c = ['Orange'] as const; const t = `${n}m ago`;";
  assert.deepEqual(run(code, 'shared/utils.ts').entries.map((e) => e.key), ['Orange', '{{0}}m ago']);
  assert.equal(run(code, 'shared/other.ts').entries.length, 0);
});

test('adds the import after directives and leading comments', () => {
  const out = run("// @ts-nocheck\n'use client';\nconst a = <p>Hi there</p>;");
  assert.equal(out.code, "// @ts-nocheck\n'use client';\nimport { __t } from './i18n';\nconst a = <p>{__t(\"Hi there\")}</p>;");
});

test('is idempotent', () => {
  const once = run("const a = <i title=\"Open\">{x ? 'Yes' : 'No'} done</i>; toast.error(`Bad ${x}`);").code;
  assert.equal(transform(once, 'a.tsx', rules, './i18n').entries.length, 0);
});
