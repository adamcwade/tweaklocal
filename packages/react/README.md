# @cmdzero/react

Dev-time JSX source stamping for [CmdZero](https://www.npmjs.com/package/cmdzero).

Set `"jsxImportSource": "@cmdzero/react"` in your ts/jsconfig and every rendered host element carries `data-cz="<file>:<line>:<col>"` in development — the ground truth the CmdZero overlay and daemon use to map any pixel back to its exact JSX expression.

- Bundler-agnostic: Turbopack, webpack, Vite, esbuild — anything that emits the standard `jsxDEV` dev runtime calls.
- Server components supported (the attribute serializes to HTML).
- Zero production impact: the prod `jsx-runtime` is a passthrough and prod builds carry no source info.

Also exports `<CmdZeroOverlay />` — drop it at the end of your root layout to load the CmdZero overlay in dev (renders nothing in production).
