# @aetherweb/paid-mcp

**x402-Paid-MCP-Gateway** — Stage 1 reference implementation.

High-utility paid tool: **`route_inference`** (cost-aware model routing).  
Agents discover, pay (USDC via x402), call, and receive **receipts** under **per-payer budgets**.

## Surfaces

| Endpoint | Role |
|----------|------|
| `POST /mcp` | MCP Streamable HTTP (paid tools via `@x402/mcp`) |
| `POST /v1/route-inference` | Paid inference routing (HTTP + x402) |
| `POST /v1/clean-data` | Paid clean structured data feed (HTTP + x402) |
| `GET /discovery` | Free discovery / pricing metadata |
| `GET /health` | Liveness |
| `POST /v1/demo/mint-payment` | Demo payment payload mint (`DEMO_MODE=true` only) |
| `npm run start:stdio` | Stdio MCP for desktop hosts |

## Quick start (demo facilitator)

```bash
cd paid-mcp
cp .env.example .env   # DEMO_MODE=true by default
npm install
npm test
npm run build
npm start
# → http://127.0.0.1:4021/health
```

```bash
curl -s http://127.0.0.1:4021/discovery | jq .
# HTTP path without payment → 402 Payment Required
curl -si -X POST http://127.0.0.1:4021/v1/route-inference \
  -H 'content-type: application/json' \
  -d '{"task":"classify spam vs ham"}' | head -20
```

### Demo / live clients (e2e)

```bash
npm run demo:client                              # HTTP route_inference
npm run demo:client -- clean_data_feed agent_commerce
npm run live:client -- clean_data_feed --topic x402_volume
npm run demo:mcp                                 # MCP + _meta payment
npm run smoke                                    # both HTTP tools + MCP
# Live wallet (server DEMO_MODE=false, funded Base Sepolia USDC):
# PRIVATE_KEY=0x... npm run live:client -- route_inference
```

Docker / production: see [`DEPLOY.md`](./DEPLOY.md).

AETHERWEB oracle (`aetherweb/index.html`) defaults to `http://127.0.0.1:4021`.
Override: `?payBase=https://your-host`.

## Live facilitator (Base mainnet)

```env
DEMO_MODE=false
NETWORK=eip155:8453
FACILITATOR_URL=https://x402.org/facilitator
X402_PAY_TO=0x0d25A44f74868eCE53B305C97139CF4B62963410
PRICE=$0.001
```

(`PAY_TO` is an alias for `X402_PAY_TO`. The retired address `0xAB745…4423D` is rejected at startup.)

Clients must sign real x402 exact payments (EIP-3009) and attach them:

- **MCP:** `_meta["x402/payment"]` (see `@x402/mcp` clients)
- **HTTP:** payment headers per x402 Express middleware

## Receipts & budgets

- Receipts append to `RECEIPTS_DIR` as JSONL (`receipts-YYYY-MM-DD.jsonl`)
- Default budget: `DEFAULT_AGENT_BUDGET_ATOMIC` (USDC 6 decimals; `100000` = $0.10)
- Structured error code: `BUDGET_EXCEEDED`
- Facilitator failure surfaces as process start error `FACILITATOR_UNAVAILABLE`

## Architecture

```
Client ──► MCP /mcp  or  HTTP /v1/route-inference
              │
              ├─ missing payment → 402 + PaymentRequired
              ├─ verify via facilitator (demo or https://x402.org/facilitator)
              ├─ budget charge (idempotent by payment proof)
              ├─ route_inference()
              ├─ settle
              └─ receipt JSONL + response billing metadata
```

## License

MIT
