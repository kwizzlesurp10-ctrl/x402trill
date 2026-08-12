---
name: x402-paid-mcp-gateway
description: >
  Design or implement an x402-paid MCP gateway: wrap high-utility tools (inference,
  clean data, social feeds) so agents can discover, pay (USDC/Base), call, and receive
  receipts under budget controls. Use when the user runs /x402-paid-mcp-gateway, asks
  for paid MCP, x402 middleware, agent micropayments, or skill-pack implementation.
---

# x402-Paid-MCP-Gateway

## Goal

Ship (or specify) a **single high-utility MCP tool** behind HTTP-native x402 payment, then evolve toward multi-rail routing and discovery.

Thesis alignment (see `AGENTS.md` + `docs/research/mythic_agent_profit_layers_20260812.json`):

- Charge for **high-frequency** resources agents already need  
- Optimize for **reliability + receipts + budgets**, not vanity volume  
- Stay **FOSS-first** (x402 protocol, open MCP servers)

## Build order (0–90 days)

1. **Pick one utility** with clear per-call value  
   - Examples: cost-aware model route, structured price/news feed, reputation-scored social query  
2. **Implement MCP tool** with deterministic JSON output  
3. **Gate with x402**  
   - Missing payment → `402` + Payment Required (scheme `exact`, network e.g. `eip155:8453`, USDC asset, `payTo`, `maxAmountRequired`, resource URI)  
   - Client retries with payment signature / facilitator-verified proof  
4. **Receipt every success** — settlement id, amount, network, resource, timestamp  
5. **Budget controls** — per-agent max spend, soft deny with structured error  
6. **Discovery metadata** — name, price, schema, SLA hints for agentgateway / MCP clients  

## Evolution path

| Stage | Deliverable |
|-------|-------------|
| 1 | Single paid tool + demo receipt |
| 2 | Multi-rail router (x402 + fallbacks) + policy engine |
| 3 | Reputation-weighted discovery registry |
| 4 | Marketplace layer (multi-provider metering) |

## Implementation checklist

When coding:

- [ ] No secrets in browser-only demos; server holds payee keys / facilitator config  
- [ ] Idempotent paid handlers (same payment proof → same result or clear replay policy)  
- [ ] Structured errors: `PAYMENT_REQUIRED`, `BUDGET_EXCEEDED`, `FACILITATOR_UNAVAILABLE`  
- [ ] Logging of spend without leaking full wallet keys  
- [ ] FOSS license on gateway code (MIT/Apache preferred)  
- [ ] Link from AETHERWEB skill pack / research oracle when relevant  

## Reference surfaces in this repo

- **Implementation:** `paid-mcp/` — Express + MCP Streamable HTTP, `@x402/mcp` payment wrapper, demo/live facilitator, budgets, JSONL receipts, tools `route_inference` + `clean_data_feed`  
- **Clients:** `npm run live:client`, `npm run smoke`; live wallet via `PRIVATE_KEY` + `registerExactEvmScheme`  
- **Deploy:** `paid-mcp/Dockerfile`, `docker-compose.yml`, `DEPLOY.md`  
- UI demo of paywall semantics: `aetherweb/index.html` (`CONFIG.pay`, skill-pack gate)  
- Research defaults: `docs/research/mythic_agent_profit_layers_20260812.json`  
- Companion skills: `aetherweb-singlefile-research-oracle`, Inference-Routing-Meter (planned), Agent-Social-Feed-Ingestor (planned)

### paid-mcp runbook

```bash
cd paid-mcp && cp .env.example .env && npm install && npm test && npm start
```

- Free: `GET /health`, `GET /discovery`, MCP tools `ping` / `get_pricing`  
- Paid: MCP `route_inference` or `POST /v1/route-inference`  
- Demo mint: `POST /v1/demo/mint-payment` → attach `PAYMENT-SIGNATURE` or MCP `_meta["x402/payment"]`  
- Live: `DEMO_MODE=false`, set `PAY_TO` + `FACILITATOR_URL` (default Base Sepolia facilitator)

## Example invocation target

> Register paid inference-router MCP; agents pay `$0.001`/call via USDC on Base and receive structured response + receipt.

## Do not

- Claim live settlement without a configured facilitator and network  
- Price pure undifferentiated data at skill-level rates without reliability SLAs  
- Depend on closed payment APIs as the only rail (x402 remains primary)
