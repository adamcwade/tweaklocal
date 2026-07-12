# TweakLocal

Tweak your UI live in the browser — the changes are written straight to your source files.

- **Copy**: click any text, edit in place, Enter. Written to the JSX literal. 0 tokens.
- **Style**: padding/margin per side, font sizes and colors from *your* design system tokens. Deterministic Tailwind class edits. 0 tokens.
- **Anything else**: describe it — routed to a fast model for style/copy or a reasoning model for functionality (headless `claude -p`), scoped to the exact file your selection maps to.

## Quickstart (Next.js)

```sh
npm i -D tweaklocal @tweaklocal/react
```

1. `jsconfig.json` / `tsconfig.json`:
   ```json
   { "compilerOptions": { "jsxImportSource": "@tweaklocal/react" } }
   ```
2. Root layout:
   ```jsx
   import { TweakLocalOverlay } from '@tweaklocal/react';
   // inside <body>: {children}<TweakLocalOverlay />
   ```
3. Run the daemon next to your dev server, from the project root:
   ```sh
   npx tweaklocal
   ```
4. Open your app, press `⌘.`, click anything.

Works with Turbopack, webpack, and Vite — stamping happens in React's dev JSX runtime, not the bundler. Server components included. Production builds are untouched (the prod runtime is a passthrough).

## Telemetry

The daemon sends anonymous usage telemetry: package version, node version, OS platform, whether Tailwind was detected, and per-lane tweak counts. **Never** code, file paths, file names, prompts, or anything identifying. A disclosure prints the first time the daemon runs.

Opt out permanently:

```sh
export TWEAKLOCAL_TELEMETRY=0   # or DO_NOT_TRACK=1 — both respected
```

## Options

- `npx tweaklocal --port 4101` (+ `<TweakLocalOverlay origin="http://localhost:4101" />`)
- `TWEAKLOCAL_FAST_MODEL` / `TWEAKLOCAL_SMART_MODEL` — model aliases for the router (default `haiku` / `sonnet`)
- `TWEAKLOCAL_BASELINE_COST` / `TWEAKLOCAL_BASELINE_MS` — baseline for the savings counter
- Natural-language tweaks require the [Claude Code CLI](https://claude.com/claude-code) (`claude`) on your PATH; copy/style lanes work without it.
