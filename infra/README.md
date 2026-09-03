# Deploying RetainAI to AWS Lambda

The business plan calls for "AWS Lambda (Serverless) to minimize idle
costs." This directory has the [Serverless Framework](https://www.serverless.com/)
config for both backend services; the Next.js dashboard (`apps/web`)
deploys separately (Vercel is the path of least resistance for Next.js;
it is not part of this infra config).

## Prerequisites

```bash
npm install -g serverless
aws configure   # needs credentials for the target AWS account
```

You'll also want a Postgres connection string that tolerates many short-lived
connections from concurrent Lambda executions — **Supabase's connection
pooler** (port 6543, `?pgbouncer=true`) or **RDS Proxy**, not a direct
Postgres connection. Both Lambda entrypoints (`apps/api/src/lambda.ts`,
`apps/ai-service/app/lambda_handler.py`) call this out where the pool is
created.

## 1. Node API → zip-packaged Lambda

```bash
cd apps/api
npm run build                 # emits dist/
serverless deploy --config ../../infra/serverless.yml --stage prod
```

This deploys `dist/lambda.handler` (an Express app wrapped with
`serverless-http`) behind an API Gateway HTTP API. Set the environment
variables listed in `infra/serverless.yml` (`DATABASE_URL`,
`SHOPIFY_API_KEY`/`SECRET`, carrier credentials, etc.) in your shell or a
`.env` picked up by `serverless-dotenv-plugin` before deploying — none of
them are hardcoded in the config.

## 2. AI Negotiator → container-image Lambda

Deployed as a container image rather than a zip because `psycopg2` and
`openai`'s native/binary pieces are painful to get right in a Lambda zip +
layer. The image is built from `apps/ai-service/Dockerfile.lambda` (based
on the official `public.ecr.aws/lambda/python` runtime — separate from
`Dockerfile`, which targets docker-compose/ECS/plain Docker).

```bash
cd apps/ai-service
serverless deploy --config ../../infra/serverless-ai.yml --stage prod
```

`serverless` builds the image, pushes it to a Serverless-managed ECR repo,
and points the Lambda function at it.

## 3. Wire the two together + Shopify

After both deploy, `serverless deploy` prints each function's HTTP API
URL. Set:

- `AI_SERVICE_URL` on the API Lambda to the AI service's URL.
- `SHOPIFY_APP_URL` on the API Lambda to the API's own public URL (used to
  build the OAuth callback and the post-install dashboard redirect).
- In your Shopify Partner app settings, set the App URL / redirect URL to
  match `SHOPIFY_APP_URL` and `SHOPIFY_APP_URL + /auth/shopify/callback`.
- Point Shopify's `orders/create` and `app/uninstalled` webhooks at
  `<api-url>/webhooks/shopify/orders-create` and `.../app-uninstalled`.

## 4. Database

Run the migrations once against whatever Postgres you're pointing
`DATABASE_URL` at (a real Supabase project in production):

```bash
psql "$DATABASE_URL" -f packages/db/migrations/001_init.sql
psql "$DATABASE_URL" -f packages/db/migrations/002_rls_supabase.sql
```

(`002_rls_supabase.sql` is a safe no-op on plain Postgres — it only
activates when it detects Supabase's `auth` schema.)

## Alternative: containers instead of Lambda

Everything above also runs perfectly well as long-lived containers (ECS
Fargate, Fly.io, Render, a single VPS via `docker-compose.yml` at the repo
root) if Lambda's cold starts or the pooled-Postgres requirement are an
issue at your scale — `apps/api/Dockerfile` and `apps/ai-service/Dockerfile`
are the same images either way; only the entrypoint differs.
