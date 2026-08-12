# Deploying paid-mcp

## Local Docker

```bash
cd paid-mcp
# Demo (no chain)
DEMO_MODE=true docker compose up --build

# Live Base Sepolia
export DEMO_MODE=false
export PAY_TO=0xYourReceivingAddress
export PUBLIC_BASE_URL=https://paid.example.com
docker compose up --build -d
```

With oracle:

```bash
docker compose --profile oracle up --build
# oracle: http://127.0.0.1:8765/?payBase=http://127.0.0.1:4021
```

## Environment (production)

| Variable | Notes |
|----------|--------|
| `DEMO_MODE=false` | Use real facilitator |
| `PAY_TO` | Your EIP-55 receiving address |
| `NETWORK` | `eip155:84532` (Sepolia) or `eip155:8453` (Base mainnet when ready) |
| `FACILITATOR_URL` | `https://x402.org/facilitator` or CDP facilitator |
| `PUBLIC_BASE_URL` | Public origin for discovery `httpResource` links |
| `PRICE` | e.g. `$0.001` |
| `DEFAULT_AGENT_BUDGET_ATOMIC` | Soft cap per payer (USDC 6 decimals) |

## Clients

```bash
# Demo path (server DEMO_MODE=true)
npm run demo:client
node scripts/live-client.mjs route_inference
node scripts/live-client.mjs clean_data_feed --topic x402_volume

# Live wallet (server DEMO_MODE=false, funded Base Sepolia USDC)
PRIVATE_KEY=0x... node scripts/live-client.mjs route_inference
```

## AETHERWEB production `payBase`

Host `aetherweb/index.html` on any static CDN. Open with:

```
https://oracle.example.com/?payBase=https://paid.example.com
```

Skill-pack “Settle demo” will call `${payBase}/v1/demo/mint-payment` when the gateway is in demo mode; for live gateways, use the wallet client instead of browser mint.

## Security

- Never embed `PRIVATE_KEY` in the oracle or commit it
- Bind production to TLS; do not expose demo mint on mainnet
- Rotate `PAY_TO` via env only; receipts log truncated spend, not keys
