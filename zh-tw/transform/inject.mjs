// Adds fork-only code to upstream files at build time. Every anchor must appear exactly once,
// so an upstream change that moves it fails the build instead of silently dropping the feature.
// `replace` swaps the anchor out; use it only where a fragmented sentence cannot be translated in pieces.
// Windows runners check files out with CRLF, so rule text written with \n follows the file's line endings.
export function injectSource(rel, source, edits) {
  let code = source;
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = (text) => text?.replace(/\r?\n/g, eol);
  for (const edit of edits.filter((e) => e.file === rel)) {
    const anchor = lines(edit.anchor);
    const count = code.split(anchor).length - 1;
    if (count !== 1) throw new Error(`${rel}: inject anchor ${JSON.stringify(edit.anchor)} found ${count} times, expected 1`);
    const at = code.indexOf(anchor);
    const end = at + anchor.length;
    const middle = lines(edit.replace) ?? (lines(edit.before) ?? '') + anchor + (lines(edit.after) ?? '');
    code = code.slice(0, at) + middle + code.slice(end);
    if (edit.import) code = `${edit.import}${eol}${code}`;
  }
  return code;
}
