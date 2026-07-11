// fastui benchmark: same edits, (a) vanilla repo-wide agent vs (b) fastui lane.
// Usage: node packages/benchmark/run.mjs   (from repo root)
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describeTarget, applyTextEdit, applyClassEdit } from '../daemon/src/resolver.js';
import { classify, buildPrompt } from '../daemon/src/router.js';

const ROOT = path.resolve(import.meta.dirname, '../..');
const APP = path.join(ROOT, 'apps/demo');
const BASELINE_MODEL = process.env.FASTUI_BENCH_BASELINE_MODEL || 'sonnet';

const TASKS = [
  {
    name: 'copy: rewrite hero headline',
    loc: 'src/components/Hero.jsx:7:6',
    lane: 'zero-token',
    zeroToken: () =>
      applyTextEdit(APP, 'src/components/Hero.jsx:7:6', 'Know your users in minutes', 'Answers in minutes, not weeks'),
    baselinePrompt:
      'The hero headline of this app currently says "Know your users in minutes". Change it to "Answers in minutes, not weeks".',
    check: (f) => f('src/components/Hero.jsx').includes('Answers in minutes, not weeks'),
  },
  {
    name: 'style: bump section heading size',
    loc: 'src/components/Features.jsx:19:6',
    lane: 'zero-token',
    zeroToken: () =>
      applyClassEdit(APP, 'src/components/Features.jsx:19:6', ['text-3xl'], ['text-4xl']),
    baselinePrompt:
      'The "Everything you need" section heading should be one Tailwind font size larger (text-3xl -> text-4xl).',
    check: (f) => /h2 className="[^"]*text-4xl/.test(f('src/components/Features.jsx')),
  },
  {
    name: 'style NL: glow on Book a demo',
    loc: 'src/components/Hero.jsx:17:8',
    lane: 'nl',
    instruction: 'give this button a subtle indigo glow on hover',
    baselinePrompt:
      'Give the "Book a demo" button a subtle indigo glow on hover.',
    check: (f) => /Book a demo/.test(f('src/components/Hero.jsx')) && /shadow|glow|ring/.test(f('src/components/Hero.jsx')),
  },
  {
    name: 'functionality NL: confirmation state on CTA',
    loc: 'src/components/Hero.jsx:14:8',
    lane: 'nl',
    instruction:
      'when clicked, this button should show "Thanks! Check your email." for 2 seconds, then return to its normal label',
    baselinePrompt:
      'When the "Start free trial" button is clicked it should show "Thanks! Check your email." for 2 seconds, then return to its normal label.',
    check: (f) => /Thanks! Check your email\./.test(f('src/components/Hero.jsx')),
  },
];

const readApp = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');
const resetApp = () => execSync('git checkout -- apps/demo/src', { cwd: ROOT });

function runClaude({ prompt, model, tools }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(
      'claude',
      ['-p', prompt, '--model', model, '--allowedTools', tools, '--permission-mode', 'acceptEdits', '--output-format', 'json'],
      { cwd: APP }
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      const wallMs = Date.now() - started;
      if (code !== 0) return resolve({ ok: false, wallMs, error: err.trim().slice(0, 200) });
      try {
        const j = JSON.parse(out);
        const u = j.usage || {};
        resolve({
          ok: true,
          wallMs,
          tokens:
            (u.input_tokens || 0) +
            (u.cache_creation_input_tokens || 0) +
            (u.cache_read_input_tokens || 0) +
            (u.output_tokens || 0),
          costUSD: j.total_cost_usd,
          turns: j.num_turns,
        });
      } catch {
        resolve({ ok: true, wallMs, tokens: null, costUSD: null });
      }
    });
  });
}

const results = [];
for (const task of TASKS) {
  console.log(`\n=== ${task.name}`);
  resetApp();

  // --- baseline: unscoped agent, has to find the file itself
  console.log(`  baseline (${BASELINE_MODEL}, unscoped)…`);
  const base = await runClaude({
    prompt: task.baselinePrompt + '\nMake the change in this codebase.',
    model: BASELINE_MODEL,
    tools: 'Read,Edit,Glob,Grep',
  });
  base.pass = task.check(readApp);
  console.log(`    ${base.wallMs}ms, ${base.tokens ?? '?'} tokens, $${base.costUSD?.toFixed(3) ?? '?'}, pass=${base.pass}`);
  resetApp();

  // --- fastui lane
  let fui;
  if (task.lane === 'zero-token') {
    const t0 = Date.now();
    task.zeroToken();
    fui = { ok: true, wallMs: Date.now() - t0, tokens: 0, costUSD: 0, model: '—' };
  } else {
    const route = classify(task.instruction);
    const target = describeTarget(APP, task.loc);
    const prompt = buildPrompt({ file: target.file, target, instruction: task.instruction });
    console.log(`  fastui (${route.model}, scoped to ${target.file})…`);
    fui = await runClaude({ prompt, model: route.model, tools: 'Read,Edit' });
    fui.model = route.model;
  }
  fui.pass = task.check(readApp);
  console.log(`    ${fui.wallMs}ms, ${fui.tokens ?? '?'} tokens, $${fui.costUSD?.toFixed(3) ?? '?'}, pass=${fui.pass}`);
  resetApp();

  results.push({ task: task.name, baseline: base, fastui: fui });
}

// --- report
const fmt = (r) =>
  `${r.pass ? '✅' : '❌'} ${(r.wallMs / 1000).toFixed(1)}s · ${r.tokens ?? '?'} tok · $${r.costUSD?.toFixed(3) ?? '?'}`;
let md = `# fastui benchmark\n\nBaseline: unscoped \`claude -p --model ${BASELINE_MODEL}\` with Read/Edit/Glob/Grep in \`apps/demo\` (agent must locate the code). fastui: zero-token deterministic lane, or scoped prompt + routed model with Read/Edit only.\n\n| Task | Baseline | fastui | Token reduction |\n|---|---|---|---|\n`;
for (const r of results) {
  const red =
    r.baseline.tokens && r.fastui.tokens != null
      ? r.fastui.tokens === 0
        ? '100%'
        : `${Math.round((1 - r.fastui.tokens / r.baseline.tokens) * 100)}%`
      : '?';
  md += `| ${r.task} | ${fmt(r.baseline)} | ${fmt(r.fastui)} (${r.fastui.model}) | ${red} |\n`;
}
const totals = (k) => results.reduce((a, r) => a + (r[k].tokens || 0), 0);
const costs = (k) => results.reduce((a, r) => a + (r[k].costUSD || 0), 0);
const time = (k) => results.reduce((a, r) => a + r[k].wallMs, 0);
md += `| **Total** | ${(time('baseline') / 1000).toFixed(0)}s · ${totals('baseline')} tok · $${costs('baseline').toFixed(3)} | ${(time('fastui') / 1000).toFixed(0)}s · ${totals('fastui')} tok · $${costs('fastui').toFixed(3)} | **${Math.round((1 - totals('fastui') / totals('baseline')) * 100)}%** |\n`;

fs.writeFileSync(path.join(ROOT, 'packages/benchmark/results.json'), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(ROOT, 'packages/benchmark/results.md'), md);
console.log('\n' + md);
