# fastui benchmark

Baseline: unscoped `claude -p --model sonnet` with Read/Edit/Glob/Grep in `apps/demo` (agent must locate the code). fastui: zero-token deterministic lane, or scoped prompt + routed model with Read/Edit only.

| Task | Baseline | fastui | Token reduction |
|---|---|---|---|
| copy: rewrite hero headline | ✅ 18.4s · 136986 tok · $0.106 | ✅ 0.0s · 0 tok · $0.000 (—) | 100% |
| style: bump section heading size | ✅ 19.3s · 137064 tok · $0.092 | ✅ 0.0s · 0 tok · $0.000 (—) | 100% |
| style NL: glow on Book a demo | ✅ 16.3s · 109787 tok · $0.084 | ✅ 16.0s · 84749 tok · $0.032 (haiku) | 23% |
| functionality NL: confirmation state on CTA | ✅ 18.4s · 111434 tok · $0.093 | ✅ 18.4s · 111031 tok · $0.087 (sonnet) | 0% |
| **Total** | 72s · 495271 tok · $0.375 | 34s · 195780 tok · $0.118 | **60%** |
