import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_PAYMENT_RESPONSE_META_KEY } from "@x402/mcp";
import type { AppConfig } from "./config.js";
import type { BudgetStore } from "./budgets.js";
import type { ReceiptStore } from "./receipts.js";
import type { GatewayPaymentContext } from "./resource-server.js";
import {
  amountAtomicFromAccepts,
  assetFromAccepts,
} from "./resource-server.js";
import {
  routeInference,
  routeInferenceInputSchema,
  RouteInferenceArgsSchema,
} from "./tools/route-inference.js";
import {
  cleanDataFeed,
  cleanDataFeedInputSchema,
  CleanDataFeedArgsSchema,
} from "./tools/clean-data-feed.js";
import {
  billingBlock,
  createPaidToolWrapper,
} from "./paid-tool.js";

export const PAID_TOOLS = [
  {
    name: "route_inference",
    httpPath: "/v1/route-inference",
    description:
      "Cost-aware inference routing for multi-agent systems (high-frequency utility)",
    tags: ["inference", "routing", "x402", "aetherweb"],
  },
  {
    name: "clean_data_feed",
    httpPath: "/v1/clean-data",
    description:
      "Clean structured data feed (agent commerce / pricing / reputation signals)",
    tags: ["data", "feeds", "x402", "aetherweb"],
  },
] as const;

export function createPaidMcpServer(opts: {
  config: AppConfig;
  payment: GatewayPaymentContext;
  budgets: BudgetStore;
  receipts: ReceiptStore;
}): McpServer {
  const { config, payment, budgets, receipts } = opts;
  const amountAtomic = amountAtomicFromAccepts(payment.accepts);
  const asset = assetFromAccepts(payment.accepts);

  const mcp = new McpServer({
    name: config.serviceName,
    version: "0.1.0",
  });

  const paidRoute = createPaidToolWrapper({
    config,
    payment,
    budgets,
    receipts,
    toolName: "route_inference",
    description:
      "Cost-aware inference routing recommendations for multi-agent systems",
    tags: ["inference", "routing", "x402", "aetherweb"],
  });

  const paidData = createPaidToolWrapper({
    config,
    payment,
    budgets,
    receipts,
    toolName: "clean_data_feed",
    description:
      "Clean structured high-frequency data for agents (deterministic synthetic feeds)",
    tags: ["data", "feeds", "x402", "aetherweb"],
  });

  mcp.tool(
    "ping",
    "Health check (free). Returns service mode and network.",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ok: true,
            service: config.serviceName,
            mode: payment.mode,
            network: config.network,
            price: config.price,
            paidTools: PAID_TOOLS.map((t) => t.name),
          }),
        },
      ],
    }),
  );

  mcp.tool(
    "get_pricing",
    "Discovery metadata for paid tools (free).",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            buildDiscoveryDocument(config, payment, amountAtomic, asset),
            null,
            2,
          ),
        },
      ],
    }),
  );

  mcp.tool(
    "route_inference",
    `Paid (${config.price}): cost-aware model route for a sub-task.`,
    routeInferenceInputSchema,
    paidRoute(async (args) => {
      const parsed = RouteInferenceArgsSchema.parse(args);
      const result = routeInference(parsed);
      const body = {
        ...result,
        billing: billingBlock(config, payment, "route_inference", amountAtomic),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(body, null, 2) }],
        structuredContent: body,
      };
    }),
  );

  mcp.tool(
    "clean_data_feed",
    `Paid (${config.price}): clean structured data rows for a topic/window.`,
    cleanDataFeedInputSchema,
    paidData(async (args) => {
      const parsed = CleanDataFeedArgsSchema.parse(args);
      const result = cleanDataFeed(parsed);
      const body = {
        ...result,
        billing: billingBlock(config, payment, "clean_data_feed", amountAtomic),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(body, null, 2) }],
        structuredContent: body,
      };
    }),
  );

  if (payment.mode === "demo") {
    mcp.tool(
      "demo_payment_hint",
      "DEMO only: explains how to attach a demo x402 payment payload in _meta.",
      {},
      async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                meta_key: "x402/payment",
                note: "POST /v1/demo/mint-payment then retry tool call with payment in MCP _meta, or use scripts/live-client.mjs with PRIVATE_KEY.",
                network: config.network,
                price: config.price,
                amountAtomic,
                asset,
                payTo: config.payTo,
                paidTools: PAID_TOOLS.map((t) => t.name),
                response_meta_key: MCP_PAYMENT_RESPONSE_META_KEY,
              },
              null,
              2,
            ),
          },
        ],
      }),
    );
  }

  return mcp;
}

export function buildDiscoveryDocument(
  config: AppConfig,
  payment: GatewayPaymentContext,
  amountAtomic: string,
  asset: string,
) {
  const paidMeta = PAID_TOOLS.map((t) => ({
    name: t.name,
    paid: true as const,
    price: config.price,
    amountAtomic,
    asset,
    scheme: "exact",
    network: config.network,
    resource: `mcp://tool/${t.name}`,
    httpResource: `${config.publicBaseUrl}${t.httpPath}`,
    description: t.description,
    errors: [
      "PAYMENT_REQUIRED",
      "BUDGET_EXCEEDED",
      "FACILITATOR_UNAVAILABLE",
    ],
  }));

  return {
    service: config.serviceName,
    version: "0.1.0",
    mode: payment.mode,
    facilitator:
      payment.mode === "demo" ? "demo://local" : config.facilitatorUrl,
    network: config.network,
    payTo: config.payTo,
    tools: [
      { name: "ping", paid: false, description: "Health check" },
      { name: "get_pricing", paid: false, description: "Discovery / pricing" },
      ...paidMeta,
    ],
    accepts: payment.accepts,
  };
}
