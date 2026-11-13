// Adds fork-only code to upstream files at build time. Every anchor must appear exactly once,
// so an upstream change that moves it fails the build instead of silently dropping the feature.
// `replace` swaps the anchor out; use it only where a fragmented sentence cannot be translated in pieces.
export function injectSource(rel, source, edits) {
  let code = source;
  for (const edit of edits.filter((e) => e.file === rel)) {
    const count = code.split(edit.anchor).length - 1;
    if (count !== 1) throw new Error(`${rel}: inject anchor ${JSON.stringify(edit.anchor)} found ${count} times, expected 1`);
    const at = code.indexOf(edit.anchor);
    const end = at + edit.anchor.length;
    const middle = edit.replace ?? (edit.before ?? '') + edit.anchor + (edit.after ?? '');
    code = code.slice(0, at) + middle + code.slice(end);
    if (edit.import) code = `${edit.import}\n${code}`;
  }
  return code;
}
