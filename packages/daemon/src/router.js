import { spawn } from 'node:child_process';

// Behavior verbs only — visual states like "on hover"/"on focus" are style
// (Tailwind variants), not functionality.
const FUNCTIONALITY = /(click|toggle|open|close|submit|fetch|load|save|state|counter|count|when |scroll to|navigate|link to|form|validate|sort|filter|search|api|localstorage|modal|dropdown|expand|collapse|disable|enable|animate|animation|add a |remove the )/i;

/**
 * Route a natural-language tweak to a model tier.
 * Style/copy → fast model, functionality → reasoning model.
 * Overridable via TWEAKLOCAL_FAST_MODEL / TWEAKLOCAL_SMART_MODEL.
 */
export function classify(instruction) {
  const isFunc = FUNCTIONALITY.test(instruction);
  return {
    kind: isFunc ? 'functionality' : 'style/copy',
    model: isFunc
      ? process.env.TWEAKLOCAL_SMART_MODEL || 'sonnet'
      : process.env.TWEAKLOCAL_FAST_MODEL || 'haiku',
  };
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
export function runClaude({ prompt, model, cwd, onEvent, onSpawn }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(
      'claude',
      [
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
      ],
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
