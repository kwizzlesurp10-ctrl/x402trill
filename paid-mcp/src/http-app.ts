import { randomUUID } from "node:crypto";
import express, { type Express, type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { paymentMiddleware } from "@x402/express";
import type { AppConfig } from "./config.js";
import type { BudgetStore } from "./budgets.js";
import { BudgetExceededError } from "./budgets.js";
import type { ReceiptStore } from "./receipts.js";
import type { GatewayPaymentContext } from "./resource-server.js";
import {
  amountAtomicFromAccepts,
  assetFromAccepts,
} from "./resource-server.js";
import {
  createPaidMcpServer,
  buildDiscoveryDocument,
  PAID_TOOLS,
} from "./create-mcp-server.js";
import {
  RouteInferenceArgsSchema,
  routeInference,
} from "./tools/route-inference.js";
import {
  CleanDataFeedArgsSchema,
  cleanDataFeed,
} from "./tools/clean-data-feed.js";
import { buildDemoPaymentPayload } from "./demo-facilitator.js";

type SessionRecord = {
  transport: StreamableHTTPServerTransport;
};

function handleBudget(
  budgets: BudgetStore,
  amountAtomic: string,
  req: Request,
  res: Response,
): { payer: string; proofId: string } | null {
  const payerHeader =
    (req.header("x-payment-payer") ||
      req.header("x-agent-id") ||
      "http-anonymous") as string;
  const proofId = req.header("x-payment-proof-id") || `http-${randomUUID()}`;
  try {
    budgets.charge(payerHeader, BigInt(amountAtomic), proofId);
    return { payer: payerHeader, proofId };
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      res.status(402).json({
        code: "BUDGET_EXCEEDED",
        message: err.message,
        remainingAtomic: err.remainingAtomic.toString(),
        requiredAtomic: err.requiredAtomic.toString(),
      });
      return null;
    }
    throw err;
  }
}

export function createHttpApp(opts: {
  config: AppConfig;
  payment: GatewayPaymentContext;
  budgets: BudgetStore;
  receipts: ReceiptStore;
}): Express {
  const { config, payment, budgets, receipts } = opts;
  const amountAtomic = amountAtomicFromAccepts(payment.accepts);
  const asset = assetFromAccepts(payment.accepts);
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  const sessions = new Map<string, SessionRecord>();

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: config.serviceName,
      mode: payment.mode,
      network: config.network,
      price: config.price,
      paidTools: PAID_TOOLS.map((t) => t.name),
    });
  });

  app.get("/discovery", (_req, res) => {
    res.json(buildDiscoveryDocument(config, payment, amountAtomic, asset));
  });

  app.post("/v1/demo/mint-payment", (req, res) => {
    if (payment.mode !== "demo") {
      res.status(403).json({
        code: "DEMO_DISABLED",
        message: "mint-payment only available when DEMO_MODE=true",
      });
      return;
    }
    const payer =
      typeof req.body?.payer === "string"
        ? req.body.payer
        : "0xdemo000000000000000000000000000000000001";
    const toolName =
      typeof req.body?.tool === "string" &&
      PAID_TOOLS.some((t) => t.name === req.body.tool)
        ? (req.body.tool as string)
        : "route_inference";
    const accepted = payment.accepts[0]!;
    const payload = buildDemoPaymentPayload({
      accepts: accepted,
      payer,
      resourceUrl: `mcp://tool/${toolName}`,
    });
    const paymentB64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    res.json({
      meta_key: "x402/payment",
      payment: payload,
      payment_signature_header: paymentB64,
      usage: {
        mcp: "Attach payment object as tool call _meta['x402/payment']",
        http: "Retry paid POST with header PAYMENT-SIGNATURE: <payment_signature_header>",
      },
    });
  });

  const routePrice = {
    scheme: "exact" as const,
    price: config.price,
    network: config.network as `${string}:${string}`,
    payTo: config.payTo,
    maxTimeoutSeconds: 60,
  };

  app.use(
    paymentMiddleware(
      {
        "POST /v1/route-inference": {
          accepts: routePrice,
          description:
            "Cost-aware inference routing (HTTP). Same utility as MCP route_inference.",
        },
        "POST /v1/clean-data": {
          accepts: routePrice,
          description:
            "Clean structured data feed (HTTP). Same utility as MCP clean_data_feed.",
        },
      },
      payment.resourceServer,
      undefined,
      undefined,
      !config.demoMode,
    ),
  );

  app.post("/v1/route-inference", (req: Request, res: Response) => {
    try {
      const parsed = RouteInferenceArgsSchema.parse(req.body ?? {});
      const charged = handleBudget(budgets, amountAtomic, req, res);
      if (!charged) return;

      const result = routeInference(parsed);
      const receipt = receipts.record({
        status: payment.mode === "demo" ? "demo_settled" : "settled",
        mode: payment.mode,
        toolName: "route_inference",
        resource: `${config.publicBaseUrl}/v1/route-inference`,
        payer: charged.payer,
        payTo: config.payTo,
        network: config.network,
        amountAtomic,
        priceDisplay: config.price,
        settlementId: charged.proofId,
        agentId: parsed.agent_id,
        proofId: charged.proofId,
        extra: { transport: "http" },
      });

      res.json({
        ...result,
        receipt,
        billing: {
          price: config.price,
          amountAtomic,
          network: config.network,
          payTo: config.payTo,
          mode: payment.mode,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ code: "BAD_REQUEST", message });
    }
  });

  app.post("/v1/clean-data", (req: Request, res: Response) => {
    try {
      const parsed = CleanDataFeedArgsSchema.parse(req.body ?? {});
      const charged = handleBudget(budgets, amountAtomic, req, res);
      if (!charged) return;

      const result = cleanDataFeed(parsed);
      const receipt = receipts.record({
        status: payment.mode === "demo" ? "demo_settled" : "settled",
        mode: payment.mode,
        toolName: "clean_data_feed",
        resource: `${config.publicBaseUrl}/v1/clean-data`,
        payer: charged.payer,
        payTo: config.payTo,
        network: config.network,
        amountAtomic,
        priceDisplay: config.price,
        settlementId: charged.proofId,
        agentId: parsed.agent_id,
        proofId: charged.proofId,
        extra: { transport: "http" },
      });

      res.json({
        ...result,
        receipt,
        billing: {
          price: config.price,
          amountAtomic,
          network: config.network,
          payTo: config.payTo,
          mode: payment.mode,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ code: "BAD_REQUEST", message });
    }
  });

  const mcpPost = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    try {
      let record = sessionId ? sessions.get(sessionId) : undefined;

      if (!record) {
        if (!isInitializeRequest(req.body)) {
          res.status(400).json({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Bad Request: no session; send initialize first",
            },
            id: null,
          });
          return;
        }

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            sessions.set(id, { transport });
          },
        });

        transport.onclose = () => {
          const id = transport.sessionId;
          if (id) sessions.delete(id);
        };

        const server = createPaidMcpServer({
          config,
          payment,
          budgets,
          receipts,
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      await record.transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP POST error", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  };

  const mcpGet = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const record = sessionId ? sessions.get(sessionId) : undefined;
    if (!record) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    await record.transport.handleRequest(req, res);
  };

  const mcpDelete = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const record = sessionId ? sessions.get(sessionId) : undefined;
    if (record) {
      await record.transport.close();
      sessions.delete(sessionId!);
    }
    res.status(204).end();
  };

  app.post("/mcp", mcpPost);
  app.get("/mcp", mcpGet);
  app.delete("/mcp", mcpDelete);

  return app;
}
