# CmdZero

Tweak your UI live in the browser — the changes are written straight to your source files.

- **Copy**: click any text, edit in place, Enter. Written to the JSX literal. 0 tokens.
- **Style**: padding/margin per side, font sizes and colors from *your* design system tokens. Deterministic Tailwind class edits. 0 tokens.
- **Reorder**: every selected section/card gets a move toolbar — arrows (`↑↓` for columns, `←→` for rows) or drag the `⠿` grip. Cards in a `.map()` reorder the backing array; written-out siblings swap in place; a section's outer container moves the whole `<Section/>` among its siblings in the page. 0 tokens.
- **Anything else**: describe it — a layered router picks a model *and* an effort level sized to the request, then runs headless `claude -p` scoped to the exact file your selection maps to.

Changes show live automatically — the overlay reloads the page (preserving scroll + selection) after a write settles, so HMR gaps (module-scope consts, structural edits) never need a manual refresh. Toggle it bottom-left.

## Model routing

| Tier | What it covers | Model | Effort (by complexity) |
|---|---|---|---|
| 1 | Styles, copy, component tweaks, existing components | `claude-sonnet-5` | low / medium / high |
| 2 | New logic & functionality (handlers, state, forms, data) | `claude-opus-4-8` | medium / high / xhigh |
| 3 | Multi-feature or cross-cutting work | `claude-opus-4-8` | xhigh |
| 3+ | Mission-critical (auth, payments, data, security) or very high complexity | `claude-fable-5` | high |

Routing is layered (RouteLLM-style): deterministic lexicon + structure scoring first (<1ms, free); requests with no clear signal fall through to a Haiku classifier with structured output (~1–3s, ~$0.001). Inspect any routing decision without running it: `POST /api/classify {"instruction": "..."}`.

Overrides: `CMDZERO_T1_MODEL`, `CMDZERO_T2_MODEL`, `CMDZERO_T3_MODEL`, `CMDZERO_T3_CRITICAL_MODEL`, and `CMDZERO_ROUTER=heuristic|hybrid|llm` (default `hybrid`).

## Quickstart (Next.js)

```sh
npm i -D cmdzero @cmdzero/react
```

1. `jsconfig.json` / `tsconfig.json`:
   ```json
   { "compilerOptions": { "jsxImportSource": "@cmdzero/react" } }
   ```
2. Root layout:
   ```jsx
   import { CmdZeroOverlay } from '@cmdzero/react';
   // inside <body>: {children}<CmdZeroOverlay />
   ```
3. Run the daemon next to your dev server, from the project root:
   ```sh
   npx cmdzero
   ```
4. Open your app, press `⌘0`, click anything.

Works with Turbopack, webpack, and Vite — stamping happens in React's dev JSX runtime, not the bundler. Server components included. Production builds are untouched (the prod runtime is a passthrough).

## Telemetry

The daemon sends anonymous usage telemetry: package version, node version, OS platform, whether Tailwind was detected, and per-lane tweak counts. **Never** code, file paths, file names, prompts, or anything identifying. A disclosure prints the first time the daemon runs.

Opt out permanently:

```sh
export CMDZERO_TELEMETRY=0   # or DO_NOT_TRACK=1 — both respected
```

## Options

- `npx cmdzero --port 4101` (+ `<CmdZeroOverlay origin="http://localhost:4101" />`)
- `CMDZERO_FAST_MODEL` / `CMDZERO_SMART_MODEL` — model aliases for the router (default `haiku` / `sonnet`)
- `CMDZERO_BASELINE_COST` / `CMDZERO_BASELINE_MS` — baseline for the savings counter
- Natural-language tweaks require the [Claude Code CLI](https://claude.com/claude-code) (`claude`) on your PATH; copy/style lanes work without it.
