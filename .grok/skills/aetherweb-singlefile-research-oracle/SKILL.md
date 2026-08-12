---
name: aetherweb-singlefile-research-oracle
description: >
  Generate or update a pixel-tight, accessible, dark-mode single-file HTML research
  oracle from ResearchForge / mythic research JSON (scored resource cards, contradiction
  panels, skill forge, waitlist, optional x402 paywall). Use when the user runs
  /aetherweb-singlefile-research-oracle, says "AETHERWEB", "research oracle",
  "single-file research page", or wants to regenerate aetherweb/index.html from JSON.
---

# AETHERWEB Single-File Research Oracle

## Goal

Turn a ResearchForge JSON payload into (or update) one production-ready `index.html`:

- Cinematic dark UI, neon accents, glass panels
- Filterable scored resource cards (`mythicPotential` bars)
- Contradiction resolution panels
- Skill forge cards
- Strategic path + single decisive CTA
- Optional: waitlist form (localStorage + webhook/mailto)
- Optional: x402 skill-pack paywall (demo settlement + live endpoint probe)

Hard constraints unless the user lifts them:

- **One HTML file** (Tailwind CDN + vanilla JS allowed)
- Dark-mode default, keyboard/a11y basics, `prefers-reduced-motion`
- FOSS primacy; no closed design systems
- Regenerable by overwriting a `RESEARCH` object

## Inputs

Prefer project files when present:

1. `docs/research/*.json` — research payload  
2. `aetherweb/index.html` — existing oracle template  
3. User-pasted research JSON in chat  

Required research fields:

- `researchId`, `mythicScore`, `summary`
- `topResources[]`: `name`, `url`, `type`, `why`, `mythicPotential`, optional `filter`
- `contradictionsDetected[]`: `signalA`, `signalB`, `resolution`
- `skillSuggestions[]`: `title`, `rationale`, `mythicPotential`, `evolutionPath`, `prerequisites`, `exampleInvocation`

Optional: `longTermStrategicValue`, `recommendedNextQueries`, site-spec companion JSON.

## Procedure

1. **Load** the research JSON (path or paste). Validate required fields; add `filter` tags if missing (`protocol|gateway|payment|social|data|other` from `type`).
2. **Locate** the oracle file (`aetherweb/index.html` by default). If missing, scaffold from the last known AETHERWEB structure (hero → thesis → resources → contradictions → skills → path → CTA → waitlist → paywall → footer + `CONFIG` + `RESEARCH` + render JS).
3. **Update** only:
   - `const RESEARCH = { ... }`
   - Hero copy derived from `summary` / original thesis
   - Metrics strip if volume signals exist in contradictions
   - `CONFIG.pay` / `CONFIG.webhookUrl` / `CONFIG.contactEmail` if user provided them
4. **Preserve** interaction code (filters, waitlist, pay gate) unless broken.
5. **Smoke-check**:
   - File parses as HTML
   - gzip size ideally under ~100 KB
   - Sections with ids: `thesis`, `resources`, `contradictions`, `skills`, `path`, `cta`, `early-access`, `skill-pack`
6. **Persist** a copy of the JSON under `docs/research/<researchId>.json` if not already saved.
7. Report path + how to open: `python3 -m http.server 8765 --directory aetherweb`

## Voice

- Hero / strategic path: mythic-prophetic framing  
- Cards / skills: operator-precise technical language  
- Never hype raw txn volume without the organic-volume contradiction

## Out of scope

- Multi-page SPAs or Next.js ports of the oracle (unless user explicitly requests)
- Real on-chain settlement without user-supplied pay endpoint + wallet plan
- Breaking the MN compliance `webapp/` app while regenerating the oracle
