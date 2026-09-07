# RetainAI

Agentic returns & sales recovery for Shopify merchants. Instead of a static
return form, an AI negotiator talks to the customer, checks real-time
inventory, and tries to save the sale with an exchange or upsell before
falling back to a refund.

This repo implements the architecture from the business plan end to end and
**runs fully offline out of the box** — every external dependency (Shopify,
OpenAI, DHL/FedEx/UPS) has a mock mode, so you can see the whole
return → negotiate → exchange → shipping-label loop working before wiring up
any real accounts. Flip each `*_MODE=live` env var and add credentials to
go live piece by piece.

## What's here

```
apps/
  web/          Next.js + Tailwind — merchant dashboard & customer return/chat widget
  api/          Node.js + TypeScript (Express) — Shopify OAuth/webhooks, returns API, orchestration
  ai-service/   Python + FastAPI — the AI Negotiator (GPT-4o function calling over live inventory)
packages/
  shared/       TypeScript types shared by apps/web and apps/api
  db/           Postgres/Supabase schema (SQL migrations) + demo seed data
infra/          AWS Lambda deployment (Serverless Framework) for both backend services
docker-compose.yml   Postgres + api + ai-service for local dev, in one command
```

## How the pieces fit together

1. A customer starts a return in the Shopify-embedded widget (`apps/web`'s
   `/return/[lineItemId]` → `/return/chat/[returnId]`).
2. `apps/api` creates a `return_requests` row and, on each customer message,
   forwards the conversation + order context to `apps/ai-service`.
3. `apps/ai-service` (the "AI Negotiator") calls GPT-4o with function-calling
   tools that query live inventory directly from Postgres — `check_variant_stock`,
   `find_exchange_alternatives`, `find_upsell_candidates` — then decides whether
   to propose an exchange, propose an upsell, or approve a refund.
4. If the customer accepts a proposal, `apps/api` adjusts inventory, calls the
   Shopify Admin API (or the mock store, in demo mode) to reflect the swap,
   generates a return shipping label (DHL/FedEx/UPS, or a mock label), and
   marks the return complete.
5. The merchant dashboard reads a Postgres view (`merchant_revenue_summary`)
   for the plan's headline metric: **Revenue Saved vs. Revenue Refunded**.

## What's real vs. mocked right now

| Piece | Status |
|---|---|
| Negotiation engine, state machine, DB schema, analytics | Real, fully working |
| AI Negotiator (mock mode, `AI_MODE=mock`) | Real deterministic rule-based agent — no API key needed |
| AI Negotiator (live mode, `AI_MODE=live`) | Real GPT-4o + function-calling code, needs `OPENAI_API_KEY` to exercise |
| Shopify OAuth + webhooks | Real code, needs a Partner app + dev store to exercise (`SHOPIFY_MODE=live`) |
| Shopify inventory/order mutations (exchanges) | Mocked read/write against Postgres in `SHOPIFY_MODE=mock`; live mode has the OAuth/webhook/inventory-read path working, with `applyOrderResolution`'s order-edit mutations and `adjustInventory` left as documented integration points (see comments in `apps/api/src/shopify/client.ts`) — untested against a live store |
| DHL / FedEx / UPS label generation | Real request shapes against each carrier's documented sandbox API in `apps/api/src/shipping/*Provider.ts`, **not yet exercised against live sandbox credentials** (none were available while building this) — verify field names against current docs before going live. Defaults to a mock label generator (`*_MODE=mock`) |
| AWS Lambda deployment | Real Serverless Framework config in `infra/`, not yet deployed to an actual AWS account |

Nothing here is vaporware-behind-a-mock: every "mocked" integration point has
real, complete code written against the provider's actual documented API —
it just hasn't been run against a live account, because none were available
while scaffolding this. Treat those files as a strong first draft to verify
against sandbox credentials, not as battle-tested integrations.

## Run with Docker

This is the easiest way to start the project locally. The repo already includes
Docker Compose for Postgres, the API, and the AI service, and everything runs
with mock integrations by default.

### 1) Configure environment

```bash
cp .env.example .env
```

The defaults in the example file already use mock mode (`AI_MODE=mock`,
`SHOPIFY_MODE=mock`, carrier modes set to `mock`), so you can run the project
without any real credentials.

### 2) Start the backend stack

```bash
docker compose up -d postgres ai-service api
```

This starts:

- Postgres at localhost:54329
- AI service at http://localhost:8000
- API at http://localhost:3001

### 3) Install web dependencies and start the frontend

In a separate terminal from the repo root:

```bash
npm install --workspaces
npm run build --workspace=packages/shared
npm run dev:web
```

This starts the Next.js app at http://localhost:3000.

### 4) Seed the database

If this is the first time setting up the project, seed the demo data:

```bash
npm run seed --workspace=apps/api
```

The seed script applies the SQL migrations and inserts demo records.

### 5) Open the app

Visit:

- http://localhost:3000 for the merchant dashboard and customer return flow

Then open the return flow in the UI and test the mock AI negotiation loop.

### Alternative: local-only services without Docker

If you prefer to run the API and AI service directly on your machine instead of
through Docker:

```bash
cp .env.example .env
npm install --workspaces
npm run build --workspace=packages/shared

# Postgres only
docker compose up postgres -d

# Seed DB
npm run seed --workspace=apps/api

# AI service
cd apps/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# API
npm run dev:api

# Web
npm run dev:web
```

The whole loop was verified end-to-end while building this (return created →
AI proposes an in-stock same-product exchange → customer accepts → inventory
adjusted → mock shipping label generated → analytics view updated).

## Going live, piece by piece

Each integration turns on independently via its own `*_MODE=live` env var —
you don't need everything at once:

- **AI**: set `AI_MODE=live` and `OPENAI_API_KEY` to use real GPT-4o instead
  of the rule-based mock negotiator.
- **Shopify**: create a Partner app, set `SHOPIFY_MODE=live`,
  `SHOPIFY_API_KEY`/`SHOPIFY_API_SECRET`, and `SHOPIFY_APP_URL` to your
  deployed API URL. Install on a dev store via `GET /auth/shopify?shop=your-dev-store.myshopify.com`.
- **Shipping**: set `DHL_MODE` / `FEDEX_MODE` / `UPS_MODE` to `live` with that
  carrier's sandbox credentials once you have them.
- **Database**: point `DATABASE_URL` at a real Supabase project and run
  `packages/db/migrations/*.sql` against it (`002_rls_supabase.sql` is a
  no-op until it detects Supabase's `auth` schema, so it's safe to run
  against plain Postgres too).

See `infra/README.md` for deploying `apps/api` and `apps/ai-service` to AWS
Lambda per the plan's "serverless to minimize idle costs" goal.

## Notable design decisions / demo simplifications

- **Alternatives ranking**: an "exchange" always prefers another variant of
  the *same product* (e.g. a different size) over an unrelated product from
  the same store, ranked by in-stock quantity as a tiebreaker. An "upsell"
  looks at any in-stock variant priced at or above the returned item. Both
  are intentionally simple placeholders for what a real system would do with
  product taxonomy/embeddings-based similarity.
- **Single source of truth for inventory writes**: only `apps/api` ever
  mutates inventory or order state; `apps/ai-service` only *reads* (via the
  function-calling tools) so there's no risk of the two services racing each
  other on a write.
- **Two Lambda deployment shapes**: the Node API deploys as a zip-packaged
  Lambda (`serverless-http` wrapping the same Express app used locally); the
  Python AI service deploys as a container-image Lambda, because
  `psycopg2`/`openai`'s native pieces are painful to get right in a Lambda
  zip + layer.
