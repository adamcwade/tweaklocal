// CmdZero overlay — injected into the app in dev. Vanilla JS, no deps.
(() => {
  if (window.__CMDZERO__) return;
  window.__CMDZERO__ = true;

  const script = [...document.scripts].find((s) => /\/overlay\.js/.test(s.src));
  const ORIGIN = window.CMDZERO_ORIGIN || (script ? new URL(script.src).origin : 'http://localhost:4100');

  const SPACE_SCALE = ['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '20', '24'];
  const FONT_FALLBACK = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl'];
  // px scales for the style-system-agnostic lane (inline style edits)
  const PX_SPACE = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96];
  const PX_FONT = [10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 88, 96];

  const css = `
  #cz-root{position:fixed;inset:0;pointer-events:none;z-index:2147483000;font-family:ui-sans-serif,system-ui,sans-serif}
  .cz-outline{position:fixed;border:1.5px solid #6366f1;border-radius:3px;background:rgba(99,102,241,.08);pointer-events:none;transition:all .04s linear}
  .cz-outline.cz-selected{border-color:#10b981;background:rgba(16,185,129,.06)}
  .cz-multi{position:fixed;border:1.5px solid #f59e0b;border-radius:3px;background:rgba(245,158,11,.10);pointer-events:none}
  .cz-multibar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);background:#111827;color:#f9fafb;border:1.5px solid #f59e0b;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.4);padding:8px;pointer-events:auto;display:flex;gap:6px;align-items:center;font-size:12px;z-index:2147483001}
  .cz-multibar input{background:#1f2937;border:1px solid #374151;border-radius:6px;color:#f9fafb;padding:5px 8px;font-size:12px;outline:none;width:220px}
  .cz-multibar button{background:#374151;color:#f9fafb;border:none;border-radius:6px;padding:4px 9px;font-size:12px;cursor:pointer}
  .cz-multibar button.cz-danger{background:#dc2626}
  .cz-multibar .cz-count{color:#fbbf24;font-weight:700}
  .cz-badge{position:fixed;background:#312e81;color:#e0e7ff;font-size:11px;padding:2px 7px;border-radius:4px;pointer-events:none;white-space:nowrap;transform:translateY(-100%)}
  .cz-pop-label{position:fixed;background:#10b981;color:#052e1b;font-size:13.8px;font-weight:700;padding:3px 10px;border-radius:8px 8px 0 0;pointer-events:none;white-space:nowrap;transform:translate(-50%,-100%);text-align:center}
  .cz-delete-btn{position:fixed;width:22px;height:22px;border-radius:50%;background:#dc2626;color:#fff;border:none;cursor:pointer;pointer-events:auto;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 6px rgba(0,0,0,.4)}
  .cz-movebar{position:fixed;display:flex;gap:2px;align-items:center;background:#111827;border:1px solid #6366f1;border-radius:7px;padding:2px;pointer-events:auto;box-shadow:0 2px 8px rgba(0,0,0,.45)}
  .cz-movebar button{width:20px;height:20px;display:flex;align-items:center;justify-content:center;background:#374151;color:#e5e7eb;border:none;border-radius:4px;cursor:pointer;padding:0;font-size:12px;line-height:1}
  .cz-movebar button:hover{background:#6366f1}
  .cz-grip{cursor:grab;color:#9ca3af;font-size:13px;padding:0 3px;user-select:none}
  .cz-grip:active{cursor:grabbing}
  .cz-drop{position:fixed;background:#6366f1;border-radius:2px;pointer-events:none;z-index:2147483400;box-shadow:0 0 6px rgba(99,102,241,.8)}
  .cz-dragghost{position:fixed;pointer-events:none;z-index:2147483350;opacity:.5;outline:2px dashed #6366f1;border-radius:4px;background:rgba(99,102,241,.12)}
  .cz-delete-btn:hover{background:#ef4444}
  .cz-delete-btn svg{width:12px;height:12px;pointer-events:none}
  .cz-pop{position:fixed;background:#111827;color:#f9fafb;border:1.5px solid #10b981;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.35);padding:8px;pointer-events:auto;display:flex;flex-direction:column;gap:6px;min-width:340px;max-width:400px;font-size:12px}
  .cz-pop textarea{flex:1;width:100%;min-height:66px;resize:vertical;background:#1f2937;border:1px solid #374151;border-radius:6px;color:#f9fafb;padding:7px 9px;font-size:12.5px;line-height:1.45;outline:none;font-family:inherit}
  .cz-pop textarea:focus{border-color:#6366f1}
  .cz-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .cz-pop button{background:#374151;color:#f9fafb;border:none;border-radius:6px;padding:4px 9px;font-size:12px;cursor:pointer}
  .cz-pop button:hover{background:#4b5563}
  .cz-pop button.cz-primary{background:#6366f1}
  .cz-pop input{flex:1;background:#1f2937;border:1px solid #374151;border-radius:6px;color:#f9fafb;padding:5px 8px;font-size:12px;outline:none}
  .cz-pop select{background:#1f2937;border:1px solid #374151;border-radius:6px;color:#f9fafb;padding:3px 4px;font-size:11.5px;outline:none}
  .cz-panel{position:fixed;left:0;top:30px;bottom:0;width:264px;box-sizing:border-box;overflow-y:auto;background:#0f1523;color:#f9fafb;border-right:1.5px solid #10b981;box-shadow:8px 0 30px rgba(0,0,0,.4);padding:12px 12px 28px;pointer-events:auto;display:flex;flex-direction:column;gap:6px;font-size:12px;z-index:2147483100;transform:translateX(0);transition:transform .26s cubic-bezier(.4,0,.2,1)}
  .cz-panel.cz-collapsed{transform:translateX(-100%)}
  .cz-phead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:7px;border-bottom:1px solid #1f2937}
  .cz-min{background:#1f2937;color:#cbd5e1;border:none;border-radius:6px;padding:2px 9px;font-size:14px;line-height:1;cursor:pointer}
  .cz-min:hover{background:#374151;color:#fff}
  .cz-ptab{position:fixed;left:0;top:calc(50% + 15px);transform:translateY(-50%);z-index:2147483110;display:none;align-items:center;gap:5px;background:#10b981;color:#052e1b;border:none;border-radius:0 9px 9px 0;padding:13px 6px;cursor:pointer;pointer-events:auto;writing-mode:vertical-rl;font-size:11px;font-weight:700;letter-spacing:.05em;box-shadow:2px 0 10px rgba(0,0,0,.35)}
  .cz-ptab.cz-show{display:flex}
  .cz-ptab:hover{background:#34d399}
  .cz-panel .cz-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .cz-panel button{background:#374151;color:#f9fafb;border:none;border-radius:6px;padding:4px 9px;font-size:12px;cursor:pointer}
  .cz-panel button:hover{background:#4b5563}
  .cz-panel select{background:#1f2937;border:1px solid #374151;border-radius:6px;color:#f9fafb;padding:3px 4px;font-size:11.5px;outline:none}
  .cz-ptitle{font-family:ui-monospace,monospace;font-size:11px;color:#6ee7b7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cz-sec{color:#94a3b8;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin:5px 0 1px}
  .cz-label{color:#9ca3af;min-width:50px}
  .cz-note{color:#fbbf24;font-size:11px;line-height:1.35;background:rgba(245,158,11,.1);border-radius:6px;padding:4px 7px}
  .cz-note.cz-info{color:#93c5fd;background:rgba(59,130,246,.12)}
  .cz-cur{color:#6ee7b7;font-size:11px;margin-left:auto}
  .cz-swatches{display:flex;gap:4px;flex-wrap:wrap;max-height:96px;overflow-y:auto;padding:2px}
  .cz-swatch{width:18px;height:18px;border-radius:4px;border:1px solid rgba(255,255,255,.25);cursor:pointer;padding:0}
  .cz-swatch:hover{transform:scale(1.15)}
  .cz-chip{font-size:10.5px !important;padding:2px 6px !important}
  .cz-tray{position:fixed;right:14px;bottom:14px;display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:auto}
  /* Compressed by default (just a dot + short label); hovering the tray expands
     every alert to full detail with undo/cancel. */
  .cz-tweak{transition:padding .12s ease}
  .cz-tray:not(:hover) .cz-tweak{padding:4px 10px;font-size:12px}
  .cz-tray:not(:hover) .cz-tweak .cz-meta,
  .cz-tray:not(:hover) .cz-tweak button{display:none}
  .cz-tray:not(:hover) .cz-tlabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px;display:inline-block;vertical-align:bottom}
  .cz-banner{position:fixed;top:0;left:0;right:0;height:30px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:0 14px;background:rgba(9,13,20,.94);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid #1f2937;color:#cbd5e1;font-size:12px;line-height:1;pointer-events:auto;z-index:2147483200;box-sizing:border-box}
  .cz-banner .cz-brand{display:flex;align-items:center;gap:6px;font-weight:600;color:#e2e8f0;flex:none}
  .cz-banner .cz-brand kbd{background:#10b981;color:#052e1b;border-radius:5px;padding:2px 6px;font-size:10.5px;font-family:ui-monospace,monospace;font-weight:700}
  .cz-banner .cz-stats{display:flex;gap:18px;align-items:center;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;flex:1;justify-content:center}
  .cz-banner .cz-stat span{color:#64748b}
  .cz-banner .cz-stat b{color:#f1f5f9;font-weight:600;margin-left:5px}
  .cz-banner .cz-stat.cz-accent b{color:#6ee7b7}
  .cz-banner a{color:#6ee7b7;text-decoration:none;flex:none}
  .cz-banner a:hover{text-decoration:underline}
  .cz-banner .cz-idle{color:#64748b}
  .cz-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
  .cz-wrap.cz-expanded{max-height:calc(100vh - 90px);overflow-y:auto;overflow-x:hidden;padding:2px}
  .cz-wrap:not(.cz-expanded) > .cz-tweak:nth-last-child(n+4){display:none}
  .cz-fade{height:14px;width:160px;background:linear-gradient(to top,rgba(17,24,39,0),rgba(17,24,39,.5));pointer-events:none;margin-bottom:-8px}
  .cz-history{background:#0b1220;color:#93c5fd;border:1px solid #263041;border-radius:8px;padding:4px 10px;font-size:11.5px;cursor:pointer;pointer-events:auto;box-shadow:0 4px 14px rgba(0,0,0,.3)}
  .cz-history:hover{border-color:#6366f1}
  .cz-tweak{background:#111827;color:#e5e7eb;border-radius:8px;padding:7px 11px;font-size:13px;display:flex;gap:8px;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,.3);white-space:nowrap;width:max-content;max-width:720px;overflow:hidden;text-overflow:ellipsis}
  .cz-dot{width:8px;height:8px;border-radius:50%;flex:none}
  .cz-dot.done{background:#10b981}.cz-dot.queued,.cz-dot.running{background:#f59e0b;animation:cz-pulse 1s infinite}.cz-dot.error{background:#ef4444}.cz-dot.reverted,.cz-dot.cancelled{background:#6b7280}
  .cz-tweak button{background:none;border:none;color:#818cf8;cursor:pointer;font-size:12.5px;padding:0}
  .cz-meta{color:#9ca3af}
  .cz-hint{position:fixed;left:14px;bottom:14px;background:#111827;color:#9ca3af;font-size:12.5px;padding:6px 11px;border-radius:6px;pointer-events:none}
  .cz-reload-toggle{position:fixed;left:14px;bottom:46px;background:#111827;color:#6ee7b7;border:1px solid #10b981;font-size:11.5px;padding:4px 9px;border-radius:6px;cursor:pointer;pointer-events:auto}
  .cz-reload-toggle.off{color:#9ca3af;border-color:#374151}
  [contenteditable="plaintext-only"],[contenteditable="true"]{outline:2px dashed #10b981;outline-offset:2px}
  @keyframes cz-pulse{50%{opacity:.4}}`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'cz-root';
  document.body.appendChild(root);

  const state = {
    selectMode: false,
    hoverEl: null,
    selected: null, // { el, loc }
    editing: null, // { el, original }
    tailwind: true, // daemon reports whether the app uses Tailwind
    model: 'auto', // NL model override; 'auto' = router picks
    multi: [], // [{ el, loc }] shift-click multi-selection
    autoReload: true, // seamlessly reload after a write so changes always show live
    panelCollapsed: false, // left style panel minimized to a tab
  };
  try { state.autoReload = localStorage.getItem('cz-autoreload') !== '0'; } catch { /* no storage */ }
  try { state.panelCollapsed = localStorage.getItem('cz-panel-collapsed') === '1'; } catch { /* no storage */ }

  // Stack of undoable tweak ids (LIFO) for ⌘Z / Ctrl-Z global undo.
  const undoStack = [];

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
    const els = document.querySelectorAll('[data-cz]');
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
  const hoverBox = el('div', 'cz-outline');
  const hoverBadge = el('div', 'cz-badge');
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
    hoverBadge.textContent = `<${target.tagName.toLowerCase()}> ${shortLoc(target.getAttribute('data-cz'))}`;
    Object.assign(hoverBadge.style, { left: r.left + 'px', top: Math.max(r.top - 4, 16) + 'px' });
  }

  // ---------- selection ----------
  const selBox = el('div', 'cz-outline cz-selected');
  selBox.style.display = 'none';
  root.appendChild(selBox);
  const pop = el('div', 'cz-pop');
  pop.style.display = 'none';
  root.appendChild(pop);
  // Left-side style inspector — a full-height dock that slides in from the left
  // and pushes the page over (no overlap). Minimizable to a left-edge tab.
  const PANEL_W = 264;
  const panel = el('div', 'cz-panel cz-collapsed');
  root.appendChild(panel);
  const panelTab = el('button', 'cz-ptab');
  panelTab.innerHTML = '<span>▸</span><span>STYLE</span>';
  panelTab.title = 'Show style panel';
  panelTab.onclick = () => setPanelCollapsed(false);
  root.appendChild(panelTab);
  try { document.body.style.transition = 'margin-left .26s cubic-bezier(.4,0,.2,1)'; } catch { /* ignore */ }

  function setPanelCollapsed(v) {
    state.panelCollapsed = v;
    try { localStorage.setItem('cz-panel-collapsed', v ? '1' : '0'); } catch { /* no storage */ }
    applyPanelLayout();
  }
  // Slide the panel in/out and push the page so nothing is covered.
  function applyPanelLayout() {
    const open = !!state.selected && !state.panelCollapsed;
    panel.classList.toggle('cz-collapsed', !open);
    panelTab.classList.toggle('cz-show', !!state.selected && state.panelCollapsed);
    try { document.body.style.marginLeft = open ? PANEL_W + 'px' : '0px'; } catch { /* ignore */ }
  }

  const popLabel = el('div', 'cz-pop-label');
  popLabel.style.display = 'none';
  root.appendChild(popLabel);
  const deleteBtn = el('button', 'cz-delete-btn');
  deleteBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>';
  deleteBtn.style.display = 'none';
  deleteBtn.title = 'Delete element';
  root.appendChild(deleteBtn);
  // All instances of a mapped template share one source stamp; the DOM position
  // of a given instance tells the daemon WHICH data item it is (list items
  // render in array order).
  function instanceIndex(elm, loc) {
    const instances = [...document.querySelectorAll(`[data-cz="${CSS.escape(loc)}"]`)];
    const i = instances.indexOf(elm);
    return i >= 0 ? i : undefined;
  }

  async function deleteOne({ el: elm, loc }) {
    const payload = { loc, index: instanceIndex(elm, loc) };
    // Dry-run first so a refusal never flickers the element.
    await api('delete', { ...payload, dryRun: true });
    if (document.contains(elm)) elm.style.display = 'none'; // optimistic; HMR makes it real
    await api('delete', payload);
  }

  deleteBtn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = state.selected;
    if (!sel || !document.contains(sel.el)) return;
    deleteBtn.disabled = true;
    try {
      await deleteOne(sel);
    } catch (err) {
      if (document.contains(sel.el)) sel.el.style.display = '';
      deleteBtn.disabled = false;
      addTweak({ id: 'x' + Date.now(), status: 'error', label: `delete: ${err.message.slice(0, 140)}` });
      return;
    }
    deleteBtn.disabled = false;
    deselect();
  };

  // ---------- reorder / move ----------
  const moveBar = el('div', 'cz-movebar');
  const grip = el('span', 'cz-grip', '⠿');
  grip.title = 'Drag to reorder';
  const btnPrev = el('button');
  const btnNext = el('button');
  moveBar.append(grip, btnPrev, btnNext);
  moveBar.style.display = 'none';
  root.appendChild(moveBar);

  // Is this element laid out in a row (reorder ←→) or a column (reorder ↑↓)?
  function siblingAxis(elm) {
    const p = elm.parentElement;
    if (!p) return 'vertical';
    const cs = getComputedStyle(p);
    if (cs.display.includes('flex')) return cs.flexDirection.startsWith('row') ? 'horizontal' : 'vertical';
    if (cs.display.includes('grid')) {
      // count column tracks — "220px 220px" = 2 cols (a row); "none" = 1
      const tracks = cs.gridTemplateColumns.split(/\s+/).filter(Boolean);
      if (tracks.length > 1 && tracks[0] !== 'none') return 'horizontal';
    }
    return 'vertical';
  }

  async function doMove(dir) {
    const s = state.selected;
    if (!s || !document.contains(s.el)) return;
    try {
      await api('move', { loc: s.loc, dir, index: instanceIndex(s.el, s.loc) });
      // the reordered source shows via auto-reload / HMR
    } catch (e) {
      addTweak({ id: 'x' + Date.now(), status: 'error', label: `move: ${e.message.slice(0, 140)}` });
    }
  }
  btnPrev.onclick = (e) => { e.preventDefault(); e.stopPropagation(); doMove(moveBar._axis === 'horizontal' ? 'left' : 'up'); };
  btnNext.onclick = (e) => { e.preventDefault(); e.stopPropagation(); doMove(moveBar._axis === 'horizontal' ? 'right' : 'down'); };

  // The peers a drag reorders among, and the dragged element's index in them.
  function dragPeers(elm, loc) {
    const instances = [...document.querySelectorAll(`[data-cz="${CSS.escape(loc)}"]`)];
    if (instances.length > 1 && instances.includes(elm)) return { kind: 'map', peers: instances };
    const sibs = [...(elm.parentElement?.children || [])].filter((c) => c.nodeType === 1 && c.hasAttribute && c.hasAttribute('data-cz'));
    return { kind: 'siblings', peers: sibs.length > 1 ? sibs : [elm] };
  }

  const dropLine = el('div', 'cz-drop');
  dropLine.style.display = 'none';
  root.appendChild(dropLine);
  let suppressClick = false; // swallow the click the browser fires right after a drag

  grip.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const s = state.selected;
    if (!s || !document.contains(s.el)) return;
    const axis = siblingAxis(s.el);
    const { peers } = dragPeers(s.el, s.loc);
    if (peers.length < 2) {
      addTweak({ id: 'x' + Date.now(), status: 'error', label: 'nothing to reorder here — select a card in a row, or the section container' });
      return;
    }
    const from = peers.indexOf(s.el);
    if (from < 0) return;
    const startX = e.clientX, startY = e.clientY;
    let engaged = false, insertIndex = from;

    const engage = () => {
      engaged = true;
      document.body.style.cursor = 'grabbing';
      grip.style.cursor = 'grabbing';
      s.el.style.opacity = '0.45'; // show what's moving
      // hide the panels/popover so they don't block the drop targets
      pop.style.display = 'none'; popLabel.style.display = 'none'; // panel is docked left, doesn't block drop targets
    };

    const onMove = (ev) => {
      if (!engaged) {
        if (Math.abs(ev.clientX - startX) < 4 && Math.abs(ev.clientY - startY) < 4) return; // threshold
        engage();
      }
      const pos = axis === 'horizontal' ? ev.clientX : ev.clientY;
      insertIndex = peers.length;
      for (let i = 0; i < peers.length; i++) {
        const rr = peers[i].getBoundingClientRect();
        const mid = axis === 'horizontal' ? rr.left + rr.width / 2 : rr.top + rr.height / 2;
        if (pos < mid) { insertIndex = i; break; }
      }
      const ref = peers[Math.min(insertIndex, peers.length - 1)].getBoundingClientRect();
      dropLine.style.display = 'block';
      if (axis === 'horizontal') {
        const x = insertIndex >= peers.length ? ref.right : ref.left;
        Object.assign(dropLine.style, { left: x - 1 + 'px', top: ref.top + 'px', width: '3px', height: ref.height + 'px' });
      } else {
        const y = insertIndex >= peers.length ? ref.bottom : ref.top;
        Object.assign(dropLine.style, { left: ref.left + 'px', top: y - 1 + 'px', width: ref.width + 'px', height: '3px' });
      }
    };
    const onUp = async () => {
      removeEventListener('mousemove', onMove, true);
      removeEventListener('mouseup', onUp, true);
      dropLine.style.display = 'none';
      document.body.style.cursor = '';
      grip.style.cursor = 'grab';
      if (document.contains(s.el)) s.el.style.opacity = '';
      if (!engaged) return; // was a click, not a drag
      suppressClick = true; // swallow the synthetic click that follows a drag
      setTimeout(() => { suppressClick = false; }, 0);
      const restore = () => { if (state.selected === s && document.contains(s.el)) { renderPopover(); renderPanel(); reposition(); } };
      const finalIndex = insertIndex > from ? insertIndex - 1 : insertIndex;
      if (finalIndex === from || finalIndex < 0) { restore(); return; } // dropped where it started
      try {
        await api('move', { loc: s.loc, index: instanceIndex(s.el, s.loc), toIndex: finalIndex });
        restore(); // reorder shows via auto-reload; restore panels if it doesn't
      } catch (err) {
        restore();
        addTweak({ id: 'x' + Date.now(), status: 'error', label: `move: ${err.message.slice(0, 140)}` });
      }
    };
    addEventListener('mousemove', onMove, true);
    addEventListener('mouseup', onUp, true);
  });

  function select(target) {
    finishTextEdit(true); // moving to another element saves the current text edit
    const loc = target.getAttribute('data-cz');
    // How many rendered elements map to this same source line — i.e. how many
    // instances a shared-source edit (style/functionality) will change.
    const instances = document.querySelectorAll(`[data-cz="${CSS.escape(loc)}"]`).length;
    state.selected = { el: target, loc, meta: null, instances };
    selBox.style.display = 'block';
    renderPopover();
    renderPanel();
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
      renderPanel();
      reposition();
      // Text editing is active the moment an editable element is highlighted —
      // no button click needed. Caret goes to the end so it's non-destructive.
      if (canEditWholeText(s) && !state.editing) startTextEdit(false);
    } catch { /* element not resolvable — leave popover as is */ }
  }

  function deselect() {
    finishTextEdit(true); // exiting/⌘0 saves the current text edit
    state.selected = null;
    selBox.style.display = 'none';
    pop.style.display = 'none';
    applyPanelLayout(); // slides the panel out + un-shifts the page
    popLabel.style.display = 'none';
    deleteBtn.style.display = 'none';
    moveBar.style.display = 'none';
  }

  // ---------- multi-select (shift-click) ----------
  const multiBoxes = []; // pooled outline divs
  const multiBar = el('div', 'cz-multibar');
  multiBar.style.display = 'none';
  root.appendChild(multiBar);

  function toggleMulti(target) {
    const loc = target.getAttribute('data-cz');
    const i = state.multi.findIndex((m) => m.el === target);
    if (i >= 0) state.multi.splice(i, 1);
    else {
      // leaving single-selection mode: fold the current single selection in too
      if (state.selected && !state.multi.some((m) => m.el === state.selected.el)) {
        state.multi.push({ el: state.selected.el, loc: state.selected.loc });
      }
      if (!state.multi.some((m) => m.el === target)) state.multi.push({ el: target, loc });
      deselect();
    }
    renderMulti();
  }

  function clearMulti() {
    state.multi = [];
    renderMulti();
  }

  function positionMulti() {
    state.multi.forEach((m, i) => {
      if (!multiBoxes[i]) { multiBoxes[i] = el('div', 'cz-multi'); root.appendChild(multiBoxes[i]); }
      const box = multiBoxes[i];
      if (!document.contains(m.el)) { box.style.display = 'none'; return; }
      box.style.display = 'block';
      positionBox(box, m.el);
    });
    for (let i = state.multi.length; i < multiBoxes.length; i++) multiBoxes[i].style.display = 'none';
  }

  let multiInput;
  function renderMulti() {
    positionMulti();
    if (!state.multi.length) { multiBar.style.display = 'none'; return; }
    multiBar.style.display = 'flex';
    multiBar.textContent = '';
    multiBar.append(el('span', 'cz-count', String(state.multi.length)));
    multiBar.append(el('span', null, 'selected'));
    multiInput = el('input');
    multiInput.placeholder = 'Describe a change for all…';
    multiInput.value = multiBar._draft || '';
    multiInput.oninput = () => { multiBar._draft = multiInput.value; };
    multiInput.onkeydown = (e) => { if (e.key === 'Enter') applyMultiNL(); e.stopPropagation(); };
    const apply = el('button', 'cz-primary', 'Apply');
    apply.onclick = applyMultiNL;
    const del = el('button', 'cz-danger', 'Delete all');
    del.onclick = deleteMulti;
    const clear = el('button', null, 'Clear');
    clear.onclick = clearMulti;
    multiBar.append(multiInput, apply, del, clear);
  }

  async function applyMultiNL() {
    const instruction = (multiInput?.value || '').trim();
    if (!instruction) return;
    const targets = state.multi.slice();
    multiBar._draft = '';
    clearMulti();
    for (const t of targets) {
      const tempId = 'nl-' + Date.now() + t.loc;
      addTweak({ id: tempId, status: 'queued', label: `${shortLoc(t.loc)}: ${instruction.slice(0, 40)}` });
      try {
        const r = await api('nl', { loc: t.loc, instruction, model: state.model });
        removeTweak(tempId);
        addTweak({ id: r.id, status: 'queued', model: r.model, label: `${shortLoc(t.loc)}: ${instruction.slice(0, 40)}` });
      } catch (e) {
        removeTweak(tempId);
        addTweak({ id: 'x' + Date.now() + t.loc, status: 'error', label: `${shortLoc(t.loc)}: ${e.message}` });
      }
    }
  }

  async function deleteMulti() {
    const targets = state.multi.slice();
    clearMulti();
    // Delete bottom-up so a mapped-list removal doesn't shift the index of a
    // not-yet-deleted sibling in the same list.
    targets.sort((a, b) => (instanceIndex(b.el, b.loc) ?? 0) - (instanceIndex(a.el, a.loc) ?? 0));
    for (const t of targets) {
      try {
        await deleteOne(t);
      } catch (e) {
        if (document.contains(t.el)) t.el.style.display = '';
        addTweak({ id: 'x' + Date.now() + t.loc, status: 'error', label: `delete ${shortLoc(t.loc)}: ${e.message}` });
      }
    }
  }

  function reposition() {
    const s = state.selected;
    if (!s) return;
    if (!document.contains(s.el)) {
      // HMR replaced the node — re-acquire by stamp
      const again = document.querySelector(`[data-cz="${CSS.escape(s.loc)}"]`);
      if (!again) return deselect();
      s.el = again;
    }
    const r = positionBox(selBox, s.el);
    pop.style.display = 'flex';
    const labelH = 22; // room for the file:line tab above the panel
    // Keep a generous gap so the panel never sits on top of the text you're
    // editing — below the element by default, above only if there's no room.
    const GAP = 26;
    const below = r.bottom + GAP + labelH;
    const top = below + pop.offsetHeight > innerHeight ? r.top - pop.offsetHeight - GAP : below;
    const left = Math.min(Math.max(r.left, 8), innerWidth - Math.max(pop.offsetWidth + 16, 356));
    Object.assign(pop.style, { left: left + 'px', top: Math.max(top, 8 + labelH) + 'px' });
    popLabel.style.display = 'block';
    popLabel.textContent = s.instances > 1 ? `${shortLoc(s.loc)} · ${s.instances}×` : shortLoc(s.loc);
    Object.assign(popLabel.style, { left: (left + pop.offsetWidth / 2) + 'px', top: pop.style.top });
    deleteBtn.style.display = 'flex';
    const inset = 4;
    Object.assign(deleteBtn.style, {
      left: r.right - 22 - inset + 'px',
      top: r.top + inset + 'px',
    });
    // Move toolbar: top-left of the selection, arrows matching the layout axis.
    const axis = siblingAxis(s.el);
    moveBar._axis = axis;
    btnPrev.textContent = axis === 'horizontal' ? '←' : '↑';
    btnNext.textContent = axis === 'horizontal' ? '→' : '↓';
    btnPrev.title = axis === 'horizontal' ? 'Move left' : 'Move up';
    btnNext.title = axis === 'horizontal' ? 'Move right' : 'Move down';
    moveBar.style.display = 'flex';
    Object.assign(moveBar.style, { left: r.left + inset + 'px', top: r.top + inset + 'px' });
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
    setTimeout(() => { reposition(); renderPopover(); renderPanel(); }, 350); // after HMR
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
    // An arbitrary size like `text-[34px]` also sets font-size and would
    // override the scale class we add — remove it too, and seed the step from
    // the element's rendered px so the first bump goes the right direction.
    const arbitrary = classes.filter((c) => /^text-\[[^\]]+\]$/.test(c));
    const cur = classes.find((c) => scale.includes(c));
    let idx;
    if (cur) idx = scale.indexOf(cur);
    else {
      const px = parseFloat(getComputedStyle(target).fontSize) || 16;
      // nearest scale entry by rendered size, else middle
      idx = scale.indexOf('text-base');
      if (idx < 0) idx = Math.floor(scale.length / 2);
    }
    if (idx < 0) idx = Math.floor(scale.length / 2);
    const next = Math.min(Math.max(idx + dir, 0), scale.length - 1);
    const add = scale[next];
    const remove = [...(cur ? [cur] : []), ...arbitrary];
    if (add === cur && !arbitrary.length) return null;
    return { remove, add: [add] };
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
    setTimeout(() => { reposition(); renderPopover(); renderPanel(); }, 350);
  }

  function pxStep(current, scale, dir) {
    let idx = scale.findIndex((v) => v >= Math.round(current));
    if (idx < 0) idx = scale.length - 1;
    return scale[Math.min(Math.max(idx + dir, 0), scale.length - 1)];
  }

  function spacingRowPx(label, cssBase) {
    const s = state.selected;
    const row = el('div', 'cz-row');
    row.append(el('span', 'cz-label', label));
    const sideSel = el('select');
    for (const [name, v] of [['All', ''], ['Top', 'Top'], ['Right', 'Right'], ['Bottom', 'Bottom'], ['Left', 'Left']]) {
      const o = el('option', null, name);
      o.value = v;
      sideSel.appendChild(o);
    }
    const cur = el('span', 'cz-cur');
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
    const row = el('div', 'cz-row');
    row.append(el('span', 'cz-label', 'Font'));
    const cur = el('span', 'cz-cur', Math.round(parseFloat(getComputedStyle(s.el).fontSize)) + 'px');
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
    const row = el('div', 'cz-row');
    row.append(el('span', 'cz-label', label));
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
    if (cur) row.append(el('span', 'cz-cur', cur));
    return row;
  }

  // Build the inline swatches/chips control for one style property (used by the
  // left panel — every attribute broken out, no dropdown).
  function buildPropSwatches(name, tw) {
    const s = state.selected;
    const wrap = el('div', 'cz-swatches');
    const p = (tw ? PROPS : STYLE_PROPS)[name];
    if (!p) return wrap;
    if (p.type === 'color') {
      if (tw) {
        const { colors, fromDS } = readTheme();
        if (!fromDS) { wrap.append(el('span', 'cz-meta', 'no design-system colors in CSS')); return wrap; }
        for (const c of colors) {
          const b = el('button', 'cz-swatch');
          b.style.background = c.value;
          b.title = `${p.prefix}-${c.name}`;
          b.onclick = () => applyClassTweak(propChange(s.el, name, `${p.prefix}-${c.name}`), name);
          wrap.appendChild(b);
        }
      } else {
        const { varColors } = readTheme();
        const palette = varColors.length ? varColors.slice(0, 48) : harvestPageColors();
        for (const c of palette) {
          const b = el('button', 'cz-swatch');
          b.style.background = c.value;
          b.title = c.name;
          b.onclick = () => applyStyleProp(name, c.apply);
          wrap.appendChild(b);
        }
      }
    } else {
      p.options.forEach((opt, i) => {
        const b = el('button', 'cz-chip', p.labels ? p.labels[i] : opt);
        b.onclick = () => tw ? applyClassTweak(propChange(s.el, name, opt), name) : applyStyleProp(name, opt);
        wrap.appendChild(b);
      });
    }
    return wrap;
  }

  // Left inspector panel: every style attribute broken out into its own control.
  function renderPanel() {
    const s = state.selected;
    applyPanelLayout();
    if (!s) return;
    panel.textContent = '';
    const head = el('div', 'cz-phead');
    head.append(el('div', 'cz-ptitle', `<${s.el.tagName.toLowerCase()}>  ${shortLoc(s.loc)}${s.instances > 1 ? ` · ${s.instances}×` : ''}`));
    const min = el('button', 'cz-min', '‹');
    min.title = 'Minimize panel';
    min.onclick = () => setPanelCollapsed(true);
    head.append(min);
    panel.appendChild(head);
    const tw = state.tailwind;

    panel.appendChild(el('div', 'cz-sec', 'Spacing'));
    if (tw) { panel.appendChild(spacingRow('Padding', 'p')); panel.appendChild(spacingRow('Margin', 'm')); }
    else { panel.appendChild(spacingRowPx('Padding', 'padding')); panel.appendChild(spacingRowPx('Margin', 'margin')); }

    panel.appendChild(el('div', 'cz-sec', 'Typography'));
    if (tw) {
      const fontRow = el('div', 'cz-row');
      fontRow.append(el('span', 'cz-label', 'Font'));
      const fMinus = el('button', null, 'A−');
      const fPlus = el('button', null, 'A+');
      fMinus.onclick = () => applyClassTweak(fontStep(s.el, -1), 'font');
      fPlus.onclick = () => applyClassTweak(fontStep(s.el, +1), 'font');
      const curFont = classList(s.el).find((c) => readTheme().textSizes.includes(c));
      fontRow.append(fMinus, fPlus, el('span', 'cz-cur', curFont || 'inherited'));
      panel.appendChild(fontRow);
    } else {
      panel.appendChild(fontRowPx());
    }

    panel.appendChild(el('div', 'cz-sec', 'Color & border'));
    for (const name of Object.keys(tw ? PROPS : STYLE_PROPS)) {
      panel.appendChild(el('span', 'cz-label', name));
      panel.appendChild(buildPropSwatches(name, tw));
    }
  }

  function renderPopover() {
    const s = state.selected;
    if (!s) return;
    pop.textContent = '';

    // location now lives in the green tab above the panel (popLabel)

    // Reused component: this source line renders in >1 place, so style and
    // functionality edits (which change the shared source) apply everywhere.
    // Copy is the exception — it must stay on this one instance (below).
    const shared = s.instances > 1;
    if (shared) {
      pop.appendChild(el('div', 'cz-note cz-info', `Reused component — ${s.instances} instances. Style & functionality changes apply to all of them.`));
    }

    // Copy lane, driven by the SOURCE text literals (s.meta.texts), not the
    // DOM: animation libs split text into spans and expressions render as
    // text, so DOM shape says nothing about what's editable in the JSX.
    const literals = s.meta ? s.meta.texts : null;
    if (shared && literals && literals.length) {
      // The text literal is shared by every instance, so editing it here would
      // change all of them — which is not what a copy edit should do. Keep copy
      // local: block the in-place edit and point to the per-instance route.
      pop.appendChild(el('div', 'cz-note', 'Copy here is shared across all instances — editing it would change every one. To change just this instance, make its text a prop/data value (describe it below and it\'ll route through the model).'));
    } else if (literals && literals.length) {
      // In-place editing only when the single literal IS the element's whole
      // text (animation-split DOM still qualifies — same text, different
      // nodes). Partial literals (mixed with {expressions}) get input fields
      // showing exactly the editable part.
      const wholeText =
        literals.length === 1 && literals[0].value.trim() === s.el.textContent.trim();
      if (wholeText) {
        pop.appendChild(el('div', 'cz-note cz-info', '✎ Editing text inline — just type. Saves on ⌘0 or when you move to another element; Esc cancels.'));
      } else {
        // DOM is transformed (or several literals) → edit the source text here
        for (const t of literals) {
          const row = el('div', 'cz-row');
          row.append(el('span', 'cz-label', 'Copy'));
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

    // Style controls now live in the left inspector panel (renderPanel).

    const nlWrap = el('div', 'cz-nlwrap');
    const input = el('textarea');
    input.placeholder = 'Describe a change… (↵ to send · ⇧↵ newline)';
    input.rows = 3;
    const go = el('button', 'cz-primary', 'Go →');
    const send = async () => {
      const instruction = input.value.trim();
      if (!instruction) return;
      input.value = '';
      input.blur(); // so the reload after the model finishes isn't blocked by focus
      // Immediate feedback — the server runs the router (which may call the
      // classifier for ~1-3s) before it broadcasts its own 'queued', so show a
      // placeholder now and swap in the real task once the request returns.
      const tempId = 'nl-' + Date.now();
      addTweak({ id: tempId, status: 'queued', label: instruction.slice(0, 60) });
      try {
        const r = await api('nl', { loc: s.loc, instruction, model: state.model });
        removeTweak(tempId);
        addTweak({ id: r.id, status: 'queued', model: r.model, label: instruction.slice(0, 60) });
      } catch (e) {
        removeTweak(tempId);
        addTweak({ id: 'x' + Date.now(), status: 'error', label: `${instruction.slice(0, 40)}: ${e.message}` });
      }
    };
    go.onclick = send;
    // Enter sends; Shift+Enter inserts a newline for multi-line prompts.
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } e.stopPropagation(); };
    const goRow = el('div', 'cz-row');
    goRow.style.justifyContent = 'flex-end';
    goRow.appendChild(go);
    nlWrap.append(input, goRow);
    pop.appendChild(nlWrap);

    // Model picker: Auto (router) or a forced tier.
    const modelRow = el('div', 'cz-row');
    modelRow.append(el('span', 'cz-label', 'Model'));
    const modelSel = el('select');
    for (const [label, value] of [['Auto (routed)', 'auto'], ['Sonnet', 'claude-sonnet-5'], ['Opus', 'claude-opus-4-8'], ['Fable', 'claude-fable-5']]) {
      const o = el('option', null, label);
      o.value = value;
      if (value === state.model) o.selected = true;
      modelSel.appendChild(o);
    }
    modelSel.onchange = () => { state.model = modelSel.value; };
    modelRow.append(modelSel);
    pop.appendChild(modelRow);
    // delete lives as a floating icon on the element itself (deleteBtn)
  }

  // ---------- inline copy editing ----------
  // Works on ANY element whose source has one text literal — titles,
  // descriptions, buttons, links — even when animations have split the DOM
  // into spans: we swap in the source text for editing and keep the original
  // DOM aside so Esc restores it untouched.
  // Whether the selected element's whole visible text is a single source
  // literal we can edit in place (headings, buttons, links, paragraphs — not
  // containers, and not text shared across multiple instances).
  function canEditWholeText(s) {
    const lits = s?.meta?.texts;
    if (!lits || lits.length !== 1 || s.instances > 1) return false;
    return document.contains(s.el) && lits[0].value.trim() === s.el.textContent.trim();
  }

  function startTextEdit(selectAll = true) {
    const s = state.selected;
    // the popover can outlive its selection (HMR, reloads) — never throw
    const literal = s?.meta?.texts?.[0]?.value;
    if (literal == null || !document.contains(s.el)) return;
    if (state.editing && state.editing.el === s.el) return; // already editing this one
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
    s.el.focus({ preventScroll: true });
    const sel = document.getSelection();
    if (selectAll) sel?.selectAllChildren(s.el);
    else { const rng = document.createRange(); rng.selectNodeContents(s.el); rng.collapse(false); sel?.removeAllRanges(); sel?.addRange(rng); }
    hint.textContent = 'editing text — type to change · ⌘0 or click another element saves · Esc cancels';
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

  // ---------- stats banner (permanent, above the site) ----------
  const banner = el('div', 'cz-banner');
  const brand = el('div', 'cz-brand');
  brand.innerHTML = '<kbd>⌘0</kbd> CmdZero';
  const bannerStats = el('div', 'cz-stats');
  const reportLink = el('a', null, 'report →');
  reportLink.href = 'https://cmdzero.dev/report';
  reportLink.target = '_blank';
  reportLink.rel = 'noopener';
  banner.append(brand, bannerStats, reportLink);
  root.appendChild(banner);
  // Push the page down so the banner sits ABOVE the site rather than over it.
  // Inject a stylesheet instead of mutating body's style attribute: frameworks
  // that hydrate (React 19+) diff server-rendered attributes and flag a bare
  // style mutation as a hydration mismatch.
  try {
    const prevPad = getComputedStyle(document.body).paddingTop;
    const pad = document.createElement('style');
    pad.setAttribute('data-cz-banner-pad', '');
    pad.textContent = `body { padding-top: calc(${prevPad} + 30px) !important; }`;
    document.head.appendChild(pad);
  } catch { /* no body yet */ }

  // ---------- tray ----------
  const tray = el('div', 'cz-tray');
  root.appendChild(tray);
  // Reads like a log: newest alert sits at the bottom-right corner, older ones
  // stack upward. The 3 newest stay visible (compressed; hover to expand); the
  // rest fold behind an expander that sits ABOVE them.
  const historyChip = el('div', 'cz-history');
  historyChip.style.display = 'none';
  const tweaksWrap = el('div', 'cz-wrap');
  const pinNewestToBottom = () => { if (tweaksWrap.classList.contains('cz-expanded')) tweaksWrap.scrollTop = tweaksWrap.scrollHeight; };
  historyChip.onclick = () => {
    tweaksWrap.classList.toggle('cz-expanded');
    updateHistoryUI();
    // when expanded the list scrolls; keep the newest (bottom) in view
    requestAnimationFrame(pinNewestToBottom);
  };
  tray.appendChild(historyChip);
  const fade = el('div', 'cz-fade');
  fade.style.display = 'none';
  tray.appendChild(fade);
  tray.appendChild(tweaksWrap);
  const tweaks = new Map();
  const tweakData = new Map(); // id -> merged record, persisted across reloads
  const HKEY = 'cz-history';
  const MAX_TWEAKS = 40;

  function updateHistoryUI() {
    const rows = tweaksWrap.children.length;
    const expanded = tweaksWrap.classList.contains('cz-expanded');
    const hidden = Math.max(0, rows - 3);
    if (rows <= 3) { historyChip.style.display = 'none'; fade.style.display = 'none'; return; }
    historyChip.style.display = '';
    historyChip.textContent = expanded ? 'collapse ▴' : `＋ ${hidden} older ▾`;
    fade.style.display = expanded ? 'none' : '';
  }

  function persistTweaks() {
    try {
      const arr = [...tweakData.values()].slice(-MAX_TWEAKS).map((r) => ({
        id: r.id, label: r.label, status: r.status, model: r.model, effort: r.effort,
        kind: r.kind, tokens: r.tokens, durationMs: r.durationMs, costUSD: r.costUSD, error: r.error,
      }));
      localStorage.setItem(HKEY, JSON.stringify(arr));
    } catch { /* no storage */ }
  }

  const stat = (label, value, accent) => {
    const s = el('div', 'cz-stat' + (accent ? ' cz-accent' : ''));
    s.append(el('span', null, label), el('b', null, value));
    return s;
  };
  // How many of the session's tweaks cost zero tokens (copy/style/move/delete).
  function zeroTokenCount() {
    let z = 0;
    for (const r of tweakData.values()) if (!r.model && r.tokens === 0 && !String(r.id).startsWith('x')) z++;
    return z;
  }
  function showTotals(t) {
    bannerStats.textContent = '';
    if (!t || !t.count) {
      bannerStats.append(el('span', 'cz-idle', 'Press ⌘0, then click any element to tweak it — edits land in your source.'));
      return;
    }
    const secs = Math.round(t.ms / 1000);
    const time = secs >= 60 ? `${Math.round(secs / 60)}m` : `${secs}s`;
    const z = zeroTokenCount();
    bannerStats.append(
      stat('tweaks', String(t.count)),
      stat('saved', `$${t.usd.toFixed(2)}`, true),
      stat('faster', time, true),
    );
    if (z > 0) bannerStats.append(stat('zero-token', String(z)));
    bannerStats.append(stat('vs', 'unscoped agent'));
  }
  showTotals(null); // idle banner on load until /api/health arrives

  function removeTweak(id) {
    const key = String(id);
    const row = tweaks.get(key);
    if (row) row.remove();
    tweaks.delete(key);
    tweakData.delete(key);
    updateHistoryUI();
  }

  function addTweak(t, hydrate) {
    const key = String(t.id);
    let row = tweaks.get(key);
    if (!row) {
      row = el('div', 'cz-tweak');
      row._id = key;
      row._dot = el('span', 'cz-dot');
      row._label = el('span', 'cz-tlabel', '');
      row._meta = el('span', 'cz-meta', '');
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
          await api('undo', { id: row._id });
          setTimeout(reposition, 350);
        } catch (e) { row._meta.textContent = e.message; }
      };
      row.append(row._dot, row._label, row._meta, row._cancel, row._undo);
      tweaksWrap.appendChild(row); // newest at the end (bottom of the tray)
      tweaks.set(key, row);
      while (tweaksWrap.children.length > MAX_TWEAKS) {
        const oldest = tweaksWrap.firstChild;
        tweaks.delete(oldest._id);
        tweakData.delete(oldest._id);
        oldest.remove();
      }
    }
    if (t.label) row._label.textContent = t.label;
    if (t.status) {
      row._dot.className = 'cz-dot ' + t.status;
      const inFlight = t.status === 'queued' || t.status === 'running';
      row._cancel.style.display = inFlight ? '' : 'none';
      const undoable = t.status === 'done' && !key.startsWith('x');
      row._undo.style.display = undoable ? '' : 'none';
      if (undoable && !undoStack.includes(key)) undoStack.push(key);
      if (t.status === 'reverted') {
        const i = undoStack.indexOf(key);
        if (i >= 0) undoStack.splice(i, 1);
      }
      // Only reload when the edit isn't already reflected instantly: model (nl)
      // requests and reorders have no optimistic preview, so pull the live view
      // in sync. Copy/style/delete apply immediately (optimistic + HMR) — no
      // reload. Undo (revert) reloads so the reversal always shows. Never during
      // hydration (replaying saved alerts after a load).
      const needsReload = (undoable && (!!t.model || t.kind === 'move')) || t.status === 'reverted';
      if (needsReload && !hydrate) scheduleReload();
    }
    const bits = [];
    if (t.model) bits.push(t.model.replace(/^claude-/, '') + (t.effort ? ` @ ${t.effort}` : ''));
    if (t.tokens === 0) bits.push('0 tokens');
    if (t.durationMs) bits.push((t.durationMs / 1000).toFixed(1) + 's');
    if (t.costUSD != null) bits.push('$' + t.costUSD.toFixed(3));
    if (t.saved) bits.push(`saved ~$${t.saved.usd.toFixed(2)}`);
    if (t.error) bits.push(t.error.slice(0, 80));
    if (bits.length) row._meta.textContent = bits.join(' · ');
    if (t.totals) showTotals(t.totals);

    // merge into the persisted record set (skip re-persisting during hydration)
    tweakData.set(key, { ...(tweakData.get(key) || {}), ...t, id: key });
    if (!hydrate) persistTweaks();
    updateHistoryUI();
    if (!hydrate) pinNewestToBottom(); // keep the newest alert in view when expanded
  }

  // Replay saved alerts after a page load so history survives reloads.
  (function hydrateTweaks() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch { saved = []; }
    for (const rec of saved) addTweak(rec, true); // chronological replay → newest ends at the bottom
  })();

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
      // Show the running overlay version so a stale/cached overlay is obvious.
      if (h.version) {
        brand.innerHTML = `<kbd>⌘0</kbd> CmdZero <span style="opacity:.45;font-weight:400">v${h.version}</span>`;
        console.log(`[cmdzero] overlay v${h.version} — newest alerts at the bottom of the tray`);
      }
    })
    .catch(() => {});

  // ---------- auto-reload ----------
  // HMR/Fast Refresh reflects most edits live, but not all (module-scope
  // consts, some structural/model edits). To guarantee changes always show
  // without a manual refresh, do a seamless reload after a write settles —
  // debounced, and preserving scroll + select mode + the current selection.
  const RKEY = 'cz-reload-state';
  let reloadTimer = null;
  function scheduleReload() {
    if (!state.autoReload) return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(doReload, 650);
  }
  function doReload() {
    // never interrupt an in-progress copy edit, multi-select, or typing into a
    // text field (the app's or the overlay's own NL box) — wait and retry.
    const ae = document.activeElement;
    const typing = ae && (ae.isContentEditable || /^(INPUT|TEXTAREA)$/.test(ae.tagName));
    if (state.editing || state.multi.length || typing) {
      reloadTimer = setTimeout(doReload, 650);
      return;
    }
    try {
      // Only for THIS reload: stop the browser from also restoring scroll and
      // fighting ours. Not set globally (that interfered with the app's own
      // scroll handling and caused idle scroll jitter).
      history.scrollRestoration = 'manual';
    } catch { /* older browsers */ }
    try {
      sessionStorage.setItem(RKEY, JSON.stringify({ scrollX: scrollX, scrollY: scrollY, selectMode: state.selectMode, loc: state.selected?.loc || null }));
    } catch { /* no storage — reload anyway */ }
    location.reload();
  }

  // Restore scroll + selection after an auto-reload so it feels seamless.
  function restoreAfterReload() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(RKEY) || 'null'); } catch { saved = null; }
    if (!saved) return; // normal load — leave the browser's scroll handling alone
    try { sessionStorage.removeItem(RKEY); } catch { /* ignore */ }
    // Re-apply scroll a few times as the app hydrates, then hand control back
    // to the browser so we never linger and fight the app's scrolling.
    const y = saved.scrollY || 0, x = saved.scrollX || 0;
    let tries = 12;
    (function pin() {
      scrollTo(x, y);
      if (tries-- > 0 && Math.abs(scrollY - y) > 2) setTimeout(pin, 30);
      else { try { history.scrollRestoration = 'auto'; } catch { /* ignore */ } }
    })();
    if (saved.selectMode) setMode(true);
    if (saved.loc) {
      const again = document.querySelector(`[data-cz="${CSS.escape(saved.loc)}"]`);
      if (again) select(again);
    }
  }
  if (document.readyState === 'complete') restoreAfterReload();
  else addEventListener('load', restoreAfterReload);

  // ---------- mode + events ----------
  const hint = el('div', 'cz-hint', '⌘0 select mode');
  root.appendChild(hint);

  const reloadToggle = el('button', 'cz-reload-toggle');
  const syncReloadToggle = () => {
    reloadToggle.textContent = state.autoReload ? '⟳ auto-reload on' : '⟳ auto-reload off';
    reloadToggle.classList.toggle('off', !state.autoReload);
    reloadToggle.title = 'Reload the page automatically after each change so it always shows live';
  };
  reloadToggle.onclick = () => {
    state.autoReload = !state.autoReload;
    try { localStorage.setItem('cz-autoreload', state.autoReload ? '1' : '0'); } catch { /* no storage */ }
    syncReloadToggle();
  };
  syncReloadToggle();
  root.appendChild(reloadToggle);

  function setMode(on) {
    state.selectMode = on;
    hint.textContent = on ? 'select mode — click · shift-click multi · Tab next · ⌘Z undo · Esc exit' : '⌘0 select mode';
    if (!on) { setHover(null); deselect(); clearMulti(); }
  }

  // Visible, stamped elements in document order — the Tab cycle.
  function stampedEls() {
    return [...document.querySelectorAll('[data-cz]')].filter((n) => n.getClientRects().length);
  }
  function selectNext(dir) {
    const els = stampedEls();
    if (!els.length) return;
    const cur = state.selected?.el;
    let idx = cur ? els.indexOf(cur) : -1;
    idx = (idx + dir + els.length) % els.length;
    const next = els[idx];
    select(next);
    next.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  async function undoLast() {
    const id = undoStack.pop();
    if (id == null) return;
    try {
      await api('undo', { id });
      setTimeout(reposition, 350);
    } catch { /* already reverted / unknown — drop it */ }
  }

  // ⌘Z / Ctrl-Z should still do native undo inside inputs and while editing copy.
  const inTextField = (t) =>
    t instanceof Element && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

  addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === '0') {
      e.preventDefault();
      setMode(!state.selectMode);
      return;
    }
    // Global undo (works whenever the overlay is active, not just in select
    // mode) — but never hijack undo inside a text field or mid copy-edit.
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      if (state.editing || inTextField(e.target)) return;
      e.preventDefault();
      undoLast();
      return;
    }
    if (!state.selectMode) return;
    if (e.key === 'Escape') {
      if (state.editing) return finishTextEdit(false);
      if (state.multi.length) return clearMulti();
      if (state.selected) return deselect();
      return setMode(false);
    }
    if (e.key === 'Tab' && !state.editing) {
      e.preventDefault();
      selectNext(e.shiftKey ? -1 : 1);
      return;
    }
    // Enter saves ONLY when the caret is in the edited element — not when
    // typing in the popover's textarea (which uses Enter for newlines).
    if (e.key === 'Enter' && state.editing && e.target === state.editing.el) {
      e.preventDefault();
      finishTextEdit(true);
    }
  }, true);

  addEventListener('mousemove', (e) => {
    if (!state.selectMode) return;
    // keep hover previews live even while editing text, so you can see the
    // next element you'll click (clicking saves + moves there)
    if (inOverlay(e.target)) return setHover(null);
    if (state.editing && state.editing.el.contains(e.target)) return setHover(null);
    setHover(e.target instanceof Element ? e.target.closest('[data-cz]') : null);
  }, true);

  addEventListener('click', (e) => {
    if (!state.selectMode) return;
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; } // just finished a drag
    if (inOverlay(e.target)) return;
    if (state.editing) {
      // clicks inside the editable text just place the caret; clicking another
      // element saves the current edit AND moves the selection there.
      if (state.editing.el.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      finishTextEdit(true);
      const next = e.target instanceof Element ? e.target.closest('[data-cz]') : null;
      if (next && next !== state.selected?.el) select(next);
      else if (!next) deselect();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const target = e.target instanceof Element ? e.target.closest('[data-cz]') : null;
    // Shift-click toggles an element in the multi-selection set.
    if (target && e.shiftKey) return toggleMulti(target);
    if (state.multi.length) clearMulti();
    if (target) select(target);
    else deselect();
  }, true);


  addEventListener('scroll', () => { reposition(); positionMulti(); setHover(state.hoverEl); }, true);
  addEventListener('resize', () => { reposition(); positionMulti(); });
})();
