import { spawn } from 'node:child_process';

// Behavior verbs only — visual states like "on hover"/"on focus" are style
// (Tailwind variants), not functionality.
const FUNCTIONALITY = /(click|toggle|open|close|submit|fetch|load|save|state|counter|count|when |scroll to|navigate|link to|form|validate|sort|filter|search|api|localstorage|modal|dropdown|expand|collapse|disable|enable|animate|animation|add a |remove the )/i;

/**
 * Route a natural-language tweak to a model tier.
 * Style/copy → fast model, functionality → reasoning model.
 * Overridable via FASTUI_FAST_MODEL / FASTUI_SMART_MODEL.
 */
export function classify(instruction) {
  const isFunc = FUNCTIONALITY.test(instruction);
  return {
    kind: isFunc ? 'functionality' : 'style/copy',
    model: isFunc
      ? process.env.FASTUI_SMART_MODEL || 'sonnet'
      : process.env.FASTUI_FAST_MODEL || 'haiku',
  };
}

export function buildPrompt({ file, target, instruction }) {
  return [
    'You are making a surgical UI edit in a codebase that uses React and Tailwind CSS.',
    `Edit ONLY this file: ${file}`,
    `The user selected this element (lines ${target.lines.start}-${target.lines.end}):`,
    '```jsx',
    target.snippet,
    '```',
    `Instruction: ${instruction}`,
    'Rules: use Tailwind classes for styling, keep the change minimal and scoped to the selected element (and directly related code in the same file), do not reformat unrelated code, do not touch any other file.',
  ].join('\n');
}

export function runClaude({ prompt, model, cwd, onEvent }) {
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
      { cwd, env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: undefined } }
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      const durationMs = Date.now() - started;
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
