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
  // 0-based column) and the @tweaklocal/react dev runtime (absolute path,
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
  return { file, abs, content, element };
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

export function applyClassEdit(root, loc, removes = [], adds = []) {
  const { abs, content, element } = loadTarget(root, loc);
  const opening = element.openingElement;
  const attr = opening.attributes.find(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name.name === 'className' &&
      a.value &&
      a.value.type === 'StringLiteral'
  );
  let next;
  if (attr) {
    let classes = attr.value.value.split(/\s+/).filter(Boolean);
    classes = classes.filter((c) => !removes.includes(c));
    for (const a of adds) if (!classes.includes(a)) classes.push(a);
    next =
      content.slice(0, attr.value.start + 1) +
      classes.join(' ') +
      content.slice(attr.value.end - 1);
  } else {
    const pos = opening.name.end;
    next =
      content.slice(0, pos) + ` className="${adds.join(' ')}"` + content.slice(pos);
  }
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

// If `element` is the sole rendered output of a NAMED component function,
// return that component's name. Returns null when the innermost enclosing
// function is an anonymous callback (e.g. a `.map()` list item) — those are
// data-driven and belong in the model lane, not a usage removal.
function soleReturnComponentName(ast, element) {
  // innermost function whose span contains the element
  let inner = null;
  walk(ast, (n) => {
    if (
      n.type !== 'FunctionDeclaration' &&
      n.type !== 'FunctionExpression' &&
      n.type !== 'ArrowFunctionExpression'
    ) return;
    if (n.start <= element.start && n.end >= element.end) {
      if (!inner || (n.end - n.start) < (inner.end - inner.start)) inner = n;
    }
  });
  if (!inner) return null;

  // named function declaration: function Foo() {}
  if (inner.id && inner.id.name) return inner.id.name;

  // arrow/function bound to a name: const Foo = () => {} / const Foo = function(){}
  let name = null;
  walk(ast, (n) => {
    if (
      n.type === 'VariableDeclarator' &&
      n.init && n.init.start === inner.start && n.init.end === inner.end &&
      n.id && n.id.type === 'Identifier'
    ) name = n.id.name;
  });
  return name; // null if the innermost fn is an anonymous callback (map, etc.)
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
 * Delete behavior:
 *  - Normal element (has siblings / non-sole child): remove it in place.
 *  - Sole return of a component: the element IS the component's whole output,
 *    so "delete this" means remove the component's rendered *usage*. If the
 *    component is used in exactly one place, remove that usage deterministically.
 *    Otherwise refuse with an actionable message (ambiguous → model lane).
 */
export function applyDeleteElement(root, loc, { dryRun = false } = {}) {
  const { abs, content, element, file } = loadTarget(root, loc);

  const inPlace = removeElementFromContent(content, element, file);
  if (inPlace !== null) {
    if (dryRun) return { abs, before: content, after: inPlace, wouldWrite: false };
    return writeChecked(abs, content, inPlace);
  }

  // Removing the element in place would break the file → it's the sole return.
  const ast = parseSource(content, file);
  const name = soleReturnComponentName(ast, element);
  if (!name || !/^[A-Z]/.test(name)) {
    // no resolvable component name (anonymous default, or a .map() list item)
    throw new Error(
      "can't delete this in place — it's the only thing rendered here (likely a list item or an unnamed component). Describe the change instead (e.g. \"remove this from the list\") and it'll route through the model."
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
