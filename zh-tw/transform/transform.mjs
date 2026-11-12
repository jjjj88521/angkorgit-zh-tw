import ts from 'typescript';

const K = ts.SyntaxKind;
const hasWords = (s) => /[A-Za-z]{2,}/.test(s);
const isAllCaps = (s) => !/[a-z]/.test(s);

export function looksNatural(s) {
  const t = s.trim();
  if (t.length < 2 || !hasWords(t)) return false;
  if (/^(https?:|\/|\.\/|\.\.\/|#|[a-z]+:\/\/|@)/.test(t)) return false;
  if (/^[A-Z0-9_]+$/.test(t)) return false;
  if (!/\s/.test(t)) return /^[A-Z][a-z]+[.!?…:]*$/.test(t);
  if (/^[A-Z]/.test(t)) return true;
  if (/^[\d{]/.test(t) && /[A-Za-z]{3,}/.test(t)) return true;
  return /[.!?…]$/.test(t) && !/[:[\]]/.test(t);
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  rarr: '→', larr: '←', middot: '·', times: '×', copy: '©', bull: '•',
};

function decodeEntities(s) {
  let known = true;
  const out = s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[A-Za-z][A-Za-z0-9]*);/g, (match, e) => {
    if (e[0] === '#') return String.fromCodePoint(/^#[xX]/.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    if (e in ENTITIES) return ENTITIES[e];
    known = false;
    return match;
  });
  return known ? out : null;
}

// JSX drops whitespace-only lines and trims each line; same-line whitespace is significant.
function jsxTextParts(raw) {
  const lead = raw.match(/^\s*/)[0];
  const trail = raw.slice(lead.length).match(/\s*$/)[0];
  const mid = raw.slice(lead.length, raw.length - trail.length);
  const lines = mid.split(/\r?\n/);
  const core = lines
    .map((line, i) => (i > 0 ? line.trimStart() : line))
    .map((line, i) => (i < lines.length - 1 ? line.trimEnd() : line))
    .filter(Boolean)
    .join(' ');
  return { lead, core, trail };
}

function calleeName(node) {
  const e = node.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression)) return `${e.expression.text}.${e.name.text}`;
  return '?';
}

function isUnderConstAssertion(node) {
  for (let a = node.parent; a && !ts.isFunctionLike(a) && !ts.isSourceFile(a); a = a.parent) {
    if (ts.isAsExpression(a) && a.type.getText() === 'const') return true;
  }
  return false;
}

/**
 * Wraps hard-coded UI strings in `__t()` using position-based rules.
 * Returns the rewritten source plus every wrapped key and every natural-looking string left untouched.
 */
export function transform(source, fileName, rules, importPath) {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const attributes = new Set(rules.attributes);
  const objectKeys = new Set(rules.objectKeys);
  const callSinks = new Set(rules.callSinks);
  const keepExact = new Set(rules.keep?.exact ?? []);
  const keepPatterns = (rules.keep?.patterns ?? []).map((p) => new RegExp(p));
  const isKept = (text) => keepExact.has(text.trim()) || keepPatterns.some((p) => p.test(text));

  const edits = [];
  const entries = [];
  const candidates = [];
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const call = (key, params) => `__t(${JSON.stringify(key)}${params === undefined ? '' : `, [${params}]`})`;
  const record = (key, kind, node) => entries.push({ key, kind, line: lineOf(node.getStart(sf)) });

  function position(node) {
    let cur = node;
    let p = node.parent;
    for (;;) {
      if (ts.isParenthesizedExpression(p) || ts.isNonNullExpression(p)) {
        cur = p; p = p.parent;
      } else if (ts.isConditionalExpression(p)) {
        if (p.condition === cur) return null;
        cur = p; p = p.parent;
      } else if (ts.isBinaryExpression(p)) {
        const op = p.operatorToken.kind;
        if (op === K.BarBarToken || op === K.QuestionQuestionToken) { cur = p; p = p.parent; }
        else if (op === K.AmpersandAmpersandToken) { if (p.left === cur) return null; cur = p; p = p.parent; }
        else if (op === K.PlusToken || op === K.EqualsToken) return { type: 'other', ctx: 'BinaryExpression' };
        else return null;
      } else break;
    }
    if (ts.isJsxAttribute(p)) {
      const name = p.name.getText(sf);
      return attributes.has(name) ? { type: 'attr', direct: true } : { type: 'unknownAttr', ctx: name };
    }
    if (ts.isJsxExpression(p)) {
      const gp = p.parent;
      if (ts.isJsxAttribute(gp)) {
        const name = gp.name.getText(sf);
        return attributes.has(name) ? { type: 'attr' } : { type: 'unknownAttr', ctx: name };
      }
      return ts.isJsxElement(gp) || ts.isJsxFragment(gp) ? { type: 'jsxChild' } : null;
    }
    if (ts.isPropertyAssignment(p)) {
      if (p.initializer !== cur) return null;
      const name = p.name.getText(sf).replace(/^['"]|['"]$/g, '');
      return objectKeys.has(name) ? { type: 'objKey' } : { type: 'unknownKey', ctx: name };
    }
    if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
      if (!p.arguments?.includes(cur)) return null;
      const name = calleeName(p);
      return callSinks.has(name) ? { type: 'sink' } : { type: 'other', ctx: `call:${name}` };
    }
    if (
      ts.isLiteralTypeNode(p) || ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p) ||
      ts.isCaseClause(p) || ts.isElementAccessExpression(p) || ts.isEnumMember(p) || ts.isExpressionStatement(p) ||
      ts.isTaggedTemplateExpression(p) || ts.isAsExpression(p) || ts.isSatisfiesExpression(p) || ts.isImportTypeNode(p) ||
      ts.isPropertySignature(p) || ts.isComputedPropertyName(p)
    ) return null;
    return { type: 'other', ctx: K[p.kind] };
  }

  function accepts(pos, text) {
    switch (pos.type) {
      case 'jsxChild': return hasWords(text) && !isAllCaps(text);
      case 'attr':
      case 'sink': return hasWords(text);
      case 'objKey': return looksNatural(text);
      default: return false;
    }
  }

  function handleLiteral(node, text, wrap) {
    const pos = position(node);
    if (!pos || isKept(text)) return;
    if (accepts(pos, text) && !isUnderConstAssertion(node)) return wrap(pos);
    if (looksNatural(text)) candidates.push({ text, ctx: pos.ctx ?? pos.type, line: lineOf(node.getStart(sf)) });
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      const { lead, core, trail } = jsxTextParts(node.text);
      const key = decodeEntities(core);
      if (key === null) candidates.push({ text: core, ctx: 'jsxText:entity', line: lineOf(node.getStart(sf)) });
      else if (hasWords(key) && !isKept(key)) {
        edits.push({ start: node.pos, end: node.end, text: `${lead}{${call(key)}}${trail}` });
        record(key, 'jsxText', node);
      }
      return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const inJsxAttr = ts.isJsxAttribute(node.parent);
      const text = inJsxAttr ? decodeEntities(node.text) : node.text;
      if (text === null) return;
      handleLiteral(node, text, (pos) => {
        const replacement = pos.direct ? `{${call(text)}}` : call(text);
        edits.push({ start: node.getStart(sf), end: node.getEnd(), text: replacement });
        record(text, pos.type, node);
      });
      return;
    }
    if (ts.isTemplateExpression(node)) {
      const spans = node.templateSpans;
      const literalText = node.head.text + spans.map((s) => s.literal.text).join('');
      const pattern = node.head.text + spans.map((s, i) => `{{${i}}}${s.literal.text}`).join('');
      const simple = !literalText.includes('{{') && spans.every((s) => !(ts.isBinaryExpression(s.expression) && s.expression.operatorToken.kind === K.CommaToken));
      if (simple) {
        handleLiteral(node, pattern.replace(/\{\{\d+\}\}/g, '1'), (pos) => {
          if (!hasWords(literalText)) return;
          edits.push({ start: node.getStart(sf), end: spans[0].expression.getFullStart(), text: `__t(${JSON.stringify(pattern)}, [` });
          for (let i = 0; i < spans.length - 1; i++) {
            edits.push({ start: spans[i].expression.getEnd(), end: spans[i + 1].expression.getFullStart(), text: ', ' });
          }
          edits.push({ start: spans[spans.length - 1].expression.getEnd(), end: node.getEnd(), text: '])' });
          record(pattern, `${pos.type}:template`, node);
        });
      }
      spans.forEach((s) => visit(s.expression));
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (!edits.length) return { code: source, entries, candidates };

  const firstStatement = sf.statements.find((s) => !(ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression)));
  const importAt = firstStatement ? firstStatement.getStart(sf) : source.length;
  edits.push({ start: importAt, end: importAt, text: `import { __t } from '${importPath}';\n` });

  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let code = source;
  let floor = Infinity;
  for (const e of edits) {
    if (e.end > floor) throw new Error(`${fileName}: overlapping edits near line ${lineOf(e.start)}`);
    code = code.slice(0, e.start) + e.text + code.slice(e.end);
    floor = e.start;
  }
  return { code, entries, candidates };
}
