# CmdZero

<p align="center">
  <img src="https://raw.githubusercontent.com/adamcwade/cmdzero/main/assets/hero.png" alt="CmdZero — live in-browser UI editing with a style panel, inline copy editing, and a token-savings banner" width="900">
</p>

<p align="center">
  <strong><a href="https://cmdzero.xyz/demo">▶︎ Try the live demo — no install</a></strong>
</p>

Press `⌘0` and edit a real page with the real overlay, running entirely in your browser. Copy, style, reorder, delete and undo all work; natural-language prompts are scripted (no model is called) and nothing is written to disk.

Tweak your UI live in the browser. Select any element, edit copy in place, nudge styles, or describe a change — cmdzero knows exactly which source file and line each element came from, so most tweaks cost **zero tokens** and the rest run through a model sized to the job.

## How it works

- **`@cmdzero/react`** — set `"jsxImportSource": "@cmdzero/react"` and React's dev JSX runtime stamps every host element with `data-cz="<file>:<line>:<col>"`. Bundler-agnostic (Turbopack, webpack, Vite), server components included, zero production impact.
- **`cmdzero`** (CLI/daemon) — `npx cmdzero` beside your dev server:
  - resolves a stamp to the exact AST node (element span, text literals, className) via `@babel/parser`
  - **copy edits** and **Tailwind class edits** are written straight to source — 0 tokens
  - **natural-language tweaks** are classified (style/copy → `haiku`, functionality → `sonnet`) and executed by spawning headless `claude -p` scoped to the one mapped file, with post-edit JSX validation, one retry, and auto-revert
  - per-tweak undo, SSE status events, persistent savings ledger (`.cmdzero/savings.json`)
- **Overlay** (served by the daemon): `⌘0` select mode → hover badges → green-bordered popover with copy editing, per-side padding/margin, font sizes and color swatches read from *your* design-system tokens, radius/shadow chips, NL input → tweak tray with model, cost, and estimated savings.
- **`@cmdzero/babel-plugin`** — alternative build-time stamping for setups where changing `jsxImportSource` isn't an option.

## Add to your Next.js app

```sh
npm i -D cmdzero @cmdzero/react
```

1. `jsconfig.json` / `tsconfig.json` → `{ "compilerOptions": { "jsxImportSource": "@cmdzero/react" } }`
2. Root layout → `import { CmdZeroOverlay } from '@cmdzero/react'` and render `<CmdZeroOverlay />` at the end of `<body>`
3. `npx cmdzero` from the project root, then open your app and press `⌘0`

(Pre-publish, install from tarballs: `npm i -D ./dist-packages/cmdzero-0.1.0.tgz ./dist-packages/cmdzero-react-0.1.0.tgz`)

Vite works the same way — pass `jsxImportSource: '@cmdzero/react'` to `@vitejs/plugin-react` (or use `@cmdzero/babel-plugin` as in [apps/demo/vite.config.js](apps/demo/vite.config.js)).

## Repo layout

- `packages/daemon` — the `cmdzero` npm package (CLI, resolver, model router, overlay assets)
- `packages/react` — `@cmdzero/react` (dev JSX runtime stamping + `<CmdZeroOverlay />`)
- `packages/babel-plugin` — `@cmdzero/babel-plugin` (build-time stamping alternative)
- `packages/benchmark` — tokens/latency/cost harness ([results](packages/benchmark/results.md))
- `apps/demo-next` — Next.js 15 test bed (server + client components)
- `apps/demo` — Vite + React test bed
- `dist-packages/` — `npm pack` tarballs

## Run the demos

```sh
pnpm install
pnpm dev:daemon      # daemon on :4100 (run from the app dir you're editing)
pnpm dev:next        # Next demo on :3001
pnpm dev:demo        # Vite demo on :5173
```

## Benchmark (demo repo, 4 edits, all correct)

| | Baseline unscoped agent | cmdzero |
|---|---|---|
| Copy/style tweaks | ~19s · ~137k tok · ~$0.10 each | **ms · 0 tok · $0** |
| NL style tweak | 16.3s · $0.084 (sonnet) | 16.0s · **$0.032 (haiku)** |
| Total (4 edits) | 72s · 495k tok · $0.375 | 34s · 196k tok · **$0.118** |

## Roadmap

- Publish to npm (`cmdzero`, `@cmdzero/react` — names verified available)
- Real-repo benchmark (~500-file app) for launch
- Diff-based per-tweak undo (current undo restores whole-file snapshots)
- Blast-radius scope prompt (instance vs shared component vs token)
- Attached-agent mode via MCP; landing page + pricing
