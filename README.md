# x402trill monorepo

This repository holds:

1. **AETHERWEB** — single-file agent-commerce research oracle (`aetherweb/`)
2. **MN Compliance webapp** — production Next.js app (`webapp/`)

Agent operating instructions: see [`AGENTS.md`](./AGENTS.md). Research payloads: `docs/research/`.

## AETHERWEB Research Oracle

Static, FOSS-first landing page for the concentrated agent-profit thesis (filterable resources, contradictions, skill forge, waitlist, demo x402 skill-pack gate).

```bash
python3 -m http.server 8765 --directory aetherweb
# open http://localhost:8765
```

Regenerate `RESEARCH` from JSON:

```bash
node aetherweb/scripts/inject-research.mjs docs/research/mythic_agent_profit_layers_20260812.json
```

## Paid MCP gateway (`paid-mcp/`)

x402-paid high-utility tool: **cost-aware inference routing** (`route_inference`).

```bash
cd paid-mcp
cp .env.example .env   # DEMO_MODE=true by default
npm install && npm test && npm start
# health     http://127.0.0.1:4021/health
# discovery  http://127.0.0.1:4021/discovery
# MCP        http://127.0.0.1:4021/mcp
# paid HTTP  POST /v1/route-inference  (402 without payment)
```

Demo settle:

```bash
# mint demo payment, then call with PAYMENT-SIGNATURE header
curl -s -X POST http://127.0.0.1:4021/v1/demo/mint-payment -H 'content-type: application/json' -d '{}'
```

See `paid-mcp/README.md` and skill `/x402-paid-mcp-gateway`.

---

# MN Compliance Webapp

Production-ready Next.js application for Minnesota small business compliance checks.

## Repository Structure

```
repo-root/
├── .github/
│   ├── workflows/
│   │   └── ci.yml                       # CI: lint, type-check, test, build
│   ├── dependabot.yml
│   └── RELEASE_CHECKLIST.md
├── webapp/                              # The Next.js application (was mn-compliance-webapp/)
│   ├── app/
│   │   ├── actions/compliance.ts        # Server actions
│   │   ├── layout.tsx                   # Root layout + Vercel Analytics
│   │   └── page.tsx
│   ├── components/
│   │   ├── compliance/                  # Refactored, production-grade components
│   │   │   ├── ComplianceForm.tsx
│   │   │   ├── ProtectionRadar.tsx
│   │   │   ├── ResultsDisplay.tsx
│   │   │   ├── GrokPromptModal.tsx
│   │   │   └── index.ts
│   │   └── mn-compliance-home.tsx
│   ├── lib/compliance/
│   │   ├── schema.ts                    # Zod validation
│   │   ├── types.ts
│   │   ├── grok-prompt.ts
│   │   └── generate-mock-results.ts
│   ├── public/
│   ├── next.config.ts                   # outputFileTracingRoot for monorepo
│   ├── package.json
│   └── README.md                        # App-specific documentation
├── README.md                            # This file
└── .gitignore
```

## Why This Structure?

- The Next.js app lives in `webapp/` so the repository root can contain shared CI, GitHub configuration, and potentially other tools in the future.
- This is a common **monorepo-lite** pattern for Vercel + GitHub projects.
- We chose `webapp/` (instead of repeating the repo name) to avoid confusing long paths in CI runners and keep things clear.

## Local Development

```bash
cd webapp
npm install
npm run dev
```

Open http://localhost:3000

## Deployment (Vercel)

1. In Vercel, import this repository.
2. Set **Root Directory** to: `webapp`
3. Vercel will automatically detect Next.js and run `npm install` + `npm run build` inside that folder.
4. (Recommended) Add environment variable:
   - `NEXT_PUBLIC_SITE_URL` = your production URL

## CI / GitHub Actions

The workflow (`.github/workflows/ci.yml`) runs on every push and PR:

- Installs dependencies
- Runs lint + TypeScript check
- Runs Vitest tests
- Builds the production bundle

All steps use `working-directory: webapp`.

## Production Readiness

This repo includes:

- Dependabot configuration
- Release checklist
- Vercel Analytics + Speed Insights
- Clean component architecture (refactored from a 649-line file)
- Zod validation + server actions
- Type-safe, tested codebase

See `webapp/README.md` for full app documentation.

## Notes

- `.gitignore` is configured so only the relevant folders are tracked.
- If you add another top-level project later, extend `.gitignore` accordingly.