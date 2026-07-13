import { spawn } from 'node:child_process';

// ---------------------------------------------------------------------------
// Model routing — layered router (deterministic first, LLM tiebreak second).
//
// Tiers (see README for the routing table):
//   1  component tweaks / styles / copy / existing components  → Sonnet-tier
//   2  new logic & functionality, low error rate               → Opus-tier
//   3  multi-feature / cross-cutting / mission-critical        → Opus xhigh → Fable
//
// "Speed" within a tier is the claude CLI's --effort flag (low..max), scaled
// by a complexity score. Layer 1 is lexicon+structure heuristics (<1ms, free);
// when its signals are ambiguous, Layer 2 asks Haiku to classify via
// --json-schema (~1-3s, ~$0.001). CMDZERO_ROUTER=heuristic|hybrid|llm.
// ---------------------------------------------------------------------------

const MODELS = {
  t1: process.env.CMDZERO_T1_MODEL || process.env.CMDZERO_FAST_MODEL || 'claude-sonnet-5',
  t2: process.env.CMDZERO_T2_MODEL || process.env.CMDZERO_SMART_MODEL || 'claude-opus-4-8',
  t3: process.env.CMDZERO_T3_MODEL || 'claude-opus-4-8',
  t3Critical: process.env.CMDZERO_T3_CRITICAL_MODEL || 'claude-fable-5',
};

// --- Layer 1 lexicons ------------------------------------------------------

const STYLE_COPY =
  /(colou?r|\b(red|blue|green|yellow|orange|purple|pink|white|black|gr[ae]y|teal|indigo|emerald|amber|slate|navy|cream)\b|padding|margin|spacing|font|bigger|smaller|larger|tighter|wider|bold|italic|underline|round(ed)?|corner|radius|shadow|glow|gradient|background|border|align|cent(er|re)|width|height|gap|opacity|hover|focus|responsive|mobile|breakpoint|dark mode|reword|rewrite|rephrase|shorten|copy|headline|heading|title|caption|label|tone|punchier|catch(y|ier)|wording|typo|spelling)/i;

const EXISTING_COMPONENT =
  /(add another|duplicate|a copy of|move (the|this|it)|reorder|swap|reuse|use the existing|another instance|same as the|like the one)/i;

const NEW_LOGIC =
  /(implement|build|create|add a (new )?(feature|form|modal|dropdown|toggle|filter|search|carousel|slider|tab|accordion|tooltip|menu|pagination|stepper|wizard)|when (clicked|submitted|hovered|selected|scrolled)|on (click|submit|change|load|scroll)|fetch|\bapi\b|endpoint|request|\bstate\b|store|track|count(er|down)?|validat(e|ion)|debounce|localstorage|session storage|cookie|websocket|subscribe|drag|sortable|upload|download|timer|interval|keyboard shortcut)/i;

// "signup form" is a UI task (tier 2); "sign in with google" is auth (tier 3) —
// the sign in/up pattern only counts when followed by an auth-flow preposition.
const MISSION_CRITICAL =
  /(\bauth\b|authentication|oauth|\bsso\b|log ?in|log ?out|sign ?(in|up) (with|via|using|flow)|password|payment|checkout|billing|stripe|subscription|credit card|security|permission|\brole\b|admin|database|migration|schema|production|deploy|delete (all|account|user)|gdpr|\bpii\b|encrypt)/i;

const MULTI_SCOPE =
  /(across (the|all)|all pages|every (page|component|section)|entire (site|app|page)|throughout|end.to.end|site.wide|app.wide)/i;

const BIG_REWORK = /(refactor|redesign|rebuild|overhaul|rework|migrate)/i;

// --- Layer 1: deterministic scoring ---------------------------------------

function complexityOf(instruction) {
  let score = 0;
  const words = instruction.trim().split(/\s+/).length;
  if (words > 12) score++;
  if (words > 30) score++;
  const clauses =
    (instruction.match(/\b(and|then|also|plus|as well as|after that)\b/gi) || []).length +
    (instruction.match(/[;,]/g) || []).length;
  if (clauses >= 2) score++;
  if (clauses >= 4) score++;
  if (MULTI_SCOPE.test(instruction) || BIG_REWORK.test(instruction)) score++;
  return score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low';
}

function heuristicTier(instruction) {
  const critical = MISSION_CRITICAL.test(instruction);
  const multi = MULTI_SCOPE.test(instruction);
  const rework = BIG_REWORK.test(instruction);
  const logic = NEW_LOGIC.test(instruction);
  const surface = STYLE_COPY.test(instruction) || EXISTING_COMPONENT.test(instruction);

  if (critical) return { tier: 3, critical: true, confident: true };
  if ((multi || rework) && (logic || rework || complexityOf(instruction) === 'high'))
    return { tier: 3, critical: false, confident: true };
  if (logic) return { tier: 2, critical: false, confident: true };
  if (surface) return { tier: 1, critical: false, confident: true };
  // no signal at all — default to the cheap tier but flag for the LLM tiebreak
  return { tier: 1, critical: false, confident: false };
}

// --- Layer 2: Haiku classifier for ambiguous requests ----------------------

const CLASSIFY_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    tier: { type: 'integer', enum: [1, 2, 3] },
    complexity: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
  required: ['tier', 'complexity'],
  additionalProperties: false,
});

function llmClassify(instruction, cwd) {
  return new Promise((resolve) => {
    const prompt = [
      'Classify this UI change request for model routing. Reply with JSON only.',
      'tier 1: visual tweaks, styles, copy edits, or rearranging existing components.',
      'tier 2: new logic or functionality within one area (handlers, state, forms, data fetching).',
      'tier 3: multi-feature or cross-cutting work, or anything touching auth/payments/data/security.',
      'complexity: low = one small change; medium = a few steps; high = many steps or broad scope.',
      `Request: "${instruction.slice(0, 400)}"`,
    ].join('\n');
    const child = spawn(
      'claude',
      ['-p', prompt, '--model', 'haiku', '--effort', 'low', '--json-schema', CLASSIFY_SCHEMA, '--output-format', 'json'],
      { cwd, env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: undefined } }
    );
    let out = '';
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 15000);
    timer.unref?.();
    child.stdout.on('data', (d) => (out += d));
    child.on('close', () => {
      clearTimeout(timer);
      try {
        const envelope = JSON.parse(out);
        // --json-schema puts the validated object in structured_output
        const parsed =
          envelope.structured_output ??
          (typeof envelope.result === 'string' && envelope.result ? JSON.parse(envelope.result) : envelope.result);
        if (parsed && [1, 2, 3].includes(parsed.tier)) return resolve(parsed);
      } catch { /* fall through */ }
      resolve(null);
    });
    child.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

// --- Route resolution -------------------------------------------------------

const EFFORT = {
  1: { low: 'low', medium: 'medium', high: 'high' },
  2: { low: 'medium', medium: 'high', high: 'xhigh' },
};

function resolveRoute(tier, complexity, critical, source) {
  if (tier === 3) {
    const frontier = critical || complexity === 'high';
    return {
      tier,
      complexity,
      model: frontier ? MODELS.t3Critical : MODELS.t3,
      // Fable's thinking is always on; effort still scales depth. Opus tier-3
      // runs at xhigh — the setting recommended for the hardest agentic work.
      effort: frontier ? 'high' : 'xhigh',
      kind: critical ? 'mission-critical' : 'multi-feature',
      source,
    };
  }
  return {
    tier,
    complexity,
    model: tier === 1 ? MODELS.t1 : MODELS.t2,
    effort: EFFORT[tier][complexity],
    kind: tier === 1 ? 'tweak' : 'feature',
    source,
  };
}

/**
 * Route an instruction to {tier, complexity, model, effort}. Async because
 * ambiguous requests may consult the Haiku classifier (hybrid mode).
 */
export async function classify(instruction, { cwd } = {}) {
  const mode = process.env.CMDZERO_ROUTER || 'hybrid';
  const h = heuristicTier(instruction);
  let tier = h.tier;
  let critical = h.critical;
  let complexity = complexityOf(instruction);
  let source = 'heuristic';

  const wantLLM = mode === 'llm' || (mode === 'hybrid' && !h.confident);
  if (wantLLM) {
    const llm = await llmClassify(instruction, cwd);
    if (llm) {
      tier = llm.tier;
      complexity = llm.complexity;
      critical = critical || (llm.tier === 3 && MISSION_CRITICAL.test(instruction));
      source = 'llm';
    }
  }
  return resolveRoute(tier, complexity, critical, source);
}

/** Synchronous heuristic-only classification (used by tests and dry runs). */
export function classifySync(instruction) {
  const h = heuristicTier(instruction);
  return resolveRoute(h.tier, complexityOf(instruction), h.critical, 'heuristic');
}

export function buildPrompt({ file, target, instruction, tailwind = true }) {
  const styleRule = tailwind
    ? 'use Tailwind classes for styling'
    : "this project does NOT use Tailwind — match the file's existing styling approach (inline styles, CSS variables, or the project's stylesheets)";
  return [
    `You are making a surgical UI edit in a React codebase.`,
    `Edit ONLY this file: ${file}`,
    `The user selected this element (lines ${target.lines.start}-${target.lines.end}):`,
    '```jsx',
    target.snippet,
    '```',
    `Instruction: ${instruction}`,
    `Rules: ${styleRule}, keep the change minimal and scoped to the selected element (and directly related code in the same file), do not reformat unrelated code, do not touch any other file.`,
    'The file must remain valid JSX after your edit — in particular, if you add a sibling element at the root of a component return, wrap the siblings in a fragment (<>...</>).',
  ].join('\n');
}

/**
 * Spawn a headless claude run. `onSpawn` receives the child process so the
 * caller can register it for cancellation. If cancelled (child killed), the
 * promise resolves with { ok: false, cancelled: true }.
 */
export function runClaude({ prompt, model, effort, cwd, onEvent, onSpawn }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const args = [
      '-p',
      prompt,
      '--model',
      model,
      '--allowedTools',
      'Read,Edit',
      '--permission-mode',
      'acceptEdits',
      '--output-format',
      'json',
    ];
    if (effort) args.push('--effort', effort);
    const child = spawn(
      'claude',
      args,
      // detached → the child leads its own process group, so cancelling can
      // signal the whole group (claude + any tool subprocesses it spawns).
      // Killing only the top process orphans children that keep stdio pipes
      // open, which would stall the 'close' event and the restore that follows.
      { cwd, env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: undefined }, detached: true }
    );
    let cancelled = false;
    const signalGroup = (sig) => {
      try { process.kill(-child.pid, sig); } // negative pid = process group
      catch { try { child.kill(sig); } catch {} } // fall back to the single process
    };
    child.__cancel = () => {
      cancelled = true;
      signalGroup('SIGTERM');
      setTimeout(() => { if (!child.killed) signalGroup('SIGKILL'); }, 1500).unref?.();
    };
    onSpawn?.(child);
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      const durationMs = Date.now() - started;
      if (cancelled) {
        resolve({ ok: false, cancelled: true, durationMs });
        return;
      }
      if (code !== 0) {
        resolve({ ok: false, error: err.trim() || `claude exited ${code}`, durationMs });
        return;
      }
      let meta = {};
      try {
        const parsed = JSON.parse(out);
        meta = {
          costUSD: parsed.total_cost_usd,
          turns: parsed.num_turns,
          result: parsed.result,
        };
      } catch {
        meta = { result: out.slice(0, 500) };
      }
      resolve({ ok: true, durationMs, ...meta });
    });
    child.on('error', (e) => {
      resolve({ ok: false, error: `failed to spawn claude: ${e.message}` });
    });
    onEvent?.({ status: 'running', model });
  });
}
