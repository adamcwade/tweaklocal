import { parse } from '@babel/parser';
import fs from 'node:fs';
import path from 'node:path';

function parseSource(content, file) {
  const plugins = /\.tsx?$/.test(file) ? ['typescript', 'jsx'] : ['jsx'];
  return parse(content, { sourceType: 'module', plugins, errorRecovery: true });
}

function walk(node, cb) {
  if (!node || typeof node.type !== 'string') return;
  cb(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, cb));
    else if (v && typeof v.type === 'string') walk(v, cb);
  }
}

/** loc format: "<relative file>:<line 1-based>:<col 0-based>" (matches the babel stamp) */
export function parseLoc(loc) {
  const m = /^(.*):(\d+):(\d+)$/.exec(loc);
  if (!m) throw new Error(`bad loc: ${loc}`);
  return { file: m[1], line: Number(m[2]), col: Number(m[3]) };
}

export function loadTarget(root, loc) {
  const parsed = parseLoc(loc);
  const { line, col } = parsed;
  // Stamps come from two sources: the babel plugin (root-relative path,
  // 0-based column) and the @cmdzero/react dev runtime (absolute path,
  // 1-based column). Normalize the path and match either column convention.
  const file = path.isAbsolute(parsed.file)
    ? path.relative(root, parsed.file)
    : parsed.file;
  if (file.startsWith('..')) throw new Error('file outside root');
  const abs = path.resolve(root, file);
  const content = fs.readFileSync(abs, 'utf8');
  const ast = parseSource(content, file);
  let element = null;
  let nearMiss = null;
  walk(ast, (n) => {
    if (n.type !== 'JSXElement' || !n.openingElement.loc) return;
    const s = n.openingElement.loc.start;
    if (s.line !== line) return;
    if (s.column === col) element = n;
    else if (s.column === col - 1 && !nearMiss) nearMiss = n;
  });
  element = element || nearMiss;
  if (!element) throw new Error(`no JSX element at ${loc}`);
  return { file, abs, content, element, ast };
}

export function describeTarget(root, loc) {
  const { file, content, element } = loadTarget(root, loc);
  const opening = element.openingElement;
  const texts = element.children
    .filter((c) => c.type === 'JSXText' && c.value.trim())
    .map((c) => ({ value: c.value.trim(), start: c.start, end: c.end }));
  const classAttr = opening.attributes.find(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name.name === 'className' &&
      a.value &&
      a.value.type === 'StringLiteral'
  );
  return {
    file,
    tagName: opening.name.name,
    span: { start: element.start, end: element.end },
    lines: { start: element.loc.start.line, end: element.loc.end.line },
    snippet: content.slice(element.start, element.end),
    texts,
    className: classAttr ? classAttr.value.value : null,
  };
}

export function applyTextEdit(root, loc, oldText, newText) {
  const { abs, content, element } = loadTarget(root, loc);
  const node = element.children.find(
    (c) => c.type === 'JSXText' && c.value.trim() === oldText.trim()
  );
  if (!node) throw new Error(`text "${oldText}" not found in element at ${loc}`);
  const raw = content.slice(node.start, node.end);
  const leading = raw.match(/^\s*/)[0];
  const trailing = raw.match(/\s*$/)[0];
  const next =
    content.slice(0, node.start) + leading + newText + trailing + content.slice(node.end);
  return writeChecked(abs, content, next);
}

// Rebuild a template-literal className, editing only the STATIC class tokens
// and keeping every `${...}` expression verbatim. Returns the `...` source.
function rebuildTemplateClasses(content, expr, removes, adds) {
  const SENT = '\u0000';
  const parts = [];
  expr.quasis.forEach((q, i) => {
    parts.push(q.value.raw);
    if (i < expr.expressions.length) parts.push(SENT);
  });
  let tokens = parts
    .join('')
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((t) => {
      if (!t.includes(SENT)) return [t];
      const out = [];
      t.split(SENT).forEach((seg, i, a) => { if (seg) out.push(seg); if (i < a.length - 1) out.push(SENT); });
      return out;
    });
  tokens = tokens.filter((t) => t === SENT || !removes.includes(t));
  for (const a of adds) if (!tokens.includes(a)) tokens.push(a);
  let ei = 0;
  const rebuilt = tokens
    .map((t) => (t === SENT ? '${' + content.slice(expr.expressions[ei].start, expr.expressions[ei++].end) + '}' : t))
    .join(' ');
  return '`' + rebuilt + '`';
}

// Resolve a local `const name = "..."` (or template) referenced by
// className={name}. Returns the string/template literal node, or null.
function resolveClassConst(ast, name) {
  let found = null;
  walk(ast, (n) => {
    if (found) return;
    if (n.type === 'VariableDeclarator' && n.id?.type === 'Identifier' && n.id.name === name) {
      const init = unwrapExpr(n.init);
      if (init && (init.type === 'StringLiteral' || init.type === 'TemplateLiteral')) found = init;
    }
  });
  return found;
}

// The literal node we can actually edit for a className attribute — the
// attribute's own string/template, or the `const` it references.
function classValueNode(ast, attr) {
  const v = attr.value;
  if (v && v.type === 'StringLiteral') return v;
  const expr = v && v.type === 'JSXExpressionContainer' ? v.expression : null;
  if (!expr) return null;
  if (expr.type === 'StringLiteral' || expr.type === 'TemplateLiteral') return expr;
  if (expr.type === 'Identifier') return resolveClassConst(ast, expr.name);
  return null;
}

export function applyClassEdit(root, loc, removes = [], adds = []) {
  const { abs, content, element, ast } = loadTarget(root, loc);
  const opening = element.openingElement;
  const classAttrs = opening.attributes.filter(
    (a) => a.type === 'JSXAttribute' && a.name.name === 'className'
  );

  const editList = (list) => {
    let classes = list.split(/\s+/).filter(Boolean).filter((c) => !removes.includes(c));
    for (const a of adds) if (!classes.includes(a)) classes.push(a);
    return classes.join(' ');
  };

  // No className yet — add a fresh string attribute.
  if (!classAttrs.length) {
    const pos = opening.name.end;
    return writeChecked(abs, content, content.slice(0, pos) + ` className="${adds.join(' ')}"` + content.slice(pos));
  }

  // When an element has DUPLICATE className attributes (a corruption the old
  // class editor could introduce), React renders only the LAST one. Edit that
  // effective className, and strip the earlier dead duplicates so the element
  // ends up valid and single-className.
  const attr = classAttrs[classAttrs.length - 1];
  const node = classValueNode(ast, attr);
  if (!node) {
    throw new Error(
      "className here is computed, so I can't edit its classes deterministically. Use the size/color controls (inline style) or describe the change to route it through the model."
    );
  }

  const replacement =
    node.type === 'TemplateLiteral'
      ? rebuildTemplateClasses(content, node, removes, adds)
      : JSON.stringify(editList(node.value));

  // Apply the value replacement plus removal of each dead duplicate attribute
  // (with its leading space), right-to-left so offsets stay valid.
  const edits = [{ start: node.start, end: node.end, text: replacement }];
  for (const d of classAttrs.slice(0, -1)) {
    const start = content[d.start - 1] === ' ' ? d.start - 1 : d.start;
    edits.push({ start, end: d.end, text: '' });
  }
  edits.sort((a, b) => b.start - a.start);
  let next = content;
  for (const e of edits) next = next.slice(0, e.start) + e.text + next.slice(e.end);
  return writeChecked(abs, content, next);
}

/**
 * Merge CSS properties into the element's inline style prop — the
 * styling-system-agnostic edit lane (works with CSS modules, styled-components,
 * vanilla CSS, anything). styles: { camelCaseProp: value | null }, null removes.
 * Appended keys win in React's style object, so replacements are drop+append.
 */
export function applyStyleEdit(root, loc, styles) {
  const { abs, content, element } = loadTarget(root, loc);
  const opening = element.openingElement;
  const toSrc = (v) => (typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "\\'")}'`);
  const attr = opening.attributes.find(
    (a) => a.type === 'JSXAttribute' && a.name.name === 'style'
  );

  if (!attr) {
    const entries = Object.entries(styles).filter(([, v]) => v != null);
    if (!entries.length) return writeChecked(abs, content, content);
    const obj = entries.map(([k, v]) => `${k}: ${toSrc(v)}`).join(', ');
    const pos = opening.name.end;
    return writeChecked(
      abs,
      content,
      content.slice(0, pos) + ` style={{ ${obj} }}` + content.slice(pos)
    );
  }

  const expr =
    attr.value && attr.value.type === 'JSXExpressionContainer' ? attr.value.expression : null;
  if (!expr || expr.type !== 'ObjectExpression')
    throw new Error('style prop is not an object literal — describe the change instead');

  // Rebuild the object: keep untouched properties (and spreads) verbatim,
  // drop replaced/removed keys, append new values last.
  const parts = [];
  for (const p of expr.properties) {
    if (p.type === 'ObjectProperty' && !p.computed) {
      const name =
        p.key.type === 'Identifier' ? p.key.name : p.key.type === 'StringLiteral' ? p.key.value : null;
      if (name && name in styles) continue;
    }
    parts.push(content.slice(p.start, p.end));
  }
  for (const [k, v] of Object.entries(styles)) if (v != null) parts.push(`${k}: ${toSrc(v)}`);

  // Preserve multi-line formatting when the original object was multi-line.
  const original = content.slice(expr.start, expr.end);
  let objSrc;
  if (original.includes('\n') && expr.properties.length) {
    const firstProp = expr.properties[0];
    const lineStart = content.lastIndexOf('\n', firstProp.start) + 1;
    const indent = content.slice(lineStart, firstProp.start).match(/^\s*/)[0];
    const braceLineStart = content.lastIndexOf('\n', expr.end - 1) + 1;
    const braceIndent = content.slice(braceLineStart).match(/^\s*/)[0];
    objSrc = `{\n${indent}${parts.join(`,\n${indent}`)},\n${braceIndent}}`;
  } else {
    objSrc = `{ ${parts.join(', ')} }`;
  }
  return writeChecked(
    abs,
    content,
    content.slice(0, expr.start) + objSrc + content.slice(expr.end)
  );
}

// Remove an element from its source string, consuming its whole line(s) when
// it sits alone on them. Returns the new content, or null if unparseable.
function removeElementFromContent(content, element, file) {
  let start = element.start;
  let end = element.end;
  const lineStart = content.lastIndexOf('\n', start - 1) + 1;
  const afterMatch = content.slice(end).match(/^[ \t]*\n/);
  if (/^[ \t]*$/.test(content.slice(lineStart, start)) && afterMatch) {
    start = lineStart;
    end += afterMatch[0].length;
  }
  const next = content.slice(0, start) + content.slice(end);
  try {
    parseSource(next, file);
    return next;
  } catch {
    return null;
  }
}

// Ancestor chain from `element` up to the Program node (element first).
function ancestorChain(ast, element) {
  const chain = [];
  (function descend(node, trail) {
    if (!node || typeof node.type !== 'string') return false;
    if (node === element) {
      chain.push(element, ...trail);
      return true;
    }
    if (node.start > element.start || node.end < element.end) return false;
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      const v = node[key];
      const kids = Array.isArray(v) ? v : [v];
      for (const kid of kids) {
        if (kid && typeof kid.type === 'string' && descend(kid, [node, ...trail])) return true;
      }
    }
    return false;
  })(ast, []);
  return chain;
}

const FN_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

// If the chain shows `element` is the RETURNED VALUE of the innermost enclosing
// function (only Return/Block between them), return that function node.
// This gate matters: without it, a parse-breaking delete anywhere inside a
// named component would wrongly escalate to removing the component's usage.
function returningFunction(chain) {
  for (let i = 1; i < chain.length; i++) {
    const t = chain[i].type;
    if (t === 'ReturnStatement' || t === 'BlockStatement') continue;
    return FN_TYPES.has(t) ? chain[i] : null;
  }
  return null;
}

function nameOfFunction(ast, fn) {
  if (!fn) return null;
  if (fn.id && fn.id.name) return fn.id.name;
  let name = null;
  walk(ast, (n) => {
    if (
      n.type === 'VariableDeclarator' &&
      n.init && n.init.start === fn.start && n.init.end === fn.end &&
      n.id && n.id.type === 'Identifier'
    ) name = n.id.name;
  });
  return name;
}

// Walk up from the element looking for a `{...}` JSX expression whose whole
// removal parses — covers `{cond && <el/>}` (conditional) and `{arr.map(...)}`
// (list template). Never crosses a function boundary except an inline callback
// (a function that is itself a call argument, e.g. the .map render callback).
// For lists, also returns the map CallExpression so the caller can target the
// underlying data array instead of the whole list.
function removableExpressionContainer(chain) {
  for (let i = 1; i < chain.length; i++) {
    const node = chain[i];
    if (node.type === 'JSXExpressionContainer') {
      const inner = chain[i - 1];
      const isList = FN_TYPES.has(inner?.type) || inner?.type === 'CallExpression';
      return { container: node, kind: isList ? 'list' : 'conditional block', mapCall: isList ? inner : null };
    }
    if (FN_TYPES.has(node.type)) {
      // crossing a function is only allowed for inline callbacks (map etc.)
      const parent = chain[i + 1];
      if (!parent || parent.type !== 'CallExpression') return null;
    }
  }
  return null;
}

// Unwrap TS wrappers around an initializer (as const / satisfies / parens).
function unwrapExpr(node) {
  let n = node;
  while (n && (n.type === 'TSAsExpression' || n.type === 'TSSatisfiesExpression' || n.type === 'TSNonNullExpression' || n.type === 'ParenthesizedExpression'))
    n = n.expression;
  return n;
}

// For `{items.map(cb)}`: resolve `items` to a local `const items = [...]`
// ArrayExpression in the same file. Returns the array node or null.
function resolveMappedArray(ast, mapCall) {
  let call = mapCall;
  // chain may have handed us the arrow (expression-body case) — find the call
  if (call && FN_TYPES.has(call.type)) return null; // caller passes the real call below
  if (!call || call.type !== 'CallExpression') return null;
  const callee = call.callee;
  if (
    callee?.type !== 'MemberExpression' ||
    callee.property?.type !== 'Identifier' ||
    !['map', 'flatMap'].includes(callee.property.name) ||
    callee.object?.type !== 'Identifier'
  ) return null;
  const arrName = callee.object.name;
  let arr = null;
  walk(ast, (n) => {
    if (arr) return;
    if (n.type === 'VariableDeclarator' && n.id?.type === 'Identifier' && n.id.name === arrName) {
      const init = unwrapExpr(n.init);
      if (init?.type === 'ArrayExpression') arr = init;
    }
  });
  return arr;
}

// Remove the k-th element of an ArrayExpression, handling commas and whole
// lines. Returns new content, or null if the result doesn't parse.
function removeArrayElement(content, arrayNode, k, file) {
  const el = arrayNode.elements[k];
  if (!el) return null;
  let start = el.start;
  let end = el.end;
  const after = content.slice(end).match(/^\s*,/);
  if (after) end += after[0].length;
  else {
    const before = content.slice(0, start).match(/,\s*$/);
    if (before) start -= before[0].length;
  }
  const lineStart = content.lastIndexOf('\n', start - 1) + 1;
  const trailing = content.slice(end).match(/^[ \t]*\n/);
  if (/^[ \t]*$/.test(content.slice(lineStart, start)) && trailing) {
    start = lineStart;
    end += trailing[0].length;
  }
  const next = content.slice(0, start) + content.slice(end);
  try {
    parseSource(next, file);
    return next;
  } catch {
    return null;
  }
}

// Walk the project for JSX usages of <Name ...>. Returns [{file, element}].
function findUsages(root, name) {
  const usages = [];
  const skip = new Set(['node_modules', '.next', '.git', 'dist', '.turbo']);
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (!skip.has(e.name)) stack.push(full); continue; }
      if (!/\.(jsx|tsx)$/.test(e.name)) continue;
      let content, ast;
      try {
        content = fs.readFileSync(full, 'utf8');
        if (!content.includes('<' + name)) continue; // cheap prefilter
        ast = parseSource(content, e.name);
      } catch { continue; }
      walk(ast, (n) => {
        if (n.type !== 'JSXElement') return;
        const openName = n.openingElement.name;
        if (openName.type === 'JSXIdentifier' && openName.name === name) {
          usages.push({ file: path.relative(root, full), abs: full, content, element: n });
        }
      });
    }
  }
  return usages;
}

/**
 * Delete behavior, in order:
 *  1. Normal element (has siblings): remove it in place.
 *  2. List template (`{arr.map(...)}`): the clicked DOM instance's `index`
 *     identifies the data item — remove that ONE entry from the local array
 *     literal. Deleting one card removes one card, not the list. (To remove a
 *     whole list, select its surrounding wrapper element instead.)
 *  3. Conditional (`{cond && <el/>}`): remove the whole conditional block.
 *  4. Sole return of a NAMED component used in exactly one place: remove that
 *     usage at its call site.
 *  Otherwise refuse with an actionable message (ambiguous → model lane).
 */
export function applyDeleteElement(root, loc, { dryRun = false, index } = {}) {
  // reuse loadTarget's AST — element identity must hold for the ancestor walk
  const { abs, content, element, file, ast } = loadTarget(root, loc);

  const inPlace = removeElementFromContent(content, element, file);
  if (inPlace !== null) {
    if (dryRun) return { abs, before: content, after: inPlace, wouldWrite: false };
    return writeChecked(abs, content, inPlace);
  }

  // In-place removal breaks the file — walk up for a deletable wrapper.
  const chain = ancestorChain(ast, element);

  const wrapper = removableExpressionContainer(chain);
  if (wrapper && wrapper.kind === 'list') {
    const arr = resolveMappedArray(ast, wrapper.mapCall);
    if (arr && Number.isInteger(index) && index >= 0 && index < arr.elements.length) {
      const next = removeArrayElement(content, arr, index, file);
      if (next !== null) {
        const detail = `item ${index + 1} of ${arr.elements.length}`;
        if (dryRun) return { abs, before: content, after: next, wouldWrite: false, removedBlock: detail };
        return { ...writeChecked(abs, content, next), removedBlock: detail };
      }
    }
    // data not editable deterministically (imported/computed array, or the
    // instance index is unknown) — never silently delete the whole list
    throw new Error(
      "this is one item in a rendered list whose data I can't safely edit here. Describe the change (e.g. \"remove the second stat\") and it'll route through the model — or select the list's surrounding container to delete the whole list."
    );
  }
  if (wrapper) {
    const next = removeElementFromContent(content, wrapper.container, file);
    if (next !== null) {
      if (dryRun) return { abs, before: content, after: next, wouldWrite: false, removedBlock: wrapper.kind };
      return { ...writeChecked(abs, content, next), removedBlock: wrapper.kind };
    }
  }

  // Not a removable wrapper — usage removal, but ONLY when the element really
  // is the returned output of a named component.
  const fn = returningFunction(chain);
  const name = nameOfFunction(ast, fn);
  if (!name || !/^[A-Z]/.test(name)) {
    throw new Error(
      "can't delete this in place — it's the only thing rendered here and there's no removable wrapper. Describe the change instead (e.g. \"remove this from the list\") and it'll route through the model."
    );
  }

  const usages = findUsages(root, name).filter(
    (u) => !(u.abs === abs && u.element.start === element.start && u.element.end === element.end)
  );
  if (usages.length === 0) {
    throw new Error(
      `can't find where <${name}> is used, so there's no usage to remove. Describe the change instead and it'll route through the model.`
    );
  }
  if (usages.length > 1) {
    throw new Error(
      `<${name}> is used in ${usages.length} places — deleting one is ambiguous. Select the specific <${name}> instance you want removed, or describe the change.`
    );
  }

  const usage = usages[0];
  const removed = removeElementFromContent(usage.content, usage.element, usage.file);
  if (removed === null) {
    throw new Error(
      `removing the <${name}> usage would break ${usage.file}. Describe the change instead.`
    );
  }
  if (dryRun) return { abs: usage.abs, before: usage.content, after: removed, wouldWrite: false, removedUsage: name };
  return { ...writeChecked(usage.abs, usage.content, removed), removedUsage: name };
}

// ---------- reorder / move ----------

const DIR_STEP = { up: -1, left: -1, prev: -1, down: 1, right: 1, next: 1 };

// The JSX-element siblings of `element` (elements sharing its parent), plus the
// index of `element` among them. Only when the parent is itself JSX.
function jsxElementSiblings(ast, element) {
  const chain = ancestorChain(ast, element);
  const parent = chain[1];
  if (!parent || (parent.type !== 'JSXElement' && parent.type !== 'JSXFragment')) return null;
  const list = (parent.children || []).filter((c) => c.type === 'JSXElement');
  const pos = list.findIndex((n) => n.start === element.start && n.end === element.end);
  if (pos < 0) return null;
  return { list, pos };
}

// The full source block of a node: its own span, extended to swallow the
// leading indent on its line and one trailing newline, so a moved element
// carries its own line(s) cleanly.
function nodeBlock(content, node) {
  let start = node.start;
  let end = node.end;
  const lineStart = content.lastIndexOf('\n', start - 1) + 1;
  if (/^[ \t]*$/.test(content.slice(lineStart, start))) start = lineStart;
  const after = content.slice(end).match(/^[ \t]*\n/);
  if (after) end += after[0].length;
  return { start, end, text: content.slice(start, end) };
}

// Move sibling nodes[from] to position `to` by cutting its line-block and
// re-inserting it before/after the anchor. Returns new content, or null if it
// doesn't parse.
function moveNode(content, siblings, from, to, file) {
  if (from === to || to < 0 || to >= siblings.length) return null;
  const block = nodeBlock(content, siblings[from]);
  const removedLen = block.end - block.start;
  const without = content.slice(0, block.start) + content.slice(block.end);
  const adj = (p) => (p > block.start ? p - removedLen : p);
  const anchor = siblings[to];
  const aBlock = nodeBlock(without, { start: adj(anchor.start), end: adj(anchor.end) });
  const insertAt = to > from ? aBlock.end : aBlock.start;
  const next = without.slice(0, insertAt) + block.text + without.slice(insertAt);
  try { parseSource(next, file); return next; } catch { return null; }
}

// Reorder the elements of an array literal, preserving inline vs. multiline
// formatting. Returns new content, or null if it doesn't parse.
function moveArrayElement(content, arr, from, to, file) {
  const els = arr.elements;
  if (from === to || from < 0 || to < 0 || from >= els.length || to >= els.length) return null;
  const texts = els.map((n) => content.slice(n.start, n.end));
  const [m] = texts.splice(from, 1);
  texts.splice(to, 0, m);
  const first = els[0], last = els[els.length - 1];
  const interior = content.slice(first.start, last.end);
  let joined;
  if (interior.includes('\n')) {
    const ls = content.lastIndexOf('\n', first.start - 1) + 1;
    const indent = content.slice(ls, first.start).match(/^\s*/)[0];
    joined = texts.join(',\n' + indent);
  } else {
    joined = texts.join(', ');
  }
  const next = content.slice(0, first.start) + joined + content.slice(last.end);
  try { parseSource(next, file); return next; } catch { return null; }
}

// The name a file's default export renders as (`export default function Hero`).
function defaultExportName(ast) {
  let name = null;
  walk(ast, (n) => {
    if (name || n.type !== 'ExportDefaultDeclaration') return;
    const d = n.declaration;
    if (d.type === 'FunctionDeclaration' && d.id) name = d.id.name;
    else if (d.type === 'Identifier') name = d.name;
  });
  return name;
}

/**
 * Reorder the selected element among its siblings.
 *  - map item (`{arr.map(...)}`)      → reorder the backing array literal
 *  - JSX-element siblings in the file → move the element among them
 *  - otherwise (section root)         → move THIS file's component usage
 *    (`<Hero/>`) among its siblings in the importing file (e.g. page.tsx)
 * `dir` is up/down/left/right (prev/next); `toIndex` gives an absolute target
 * (drag). `index` is the clicked instance index for mapped items.
 */
export function applyMove(root, loc, { dir, index, toIndex, dryRun = false } = {}) {
  const { abs, content, element, file, ast } = loadTarget(root, loc);
  const step = DIR_STEP[dir] ?? 1;
  const finish = (writeAbs, before, after, detail) => {
    if (after == null) throw new Error(detail || "can't move this the way you dragged it.");
    if (dryRun) return { abs: writeAbs, before, after, wouldWrite: false, moved: detail };
    return { ...writeChecked(writeAbs, before, after), moved: detail };
  };

  const chain = ancestorChain(ast, element);

  // Case B: one item of a rendered list → reorder the data array.
  const wrapper = removableExpressionContainer(chain);
  if (wrapper && wrapper.kind === 'list') {
    const arr = resolveMappedArray(ast, wrapper.mapCall);
    if (!arr) throw new Error("this list's data isn't a local array I can safely reorder here.");
    const from = Number.isInteger(index) ? index : 0;
    const to = toIndex != null ? toIndex : from + step;
    if (to < 0 || to >= arr.elements.length) throw new Error('already at the end of the list.');
    const next = moveArrayElement(content, arr, from, to, file);
    return finish(abs, content, next, `item ${from + 1} → ${to + 1} of ${arr.elements.length}`);
  }

  // Case A: JSX-element siblings in this same file.
  const sib = jsxElementSiblings(ast, element);
  if (sib && sib.list.length > 1) {
    const from = sib.pos;
    const to = toIndex != null ? toIndex : from + step;
    if (to < 0 || to >= sib.list.length) throw new Error('already at the edge — nothing to swap with.');
    const next = moveNode(content, sib.list, from, to, file);
    return finish(abs, content, next, `${from + 1} → ${to + 1} of ${sib.list.length}`);
  }

  // Case C: no movable siblings here — treat it as a section and move THIS
  // file's component usage among its siblings in the importing file.
  const name = defaultExportName(ast) || nameOfFunction(ast, returningFunction(chain));
  if (!name || !/^[A-Z]/.test(name)) {
    throw new Error("there's nothing to reorder here — this element has no movable siblings. Select the section's outer container (or a card in a row).");
  }
  const usages = findUsages(root, name);
  if (usages.length === 0) throw new Error(`can't find where <${name}> is placed, so there's no section order to change.`);
  if (usages.length > 1) throw new Error(`<${name}> is used in ${usages.length} places — reordering is ambiguous.`);
  const u = usages[0];
  const uAst = parseSource(u.content, u.file);
  let uEl = null;
  walk(uAst, (n) => {
    if (uEl || n.type !== 'JSXElement') return;
    const nm = n.openingElement.name;
    if (nm.type === 'JSXIdentifier' && nm.name === name && n.start === u.element.start) uEl = n;
  });
  const usib = uEl && jsxElementSiblings(uAst, uEl);
  if (!usib || usib.list.length < 2) throw new Error(`<${name}> has no sibling sections to reorder with.`);
  const from = usib.pos;
  const to = toIndex != null ? toIndex : from + step;
  if (to < 0 || to >= usib.list.length) throw new Error(`<${name}> is already at the ${step < 0 ? 'top' : 'bottom'}.`);
  const next = moveNode(u.content, usib.list, from, to, u.file);
  return finish(u.abs, u.content, next, `${name}: section ${from + 1} → ${to + 1} of ${usib.list.length}`);
}

/** Returns null if the file parses, else the parse error message. */
export function checkSyntax(root, file) {
  const abs = path.resolve(root, file);
  try {
    parseSource(fs.readFileSync(abs, 'utf8'), file);
    return null;
  } catch (e) {
    return e.message;
  }
}

function writeChecked(abs, before, after) {
  fs.writeFileSync(abs, after);
  return { abs, before, after };
}
