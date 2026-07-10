# Build Log — Problems & Solutions

Add entries here whenever a prompt fails its verification checklist or
you hit an unexpected bug. The goal is to never fix the same thing twice.

## Template

```
## YYYY-MM-DD — Problem title

**Prompt:** [prompt number / phase]
**Symptoms:** what actually happened (error message, wrong behavior, crash)
**Root cause:** why it happened (one paragraph max)
**Solution:** what fixed it (code change, config change, approach switch)
**Prevention:** how to avoid this in future prompts or how to catch it earlier
```

---

## Entries

## 2026-07-10 — urdf-loader peer dependency conflict with three.js

**Prompt:** 2 (Scaffold)
**Symptoms:** `npm install` failed with ERESOLVE — `urdf-loader@0.6.3` requires `three@^0.94.0` but we specified `three@^0.169.0`.
**Root cause:** package.json pinned `urdf-loader` at `^0.6.0`, which is a very old version. The latest is `0.13.0`.
**Solution:** Updated `urdf-loader` version to `^0.13.0` in package.json. Re-ran `npm install` — success.
**Prevention:** Always check the latest npm version of urdf-loader before specifying. If using `^0.6.0` again, pair with `three@^0.94.0`. No other peer dep issues found.
