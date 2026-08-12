#!/usr/bin/env node
/**
 * Inject ResearchForge JSON into aetherweb/index.html RESEARCH object.
 * Usage:
 *   node aetherweb/scripts/inject-research.mjs docs/research/mythic_agent_profit_layers_20260812.json
 *   node aetherweb/scripts/inject-research.mjs path/to/research.json aetherweb/index.html
 */
import fs from "node:fs";
import path from "node:path";

const researchPath = process.argv[2];
const htmlPath = process.argv[3] || path.join(process.cwd(), "aetherweb/index.html");

if (!researchPath) {
  console.error("Usage: node inject-research.mjs <research.json> [index.html]");
  process.exit(1);
}

const research = JSON.parse(fs.readFileSync(researchPath, "utf8"));

// Normalize filters for cards
if (Array.isArray(research.topResources)) {
  for (const r of research.topResources) {
    if (r.filter) continue;
    const t = `${r.type || ""} ${r.name || ""}`.toLowerCase();
    if (t.includes("protocol") || t.includes("x402")) r.filter = "protocol";
    else if (t.includes("gateway") || t.includes("inference") || t.includes("proxy") || t.includes("litellm")) r.filter = "gateway";
    else if (t.includes("payment") || t.includes("pay")) r.filter = "payment";
    else if (t.includes("social") || t.includes("nostr") || t.includes("swarm")) r.filter = "social";
    else if (t.includes("data") || t.includes("mcp") || t.includes("feed")) r.filter = "data";
    else r.filter = "data";
  }
}

const payload = {
  researchId: research.researchId,
  mythicScore: research.mythicScore,
  siteSpecId: research.siteSpecId || research.researchId,
  topResources: research.topResources || [],
  contradictionsDetected: research.contradictionsDetected || [],
  skillSuggestions: research.skillSuggestions || []
};

let html = fs.readFileSync(htmlPath, "utf8");
const re = /const RESEARCH = \{[\s\S]*?\n    \};/;
if (!re.test(html)) {
  console.error("Could not find `const RESEARCH = { ... };` block in", htmlPath);
  process.exit(2);
}

const replacement = `const RESEARCH = ${JSON.stringify(payload, null, 2).replace(/\n/g, "\n    ")};`;
html = html.replace(re, replacement);
fs.writeFileSync(htmlPath, html);
console.log(`Injected ${research.researchId || researchPath} → ${htmlPath}`);
console.log(`Resources: ${payload.topResources.length}, skills: ${payload.skillSuggestions.length}`);
