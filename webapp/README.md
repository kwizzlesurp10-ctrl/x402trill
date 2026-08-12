# MN Compliance Quick-Check (Next.js)

A Vercel-ready web app based on the `index_report_generator_2.html` prototype: Minnesota small-business compliance quick-check, mock scoring, “Protection Radar” UI, and a **Copy Grok prompt** flow. Business logic runs in a **server action**; inputs are validated with **Zod**.

This directory is the **Next.js app** inside a repo whose root is one level up (e.g. `/home/keef`).

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript (strict)**
- **Tailwind CSS** (no CDN in production)
- **Zod** for form payloads
- **Vitest** for unit tests (`lib/compliance/*`)

## Local development

If your shell is already in **`webapp/`**:

```bash
npm install
npm run dev
```

From the **repository root** (parent of this folder):

```bash
cd webapp && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Add `?init=1` to auto-run a demo check in the client (same idea as the static HTML’s init flag).

## Scripts

| Command         | Action              |
| --------------- | ------------------- |
| `npm run dev`   | Dev server (Turbopack) |
| `npm run build` | Production build    |
| `npm run start` | Run production      |
| `npm run test`  | Vitest              |
| `npm run lint`  | ESLint              |

## Deploy on Vercel (from GitHub)

1. **Create a new empty repository** and push the **whole repo** (root contains `webapp/` and optionally other files). See the [root README](../README.md).

2. In [Vercel](https://vercel.com) → **Import** the repository, then set **Root Directory** to **`webapp`**. Use defaults for Next.js (install + build in that directory).

3. **Environment variable (optional):** in the Vercel project, set `NEXT_PUBLIC_SITE_URL` to your production URL. See `.env.example`.

4. CI at the repo root runs `npm run lint` / `test` / `build` in `webapp` (see `../.github/workflows/ci.yml`).

## Not legal advice

The scores and checklists are **demonstration mocks**. Always confirm requirements with **MN DOLI**, **Secretary of State**, **Revenue**, and local agencies.

## License

Private / use as you like for your own deployment.
