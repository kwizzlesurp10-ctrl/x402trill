# AGENTS.md — x402trill / AETHERWEB

Operating instructions for agents working in this repository.

## North star

**Real organic agent-commerce profit is concentrated and small vs hype.** Near-term capture is in high-frequency, high-utility primitives agents already call repeatedly:

1. **Inference routing** — LiteLLM, agentgateway  
2. **Clean structured data** — paid MCPs / marketplaces  
3. **Social / reputation feeds** — SwarmFeed, Nostr stacks  
4. **Payment reliability + discovery** — x402 + MCP/A2A gateways  

Prefer **rails over vertical agents**. Vertical products commoditize; tollbooth infrastructure compounds over 6–18 months.

Canonical research:

- `docs/research/mythic_agent_profit_layers_20260812.json`
- `docs/research/mythic_aetherweb_agent_profit_site_spec_20260812.json`

Public research oracle (single-file):

- `aetherweb/index.html`

Paid MCP gateway (Stage 1 reference implementation):

- `paid-mcp/` — x402-paid tools: `route_inference` + `clean_data_feed` (MCP + HTTP, facilitator, budgets, receipts)
- Run: `cd paid-mcp && npm install && npm start` (default `DEMO_MODE=true`)
- Smoke: `cd paid-mcp && npm run smoke`
- Live wallet client: `PRIVATE_KEY=0x... npm run live:client -- route_inference` (server `DEMO_MODE=false`)
- Deploy: `paid-mcp/DEPLOY.md`, `docker compose up --build`
- Live env: `DEMO_MODE=false`, `X402_PAY_TO` (or `PAY_TO`), `FACILITATOR_URL`, `NETWORK=eip155:8453`
- AETHERWEB oracle defaults `payBase` → `http://127.0.0.1:4021` (override `?payBase=`)

Legacy product in-repo (do not conflate with AETHERWEB):

- `webapp/` — Minnesota compliance Next.js app

## Stack defaults (FOSS primacy)

| Concern | Default |
|--------|---------|
| Payments | x402 (USDC on Base / `eip155:8453`) |
| Inference proxy | LiteLLM (self-host) |
| Agent connectivity | agentgateway (MCP + A2A) |
| Social / rep | SwarmFeed + Nostr |
| Landing / research UI | Single-file HTML + Tailwind CDN + vanilla JS |
| Hosting oracle | Static file (any static host / `python -m http.server`) |

No closed design systems. No mandatory commercial CDNs beyond optional Tailwind/fonts for the oracle.

## AETHERWEB regeneration

1. Update or replace the ResearchForge JSON under `docs/research/`.  
2. Mirror the payload into the `RESEARCH` object in `aetherweb/index.html`.  
3. Adjust `CONFIG` (webhook, pay endpoint, payTo address) for production.  
4. Open `aetherweb/index.html` — no build step.  
5. Optional: run skill `/aetherweb-singlefile-research-oracle` to regenerate the page from JSON.

Target: full page refresh from new research in under 30 seconds of agent time.

## Skill evolution path

| Skill | Stage | Job |
|-------|-------|-----|
| `aetherweb-singlefile-research-oracle` | Now | Research JSON → single HTML oracle |
| `x402-paid-mcp-gateway` | Now (spec) | Wrap high-utility MCP with x402 pay + receipts |
| Inference-Routing-Meter | Next | Paid LiteLLM/agentgateway surface |
| Agent-Social-Feed-Ingestor | Next | Nostr/SwarmFeed MCP with trust scoring |

Evolution for paid gateway: **single paid tool → multi-rail router → reputation registry → marketplace**.

## Coding norms in this repo

- **Do not break `webapp/` CI** unless the task is about that app.  
- Prefer additive work under `aetherweb/`, `docs/`, `.grok/skills/`.  
- Keep the research oracle **one HTML file** unless the user explicitly lifts the constraint.  
- Accessibility: skip link, keyboard focus, ARIA on filters/meters, `prefers-reduced-motion`.  
- Never invent live payment settlement as real money without a configured facilitator + wallet; demo mode is local-only.

## Contradiction discipline

Always hold both:

- Headline x402 volume can be inflated (probes, loops, wash).  
- Organic paid utility remains scarce and high-margin.

Act on **reliability + discoverability + high-frequency utility**, not raw txn chase.

## Quick commands

```bash
# Oracle
python3 -m http.server 8765 --directory aetherweb

# Webapp (unrelated product surface)
cd webapp && npm install && npm run dev
```

## Out of scope unless asked

- Agency-style multi-page marketing sites  
- Closed payment processors as primary rails  
- Replacing FOSS stack with SaaS wrappers without FOSS escape hatch  
