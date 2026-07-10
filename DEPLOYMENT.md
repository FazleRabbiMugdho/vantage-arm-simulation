# DEPLOYMENT.md — Vantage Robotics Simulation Suite

## Deployment target
**Vercel** (free tier) — single deployment for the Next.js App Router app.

## Environment variables
No environment variables are required for the core pipeline (Phases 1–5). The following are placeholders for the optional Phase 3B agentic bonus only:

```
# GEMINI_API_KEY=   # Optional: for Phase 3B agentic voice (Gemini Flash function-calling)
# GROQ_API_KEY=     # Optional: fallback for Phase 3B
```

Both are commented out by default. The core app (Phases 1–5, 100% of rubric) runs entirely client-side with zero backend dependencies.

## Pre-deploy checklist
1. Run `npm run build` — must complete with zero errors.
2. Remove or justify all `console.log` debug statements in production code.
3. Confirm every `process.env` reference has a corresponding entry in `.env.example`.
4. Resolve all `TODO`/`FIXME` comments.
5. Verify no `.env` or `.env.local` is tracked by git.

## Demo safety
- The app is fully self-contained client-side for all core rubric items.
- The Phase 3B agentic bonus includes a hardcoded fallback exchange so the feature can be demoed even if the live Gemini API is rate-limited or unreachable.

## Post-deploy
- Test the live URL from a different device/network than the development machine.
- Confirm all five control surfaces (joystick, keyboard, voice, autonomous PIN, agentic) work in the deployed environment.
- Test that Web Speech API microphone permission works in the deployed context (HTTPS required).

## Commands
```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Start production server locally
vercel --prod      # Deploy to Vercel
```
