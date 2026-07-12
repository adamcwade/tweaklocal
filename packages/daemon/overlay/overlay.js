// TweakLocal overlay — injected into the app in dev. Vanilla JS, no deps.
(() => {
  if (window.__TWEAKLOCAL__) return;
  window.__TWEAKLOCAL__ = true;

  const script = [...document.scripts].find((s) => /\/overlay\.js/.test(s.src));
  const ORIGIN = window.TWEAKLOCAL_ORIGIN || (script ? new URL(script.src).origin : 'http://localhost:4100');

  const SPACE_SCALE = ['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '20', '24'];
  const FONT_FALLBACK = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl'];
  // px scales for the style-system-agnostic lane (inline style edits)
  const PX_SPACE = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96];
  const PX_FONT = [10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 88, 96];

  const css = `
  #twk-root{position:fixed;inset:0;pointer-events:none;z-index:2147483000;font-family:ui-sans-serif,system-ui,sans-serif}
  .twk-outline{position:fixed;border:1.5px solid #6366f1;border-radius:3px;background:rgba(99,102,241,.08);pointer-events:none;transition:all .04s linear}
  .twk-outline.twk-selected{border-color:#10b981;background:rgba(16,185,129,.06)}
  .twk-badge{position:fixed;background:#312e81;color:#e0e7ff;font-size:11px;padding:2px 7px;border-radius:4px;pointer-events:none;white-space:nowrap;transform:translateY(-100%)}
  .twk-pop-label{position:fixed;background:#10b981;color:#052e1b;font-size:13.8px;font-weight:700;padding:3px 10px;border-radius:8px 8px 0 0;pointer-events:none;white-space:nowrap;transform:translate(-50%,-100%);text-align:center}
  .twk-delete-btn{position:fixed;width:22px;height:22px;border-radius:50%;background:#dc2626;color:#fff;border:none;cursor:pointer;pointer-events:auto;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 6px rgba(0,0,0,.4)}
  .twk-delete-btn:hover{background:#ef4444}
  .twk-delete-btn svg{width:12px;height:12px;pointer-events:none}
  .twk-pop{position:fixed;background:#111827;color:#f9fafb;border:1.5px solid #10b981;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.35);padding:8px;pointer-events:auto;display:flex;flex-direction:column;gap:6px;min-width:300px;max-width:340px;font-size:12px}
  .twk-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .twk-pop button{background:#374151;color:#f9fafb;border:none;border-radius:6px;padding:4px 9px;font-size:12px;cursor:pointer}
  .twk-pop button:hover{background:#4b5563}
  .twk-pop button.twk-primary{background:#6366f1}
  .twk-pop input{flex:1;background:#1f2937;border:1px solid #374151;border-radius:6px;color:#f9fafb;padding:5px 8px;font-size:12px;outline:none}
  .twk-pop select{background:#1f2937;border:1px solid #374151;border-radius:6px;color:#f9fafb;padding:3px 4px;font-size:11.5px;outline:none}
  .twk-label{color:#9ca3af;min-width:50px}
  .twk-cur{color:#6ee7b7;font-size:11px;margin-left:auto}
  .twk-swatches{display:flex;gap:4px;flex-wrap:wrap;max-height:96px;overflow-y:auto;padding:2px}
  .twk-swatch{width:18px;height:18px;border-radius:4px;border:1px solid rgba(255,255,255,.25);cursor:pointer;padding:0}
  .twk-swatch:hover{transform:scale(1.15)}
  .twk-chip{font-size:10.5px !important;padding:2px 6px !important}
  .twk-tray{position:fixed;right:14px;bottom:14px;display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:auto}
  .twk-total{background:#064e3b;color:#a7f3d0;border-radius:8px;padding:6px 11px;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.3);white-space:nowrap;width:max-content;max-width:720px}
  .twk-total a{color:#6ee7b7;margin-left:10px;text-decoration:underline;cursor:pointer}
  .twk-total a:hover{color:#a7f3d0}
  .twk-tweak{background:#111827;color:#e5e7eb;border-radius:8px;padding:7px 11px;font-size:13px;display:flex;gap:8px;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,.3);white-space:nowrap;width:max-content;max-width:720px;overflow:hidden;text-overflow:ellipsis}
  .twk-dot{width:8px;height:8px;border-radius:50%;flex:none}
  .twk-dot.done{background:#10b981}.twk-dot.queued,.twk-dot.running{background:#f59e0b;animation:twk-pulse 1s infinite}.twk-dot.error{background:#ef4444}.twk-dot.reverted,.twk-dot.cancelled{background:#6b7280}
  .twk-tweak button{background:none;border:none;color:#818cf8;cursor:pointer;font-size:12.5px;padding:0}
  .twk-meta{color:#9ca3af}
  .twk-hint{position:fixed;left:14px;bottom:14px;background:#111827;color:#9ca3af;font-size:12.5px;padding:6px 11px;border-radius:6px;pointer-events:none}
  [contenteditable="plaintext-only"],[contenteditable="true"]{outline:2px dashed #10b981;outline-offset:2px}
  @keyframes twk-pulse{50%{opacity:.4}}`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'twk-root';
  document.body.appendChild(root);

  const state = {
    selectMode: false,
    hoverEl: null,
    selected: null, // { el, loc }
    editing: null, // { el, original }
    tailwind: true, // daemon reports whether the app uses Tailwind
  };

  // ---------- helpers ----------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const api = async (p, body) => {
    const r = await fetch(`${ORIGIN}/api/${p}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j && j.ok === false) throw new Error(j.error);
    return j;
  };
  const inOverlay = (t) => t instanceof Node && root.contains(t);
  const classList = (e) => (e.getAttribute('class') || '').split(/\s+/).filter(Boolean);
  // "components/sections/Hero.tsx:50:9" (or absolute path) -> "Hero.tsx:50"
  const shortLoc = (loc) => {
    const m = /^(.*):(\d+):(\d+)$/.exec(loc);
    if (!m) return loc;
    return `${m[1].split('/').pop()}:${m[2]}`;
  };

  function positionBox(box, target) {
    const r = target.getBoundingClientRect();
    Object.assign(box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    return r;
  }

  // ---------- design system (Tailwind v4 theme vars from the page's CSS) ----------
  let theme = null;
  function readTheme() {
    if (theme) return theme;
    const vars = {};
    const visit = (rules) => {
      for (const rule of rules) {
        if (rule.cssRules) { try { visit(rule.cssRules); } catch { /* cross-origin */ } }
        if (rule.style) {
          for (const prop of rule.style) {
            if (prop.startsWith('--')) vars[prop] = rule.style.getPropertyValue(prop).trim();
          }
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try { visit(sheet.cssRules); } catch { /* cross-origin */ }
    }
    const px = (v) => {
      const m = /^([\d.]+)(px|rem|em)?$/.exec(v);
      return m ? parseFloat(m[1]) * (m[2] === 'px' ? 1 : 16) : NaN;
    };
    // Design-system sizes first, merged with the canonical Tailwind scale so
    // stepping never dead-ends when the app only uses a few sizes.
    const CANON_PX = { 'text-xs': 12, 'text-sm': 14, 'text-base': 16, 'text-lg': 18, 'text-xl': 20, 'text-2xl': 24, 'text-3xl': 30, 'text-4xl': 36, 'text-5xl': 48, 'text-6xl': 60, 'text-7xl': 72 };
    const sizeMap = new Map(Object.entries(CANON_PX));
    for (const k of Object.keys(vars)) {
      if (!/^--text-[a-z0-9]+$/.test(k)) continue;
      const v = px(vars[k]);
      if (!isNaN(v)) sizeMap.set('text-' + k.slice(7), v);
    }
    const textSizes = [...sizeMap.entries()].sort((a, b) => a[1] - b[1]).map(([cls]) => cls);
    const colors = Object.keys(vars)
      .filter((k) => /^--color-[a-z0-9-]+$/.test(k))
      .map((k) => ({ name: k.slice(8), value: vars[k] }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    // Any CSS custom property whose value is a color — the app's design
    // tokens, whatever the styling system. Applied as var(--name) so the
    // source edit stays token-based.
    const varColors = Object.keys(vars)
      .filter((k) => vars[k] && CSS.supports('color', vars[k]))
      .map((k) => ({ name: k, value: vars[k], apply: `var(${k})` }));
    theme = { textSizes, colors, varColors, fromDS: colors.length > 0 };
    return theme;
  }

  // Fallback palette: the colors actually rendered on the page right now.
  function harvestPageColors() {
    const seen = new Map();
    const els = document.querySelectorAll('[data-twk]');
    for (const e of [...els].slice(0, 400)) {
      const cs = getComputedStyle(e);
      for (const v of [cs.color, cs.backgroundColor]) {
        if (!v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent') continue;
        seen.set(v, (seen.get(v) || 0) + 1);
      }
    }
    return [...seen.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([value]) => ({ name: value, value, apply: value }));
  }

  // ---------- hover ----------
  const hoverBox = el('div', 'twk-outline');
  const hoverBadge = el('div', 'twk-badge');
  hoverBox.style.display = hoverBadge.style.display = 'none';
  root.append(hoverBox, hoverBadge);

  function setHover(target) {
    state.hoverEl = target;
    if (!target || target === state.selected?.el) {
      hoverBox.style.display = hoverBadge.style.display = 'none';
      return;
    }
    hoverBox.style.display = hoverBadge.style.display = 'block';
    const r = positionBox(hoverBox, target);
    hoverBadge.textContent = `<${target.tagName.toLowerCase()}> ${shortLoc(target.getAttribute('data-twk'))}`;
    Object.assign(hoverBadge.style, { left: r.left + 'px', top: Math.max(r.top - 4, 16) + 'px' });
  }

  // ---------- selection ----------
  const selBox = el('div', 'twk-outline twk-selected');
  selBox.style.display = 'none';
  root.appendChild(selBox);
  const pop = el('div', 'twk-pop');
  pop.style.display = 'none';
  root.appendChild(pop);
  const popLabel = el('div', 'twk-pop-label');
  popLabel.style.display = 'none';
  root.appendChild(popLabel);
  const deleteBtn = el('button', 'twk-delete-btn');
  deleteBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>';
  deleteBtn.style.display = 'none';
  deleteBtn.title = 'Delete element';
  root.appendChild(deleteBtn);
  deleteBtn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = state.selected;
    if (!sel || !document.contains(sel.el)) return;
    // Check first so a refusal never flickers the element or loses the
    // selection — only hide optimistically once we know it'll succeed.
    deleteBtn.disabled = true;
    try {
      await api('delete', { loc: sel.loc, dryRun: true });
    } catch (err) {
      deleteBtn.disabled = false;
      addTweak({ id: 'x' + Date.now(), status: 'error', label: err.message.slice(0, 140) });
      return;
    }
    deleteBtn.disabled = false;
    sel.el.style.display = 'none'; // optimistic; HMR makes it real
    deselect();
    try {
      await api('delete', { loc: sel.loc });
    } catch (err) {
      sel.el.style.display = '';
      addTweak({ id: 'x' + Date.now(), status: 'error', label: `delete: ${err.message}` });
    }
  };

  function select(target) {
    finishTextEdit(false);
    const loc = target.getAttribute('data-twk');
    state.selected = { el: target, loc, meta: null };
    selBox.style.display = 'block';
    renderPopover();
    reposition();
    loadMeta();
  }

  // Source truth for the selection: the daemon's resolve tells us which text
  // literals the element really has in JSX — the DOM can't (animation libs
  // split text into spans, expressions render as text, etc).
  async function loadMeta() {
    const s = state.selected;
    if (!s) return;
    try {
      const meta = await api('resolve', { loc: s.loc });
      if (state.selected !== s) return; // selection changed meanwhile
      s.meta = meta;
      renderPopover();
      reposition();
    } catch { /* element not resolvable — leave popover as is */ }
  }

  function deselect() {
    finishTextEdit(false);
    state.selected = null;
    selBox.style.display = 'none';
    pop.style.display = 'none';
    popLabel.style.display = 'none';
    deleteBtn.style.display = 'none';
  }

  function reposition() {
    const s = state.selected;
    if (!s) return;
    if (!document.contains(s.el)) {
      // HMR replaced the node — re-acquire by stamp
      const again = document.querySelector(`[data-twk="${CSS.escape(s.loc)}"]`);
      if (!again) return deselect();
      s.el = again;
    }
    const r = positionBox(selBox, s.el);
    pop.style.display = 'flex';
    const labelH = 22; // room for the file:line tab above the panel
    const top = r.bottom + 8 + labelH + pop.offsetHeight > innerHeight ? r.top - pop.offsetHeight - 8 : r.bottom + 8 + labelH;
    const left = Math.min(Math.max(r.left, 8), innerWidth - 356);
    Object.assign(pop.style, { left: left + 'px', top: Math.max(top, 8 + labelH) + 'px' });
    popLabel.style.display = 'block';
    popLabel.textContent = shortLoc(s.loc);
    Object.assign(popLabel.style, { left: (left + pop.offsetWidth / 2) + 'px', top: pop.style.top });
    deleteBtn.style.display = 'flex';
    const inset = 4;
    Object.assign(deleteBtn.style, {
      left: r.right - 22 - inset + 'px',
      top: r.top + inset + 'px',
    });
  }

  // ---------- class tweaks ----------
  async function applyClassTweak(change, label) {
    if (!change || (!change.remove.length && !change.add.length)) return;
    const s = state.selected;
    change.remove.forEach((c) => s.el.classList.remove(c)); // optimistic
    change.add.forEach((c) => s.el.classList.add(c));
    reposition();
    try {
      await api('edit-class', { loc: s.loc, remove: change.remove, add: change.add });
    } catch (e) {
      addTweak({ id: 'x' + Date.now(), status: 'error', label: `${label}: ${e.message}` });
    }
    setTimeout(() => { reposition(); renderPopover(); }, 350); // after HMR
  }

  // ---------- popover ----------
  function hasEditableText(target) {
    return target.children.length === 0 && target.textContent.trim().length > 0;
  }

  // Step a spacing class (p/m with optional side) along the Tailwind scale.
  function spacingStep(target, base, side, dir) {
    const prefix = base + side; // e.g. p, pt, m, ml
    const re = new RegExp(`^${prefix}-(\\d+(?:\\.\\d+)?)$`);
    const classes = classList(target);
    const cur = classes.find((c) => re.test(c));
    let from = cur ? re.exec(cur)[1] : null;
    if (from == null && side) {
      // side not set: start from the shorthand (pt-6 wins over p-4 in Tailwind ordering)
      const allRe = new RegExp(`^${base}-(\\d+(?:\\.\\d+)?)$`);
      const all = classes.find((c) => allRe.test(c));
      from = all ? allRe.exec(all)[1] : '0';
    }
    if (from == null) from = '0';
    let idx = SPACE_SCALE.indexOf(from);
    if (idx < 0) idx = 0;
    const next = Math.min(Math.max(idx + dir, 0), SPACE_SCALE.length - 1);
    if (SPACE_SCALE[next] === from && cur) return null;
    return { remove: cur ? [cur] : [], add: [`${prefix}-${SPACE_SCALE[next]}`] };
  }

  function fontStep(target, dir) {
    const scale = readTheme().textSizes;
    const classes = classList(target);
    const cur = classes.find((c) => scale.includes(c));
    let idx = cur ? scale.indexOf(cur) : scale.indexOf('text-base');
    if (idx < 0) idx = Math.floor(scale.length / 2);
    const next = Math.min(Math.max(idx + dir, 0), scale.length - 1);
    if (scale[next] === cur) return null;
    return { remove: cur ? [cur] : [], add: [scale[next]] };
  }

  // Property editor: which classes to strip when setting each property.
  const colorClassRe = (prefix) =>
    new RegExp(`^${prefix}-(?:[a-z]+-\\d+(?:/\\d+)?|white|black|transparent|current|inherit)$`);
  const PROPS = {
    Background: { type: 'color', prefix: 'bg' },
    'Text color': { type: 'color', prefix: 'text' },
    'Border color': { type: 'color', prefix: 'border', ensure: 'border' },
    Radius: { type: 'list', removeRe: /^rounded(-(none|sm|md|lg|xl|2xl|3xl|full))?$/, options: ['rounded-none', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'] },
    Shadow: { type: 'list', removeRe: /^shadow(-(none|sm|md|lg|xl|2xl))?$/, options: ['shadow-none', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'] },
  };

  function propChange(target, propName, valueClass) {
    const p = PROPS[propName];
    const classes = classList(target);
    const re = p.type === 'color' ? colorClassRe(p.prefix) : p.removeRe;
    const remove = classes.filter((c) => re.test(c) && c !== valueClass);
    const add = classes.includes(valueClass) ? [] : [valueClass];
    if (p.ensure && !classes.some((c) => /^border(-\d+)?$/.test(c))) add.push(p.ensure);
    return { remove, add };
  }

  // ---------- inline-style lane (no Tailwind required) ----------
  async function applyStyleTweak(styles, optimistic, label) {
    const s = state.selected;
    optimistic?.();
    reposition();
    try {
      await api('edit-style', { loc: s.loc, styles });
    } catch (e) {
      addTweak({ id: 'x' + Date.now(), status: 'error', label: `${label}: ${e.message}` });
    }
    setTimeout(() => { reposition(); renderPopover(); }, 350);
  }

  function pxStep(current, scale, dir) {
    let idx = scale.findIndex((v) => v >= Math.round(current));
    if (idx < 0) idx = scale.length - 1;
    return scale[Math.min(Math.max(idx + dir, 0), scale.length - 1)];
  }

  function spacingRowPx(label, cssBase) {
    const s = state.selected;
    const row = el('div', 'twk-row');
    row.append(el('span', 'twk-label', label));
    const sideSel = el('select');
    for (const [name, v] of [['All', ''], ['Top', 'Top'], ['Right', 'Right'], ['Bottom', 'Bottom'], ['Left', 'Left']]) {
      const o = el('option', null, name);
      o.value = v;
      sideSel.appendChild(o);
    }
    const cur = el('span', 'twk-cur');
    const show = () => {
      const prop = cssBase + (sideSel.value || 'Top');
      cur.textContent = Math.round(parseFloat(getComputedStyle(s.el)[prop]) || 0) + 'px';
    };
    show();
    sideSel.onchange = show;
    const bump = (dir) => {
      const side = sideSel.value;
      const readProp = cssBase + (side || 'Top');
      const writeProp = side ? cssBase + side : cssBase;
      const current = parseFloat(getComputedStyle(s.el)[readProp]) || 0;
      const next = pxStep(current, PX_SPACE, dir);
      if (next === Math.round(current)) return;
      applyStyleTweak(
        { [writeProp]: next + 'px' },
        () => { s.el.style[writeProp] = next + 'px'; show(); },
        label
      );
    };
    const minus = el('button', null, '−');
    const plus = el('button', null, '+');
    minus.onclick = () => bump(-1);
    plus.onclick = () => bump(+1);
    row.append(sideSel, minus, plus, cur);
    return row;
  }

  function fontRowPx() {
    const s = state.selected;
    const row = el('div', 'twk-row');
    row.append(el('span', 'twk-label', 'Font'));
    const cur = el('span', 'twk-cur', Math.round(parseFloat(getComputedStyle(s.el).fontSize)) + 'px');
    const bump = (dir) => {
      const current = parseFloat(getComputedStyle(s.el).fontSize) || 16;
      const next = pxStep(current, PX_FONT, dir);
      if (next === Math.round(current)) return;
      applyStyleTweak(
        { fontSize: next + 'px' },
        () => { s.el.style.fontSize = next + 'px'; cur.textContent = next + 'px'; },
        'font'
      );
    };
    const minus = el('button', null, 'A−');
    const plus = el('button', null, 'A+');
    minus.onclick = () => bump(-1);
    plus.onclick = () => bump(+1);
    row.append(minus, plus, cur);
    return row;
  }

  const STYLE_PROPS = {
    Background: { css: 'backgroundColor', type: 'color' },
    'Text color': { css: 'color', type: 'color' },
    'Border color': { css: 'borderColor', type: 'color', ensureBorder: true },
    Radius: { css: 'borderRadius', type: 'list', options: ['0px', '2px', '4px', '6px', '8px', '12px', '16px', '24px', '9999px'] },
    Shadow: { css: 'boxShadow', type: 'list', options: ['none', '0 1px 2px rgba(0,0,0,.08)', '0 2px 8px rgba(0,0,0,.12)', '0 4px 16px rgba(0,0,0,.16)', '0 8px 30px rgba(0,0,0,.2)'], labels: ['none', 'sm', 'md', 'lg', 'xl'] },
  };

  function applyStyleProp(propName, applyValue) {
    const s = state.selected;
    const p = STYLE_PROPS[propName];
    const styles = { [p.css]: applyValue };
    if (p.ensureBorder && !parseFloat(getComputedStyle(s.el).borderTopWidth)) {
      styles.borderWidth = '1px';
      styles.borderStyle = 'solid';
    }
    applyStyleTweak(
      styles,
      () => { for (const [k, v] of Object.entries(styles)) s.el.style[k] = v; },
      propName
    );
  }

  function spacingRow(label, base) {
    const s = state.selected;
    const row = el('div', 'twk-row');
    row.append(el('span', 'twk-label', label));
    const sideSel = el('select');
    for (const [name, v] of [['All', ''], ['Top', 't'], ['Right', 'r'], ['Bottom', 'b'], ['Left', 'l']]) {
      const o = el('option', null, name);
      o.value = v;
      sideSel.appendChild(o);
    }
    const minus = el('button', null, '−');
    const plus = el('button', null, '+');
    minus.onclick = () => applyClassTweak(spacingStep(s.el, base, sideSel.value, -1), label);
    plus.onclick = () => applyClassTweak(spacingStep(s.el, base, sideSel.value, +1), label);
    row.append(sideSel, minus, plus);
    const cur = classList(s.el).filter((c) => new RegExp(`^${base}[trbl]?-`).test(c)).join(' ');
    if (cur) row.append(el('span', 'twk-cur', cur));
    return row;
  }

  function renderPopover() {
    const s = state.selected;
    if (!s) return;
    pop.textContent = '';

    // location now lives in the green tab above the panel (popLabel)

    // Copy lane, driven by the SOURCE text literals (s.meta.texts), not the
    // DOM: animation libs split text into spans and expressions render as
    // text, so DOM shape says nothing about what's editable in the JSX.
    const literals = s.meta ? s.meta.texts : null;
    if (literals && literals.length) {
      // In-place editing only when the single literal IS the element's whole
      // text (animation-split DOM still qualifies — same text, different
      // nodes). Partial literals (mixed with {expressions}) get input fields
      // showing exactly the editable part.
      const wholeText =
        literals.length === 1 && literals[0].value.trim() === s.el.textContent.trim();
      if (wholeText) {
        const row = el('div', 'twk-row');
        row.append(el('span', 'twk-label', 'Copy'));
        const b = el('button', null, '✎ Edit text in place');
        b.onclick = () => startTextEdit();
        row.appendChild(b);
        pop.appendChild(row);
      } else {
        // DOM is transformed (or several literals) → edit the source text here
        for (const t of literals) {
          const row = el('div', 'twk-row');
          row.append(el('span', 'twk-label', 'Copy'));
          const input = el('input');
          input.value = t.value;
          const save = el('button', null, '✓');
          const commit = async () => {
            const newText = input.value.trim();
            if (!newText || newText === t.value) return;
            try {
              await api('edit-text', { loc: s.loc, oldText: t.value, newText });
              setTimeout(() => { reposition(); loadMeta(); }, 350);
            } catch (e) {
              addTweak({ id: 'x' + Date.now(), status: 'error', label: `copy: ${e.message}` });
            }
          };
          save.onclick = commit;
          input.onkeydown = (e) => { if (e.key === 'Enter') commit(); e.stopPropagation(); };
          row.append(input, save);
          pop.appendChild(row);
        }
      }
    }

    // Deterministic style controls. Tailwind apps get class edits; everything
    // else gets inline-style edits — same zero-token lane, any styling system.
    const tw = state.tailwind;

    if (tw) {
      pop.appendChild(spacingRow('Padding', 'p'));
      pop.appendChild(spacingRow('Margin', 'm'));
      const fontRow = el('div', 'twk-row');
      fontRow.append(el('span', 'twk-label', 'Font'));
      const fMinus = el('button', null, 'A−');
      const fPlus = el('button', null, 'A+');
      fMinus.onclick = () => applyClassTweak(fontStep(s.el, -1), 'font');
      fPlus.onclick = () => applyClassTweak(fontStep(s.el, +1), 'font');
      fontRow.append(fMinus, fPlus);
      const curFont = classList(s.el).find((c) => readTheme().textSizes.includes(c));
      fontRow.append(el('span', 'twk-cur', curFont || 'inherited'));
      pop.appendChild(fontRow);
    } else {
      pop.appendChild(spacingRowPx('Padding', 'padding'));
      pop.appendChild(spacingRowPx('Margin', 'margin'));
      pop.appendChild(fontRowPx());
    }

    // property editor
    const propRow = el('div', 'twk-row');
    propRow.append(el('span', 'twk-label', 'Style'));
    const propSel = el('select');
    propSel.appendChild(el('option', null, 'Choose property…'));
    for (const name of Object.keys(tw ? PROPS : STYLE_PROPS)) {
      const o = el('option', null, name);
      o.value = name;
      propSel.appendChild(o);
    }
    propRow.appendChild(propSel);
    pop.appendChild(propRow);
    const swatches = el('div', 'twk-swatches');
    pop.appendChild(swatches);
    propSel.onchange = () => {
      swatches.textContent = '';
      const p = (tw ? PROPS : STYLE_PROPS)[propSel.value];
      if (!p) return;
      if (p.type === 'color') {
        if (tw) {
          const { colors, fromDS } = readTheme();
          if (!fromDS) {
            swatches.append(el('span', 'twk-meta', 'no design-system colors found in page CSS'));
            return;
          }
          for (const c of colors) {
            const b = el('button', 'twk-swatch');
            b.style.background = c.value;
            b.title = `${p.prefix}-${c.name}`;
            b.onclick = () => applyClassTweak(propChange(s.el, propSel.value, `${p.prefix}-${c.name}`), propSel.value);
            swatches.appendChild(b);
          }
        } else {
          // design tokens if the app defines color custom properties,
          // otherwise the palette actually rendered on the page
          const { varColors } = readTheme();
          const palette = varColors.length ? varColors.slice(0, 48) : harvestPageColors();
          for (const c of palette) {
            const b = el('button', 'twk-swatch');
            b.style.background = c.value;
            b.title = c.name;
            b.onclick = () => applyStyleProp(propSel.value, c.apply);
            swatches.appendChild(b);
          }
        }
      } else {
        p.options.forEach((opt, i) => {
          const b = el('button', 'twk-chip', p.labels ? p.labels[i] : opt);
          b.onclick = () =>
            tw
              ? applyClassTweak(propChange(s.el, propSel.value, opt), propSel.value)
              : applyStyleProp(propSel.value, opt);
          swatches.appendChild(b);
        });
      }
      reposition();
    };

    const nlRow = el('div', 'twk-row');
    const input = el('input');
    input.placeholder = 'Describe a change… (routed to the right model)';
    const go = el('button', 'twk-primary', 'Go');
    const send = async () => {
      const instruction = input.value.trim();
      if (!instruction) return;
      input.value = '';
      try {
        const r = await api('nl', { loc: s.loc, instruction });
        addTweak({ id: r.id, status: 'queued', model: r.model, label: instruction.slice(0, 60) });
      } catch (e) {
        addTweak({ id: 'x' + Date.now(), status: 'error', label: e.message });
      }
    };
    go.onclick = send;
    input.onkeydown = (e) => { if (e.key === 'Enter') send(); e.stopPropagation(); };
    nlRow.append(input, go);
    pop.appendChild(nlRow);
    // delete lives as a floating icon on the element itself (deleteBtn)
  }

  // ---------- inline copy editing ----------
  // Works on ANY element whose source has one text literal — titles,
  // descriptions, buttons, links — even when animations have split the DOM
  // into spans: we swap in the source text for editing and keep the original
  // DOM aside so Esc restores it untouched.
  function startTextEdit() {
    const s = state.selected;
    // the popover can outlive its selection (HMR, reloads) — never throw
    const literal = s?.meta?.texts?.[0]?.value;
    if (literal == null || !document.contains(s.el)) return;
    const frag = document.createDocumentFragment();
    while (s.el.firstChild) frag.appendChild(s.el.firstChild);
    state.editing = {
      el: s.el,
      loc: s.loc,
      literal,
      frag,
      prevUserSelect: s.el.style.userSelect,
    };
    s.el.textContent = literal;
    s.el.style.userSelect = 'text'; // buttons often have user-select: none
    try { s.el.contentEditable = 'plaintext-only'; } catch { s.el.contentEditable = 'true'; }
    s.el.focus();
    document.getSelection()?.selectAllChildren(s.el);
    hint.textContent = 'editing copy — Enter saves · Esc cancels · click away saves';
  }

  async function finishTextEdit(commit) {
    const ed = state.editing;
    if (!ed) return;
    state.editing = null;
    ed.el.removeAttribute('contenteditable');
    ed.el.style.userSelect = ed.prevUserSelect;
    if (state.selectMode) hint.textContent = 'select mode — click an element · Esc to exit';
    const newText = ed.el.textContent.trim();
    const restore = () => {
      ed.el.textContent = '';
      ed.el.appendChild(ed.frag);
    };
    if (!commit || !newText || newText === ed.literal.trim()) {
      restore();
      return;
    }
    try {
      await api('edit-text', { loc: ed.loc, oldText: ed.literal, newText });
      // keep the new text; HMR re-renders the component (animations included)
    } catch (e) {
      restore();
      addTweak({ id: 'x' + Date.now(), status: 'error', label: `copy: ${e.message}` });
    }
    setTimeout(() => { reposition(); loadMeta(); }, 350);
  }

  // ---------- tray ----------
  const tray = el('div', 'twk-tray');
  root.appendChild(tray);
  const totalBar = el('div', 'twk-total');
  totalBar.style.display = 'none';
  const totalText = el('span');
  const reportLink = el('a', null, 'monthly report →');
  reportLink.href = 'https://tweaklocal.dev/report';
  reportLink.target = '_blank';
  reportLink.rel = 'noopener';
  totalBar.append(totalText, reportLink);
  tray.appendChild(totalBar);
  const tweaks = new Map();

  function showTotals(t) {
    if (!t || !t.count) return;
    totalBar.style.display = '';
    totalText.textContent = `≈ saved $${t.usd.toFixed(2)} · ${Math.round(t.ms / 1000)}s across ${t.count} tweak${t.count === 1 ? '' : 's'} (vs unscoped agent)`;
  }

  function addTweak(t) {
    let row = tweaks.get(String(t.id));
    if (!row) {
      row = el('div', 'twk-tweak');
      row._dot = el('span', 'twk-dot');
      row._label = el('span', null, '');
      row._meta = el('span', 'twk-meta', '');
      row._cancel = el('button', null, 'cancel');
      row._cancel.style.display = 'none';
      row._cancel.onclick = async () => {
        try {
          await api('cancel', { id: t.id });
        } catch (e) { row._meta.textContent = e.message; }
      };
      row._undo = el('button', null, 'undo');
      row._undo.style.display = 'none';
      row._undo.onclick = async () => {
        try {
          await api('undo', { id: t.id });
          setTimeout(reposition, 350);
        } catch (e) { row._meta.textContent = e.message; }
      };
      row.append(row._dot, row._label, row._meta, row._cancel, row._undo);
      tray.insertBefore(row, totalBar.nextSibling);
      tweaks.set(String(t.id), row);
      while (tray.children.length > 7) tray.lastChild.remove();
    }
    if (t.label) row._label.textContent = t.label;
    if (t.status) {
      row._dot.className = 'twk-dot ' + t.status;
      const inFlight = t.status === 'queued' || t.status === 'running';
      row._cancel.style.display = inFlight ? '' : 'none';
      row._undo.style.display = t.status === 'done' && !String(t.id).startsWith('x') ? '' : 'none';
    }
    const bits = [];
    if (t.model) bits.push(t.model);
    if (t.tokens === 0) bits.push('0 tokens');
    if (t.durationMs) bits.push((t.durationMs / 1000).toFixed(1) + 's');
    if (t.costUSD != null) bits.push('$' + t.costUSD.toFixed(3));
    if (t.saved) bits.push(`saved ~$${t.saved.usd.toFixed(2)}`);
    if (t.error) bits.push(t.error.slice(0, 80));
    if (bits.length) row._meta.textContent = bits.join(' · ');
    if (t.totals) showTotals(t.totals);
  }

  try {
    const es = new EventSource(`${ORIGIN}/api/events`);
    es.onmessage = (m) => {
      const e = JSON.parse(m.data);
      if (e.type === 'tweak') addTweak(e);
      if (e.type === 'totals') showTotals(e.totals);
    };
  } catch { /* daemon offline */ }
  fetch(`${ORIGIN}/api/health`)
    .then((r) => r.json())
    .then((h) => {
      showTotals(h.totals);
      if (h.tailwind === false) state.tailwind = false;
    })
    .catch(() => {});

  // ---------- mode + events ----------
  const hint = el('div', 'twk-hint', '⌘. select mode');
  root.appendChild(hint);

  function setMode(on) {
    state.selectMode = on;
    hint.textContent = on ? 'select mode — click an element · Esc to exit' : '⌘. select mode';
    if (!on) { setHover(null); deselect(); }
  }

  addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === '.') {
      e.preventDefault();
      setMode(!state.selectMode);
      return;
    }
    if (!state.selectMode) return;
    if (e.key === 'Escape') {
      if (state.editing) return finishTextEdit(false);
      if (state.selected) return deselect();
      return setMode(false);
    }
    if (e.key === 'Enter' && state.editing) {
      e.preventDefault();
      finishTextEdit(true);
    }
  }, true);

  addEventListener('mousemove', (e) => {
    if (!state.selectMode || state.editing) return;
    if (inOverlay(e.target)) return setHover(null);
    setHover(e.target instanceof Element ? e.target.closest('[data-twk]') : null);
  }, true);

  addEventListener('click', (e) => {
    if (!state.selectMode) return;
    if (inOverlay(e.target)) return;
    if (state.editing) {
      // clicks inside the editable text place the caret; clicks anywhere
      // else save the edit (and never navigate/select mid-edit)
      if (!state.editing.el.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        finishTextEdit(true);
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const target = e.target instanceof Element ? e.target.closest('[data-twk]') : null;
    if (target) select(target);
    else deselect();
  }, true);

  addEventListener('scroll', () => { reposition(); setHover(state.hoverEl); }, true);
  addEventListener('resize', () => reposition());
})();
