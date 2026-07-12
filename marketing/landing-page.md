# TweakLocal — Landing Page Copy

> Voice notes: written for frontend developers who already use AI coding agents. Direct, technical, lightly wry. No buzzwords, no exclamation points, every claim backed by a mechanism or a number. Headlines can be bold; body copy stays precise. "We/your" voice, present tense.

---

## Above the fold

**Headline:**
# Stop describing your UI to an AI. Point at it.

**Subheadline:**
TweakLocal maps every element in your running app to its exact line of source. Click the thing, change the thing — copy and style edits land in your code instantly, with zero AI involved. The rest goes to a model sized for the job.

**Primary CTA:** `npm i -D tweaklocal @tweaklocal/react` *(copy-to-clipboard button)*

**Secondary CTA:** Star on GitHub

**Hero visual:** 20-second screen recording — select headline, edit text in place, nudge padding, type "make this button feel premium," savings counter ticking in the corner.

---

## Stat strip (below hero)

**0 tokens** — for copy and style tweaks · **&lt;10ms** — from click to code · **69% cheaper** — same edits vs. an unscoped agent session · **1 attribute** — of production impact (that's zero)

*(Numbers from the [benchmark](../packages/benchmark/results.md); update with real-repo results before launch.)*

---

## Problem section

### The 40-second padding tweak

You know this loop. You tell your agent "a bit more padding on the pricing card." It greps the repo. Reads four files. Thinks. Twenty seconds and 137,000 tokens later, it edits the right one — probably. Then you look at the result and say "hmm, a bit less."

You just paid twice for an edit you could describe with one keystroke — if your tools knew *which* card, in *which* file, on *which* line.

TweakLocal knows. That's the whole product.

---

## How it works

### Three steps, ninety seconds

**1. Install**
```sh
npm i -D tweaklocal @tweaklocal/react
```

**2. Point React's dev runtime at TweakLocal**
```json
// tsconfig.json or jsconfig.json
{ "compilerOptions": { "jsxImportSource": "@tweaklocal/react" } }
```
```jsx
// app/layout.tsx — at the end of <body>
import { TweakLocalOverlay } from '@tweaklocal/react';
<TweakLocalOverlay />
```

**3. Run it next to your dev server**
```sh
npx tweaklocal
```

Open your app. Press `⌘.` and click anything.

*No bundler config. Works with Turbopack, webpack, and Vite — stamping happens in React's dev JSX runtime, so server components map too. Production builds get a passthrough: zero bytes, zero overhead.*

---

## The three lanes

### Copy: click, type, done
Click any text and edit it in place. Enter writes it to the JSX literal — the actual source file, not a CMS shadow copy. **0 tokens, 0 API calls.**

### Style: your design system, on tap
Padding and margin per side. Font sizes and color swatches read from *your* Tailwind theme — the tokens your app actually uses, not a generic picker. Every change is a deterministic class edit in your source. **0 tokens.**

### Everything else: describe it, routed right
"Make this button show a confirmation state when clicked." TweakLocal classifies the request — style and copy go to a fast model, functionality to a reasoning model — and runs it scoped to the one file your selection maps to. No repo search, no context bloat. It validates the edit still parses, retries once if not, and reverts rather than leave your app broken.

---

## Trust section

### It's just your code

- **Every change is a normal git diff.** Review it, revert it, commit it. No proprietary sync layer.
- **Undo per tweak,** right from the tray.
- **Dev-only by construction.** The stamp lives in React's development runtime; production builds import a passthrough.
- **Scoped AI, when AI runs at all.** The model sees one file and your instruction — not your repo.
- **A running savings counter** shows what each tweak would have cost through an unscoped agent. Watch it add up; that's your invoice not happening. *(Want the receipts? Get a monthly savings report — email capture, see below.)*
- **Telemetry that announces itself.** Anonymous usage counts only — version, OS, tweak counts. Never code, paths, or prompts. Disclosed on first run, disabled with one env var (`TWEAKLOCAL_TELEMETRY=0`), and `DO_NOT_TRACK` is respected.

---

## FAQ

**Does this replace my coding agent?**
No — it feeds it. Claude Code does the heavy lifting for functionality changes; TweakLocal gives it surgical context instead of a treasure hunt. And for the majority of UI tweaks, no agent is needed at all.

**What do I need for the AI lane?**
The Claude Code CLI on your PATH. Copy and style lanes work without it.

**Does it work with my design system?**
If your tokens are in CSS (Tailwind v4 theme variables today), TweakLocal reads them from the running page. Your swatches are your palette.

**What about CSS Modules / styled-components?**
Tailwind class edits are deterministic today; other styling systems route through the AI lane. Deeper attribution is on the roadmap.

**Next.js only?**
Next.js and Vite today — anything that emits React's standard dev JSX runtime. Remix/React Router support is planned.

**What does telemetry collect?**
Version, OS, and how many tweaks ran per lane — that's the whole payload. No code, no file paths, no prompts, no identity. It's disclosed the first time the daemon runs, `TWEAKLOCAL_TELEMETRY=0` turns it off forever, and we respect `DO_NOT_TRACK=1`. It exists so we know which frameworks to support next.

---

## Pricing

*(Strategy: free during beta to drive adoption; the paid tiers monetize the workflow, not the inference — users bring their own Claude. Publish tiers at launch, gate nothing during beta except team features.)*

### Free — forever, for solo dev loops
Local overlay, all three lanes, bring your own Claude. The core stays free because your padding tweak should never have cost money in the first place.

### Pro — $15/dev/month
Design-system panels, model routing configuration, savings analytics, priority support. *For developers who polish UI every day and want the numbers to prove it.*

### Team — $40/seat/month
Preview-deploy tweaking: designers and PMs point at staging, their tweaks arrive as PRs your engineers approve. Audit trail, SSO. *UI polish stops being a ticket queue.*

**Beta note:** everything is free while we're in beta. Early users get grandfathered Pro pricing.

---

## Email capture (waitlist + savings report)

*(One field, two placements. This list is the launch asset — every address here is a developer who already cares.)*

**Placement 1 — below the hero install command:**
> **Get the changelog + Pro early access.** One email when something ships. No drip sequence, no "just checking in."
> `[you@company.dev] [Keep me posted]`

**Placement 2 — the savings report (linked from the in-app tray):**
> ### Your polish pass, itemized
> TweakLocal already counts what every tweak would have cost through an unscoped agent. Get the monthly rollup: tweaks shipped, tokens avoided, dollars saved. One email a month, made of your own numbers.
> `[you@company.dev] [Send my savings report]`

*(Annotation: placement 2 converts because the user arrives from the tray already looking at their number — the email is a continuation of value, not an interruption. Both feed one list, tagged by source.)*

---

## Final CTA

### Your next padding tweak takes four milliseconds

```sh
npm i -D tweaklocal @tweaklocal/react
```

Press `⌘.` and click anything.

---

## Annotations

- **Headline** attacks the real pain (describing UI in prose) rather than claiming a category ("visual editor") that devs distrust. "Point at it" is the product's whole interaction model in three words.
- **Zero-token claim leads everywhere** because it's the falsifiable differentiator — competitors are "AI editors"; TweakLocal's story is *less* AI, used precisely.
- **Install command as CTA**: for dev tools, `npm i` converts better than "Get Started" — it's the first step of activation, not a signup wall.
- **The 40-second story** mirrors voice-of-customer (agent round-trip frustration) and sets up the benchmark numbers as the punchline.
- **Trust section** exists because the audience's #1 objection to anything that writes code is safety; every bullet names a mechanism, not a promise.
- **Pricing rationale** shown to the team here (italic notes) — strip the notes for the public page.

### Headline alternatives
- A: **Stop describing your UI to an AI. Point at it.** — pain-first, names the enemy behavior.
- B: **Your padding tweak doesn't need 137,000 tokens.** — benchmark-specific, wry; great for the ad/tweet variant.
- C: **Click the element. Ship the diff.** — mechanism-first, tighter, weaker on pain.

### CTA alternatives
- A: `npm i -D tweaklocal @tweaklocal/react` (copy button) — activation-first.
- B: **Watch the 20-second demo** — for cold traffic that needs proof before install.
- C: **Tweak your first element** — docs-quickstart framing.

### Meta
- **Title:** TweakLocal — point at your UI, ship the diff
- **Description:** Tweak your running app in the browser and write the changes straight to source. Copy and Tailwind edits cost zero tokens; everything else routes to a right-sized model. Next.js and Vite.
