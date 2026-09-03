import serverlessHttp from "serverless-http";
import { createApp } from "./app";

/**
 * AWS Lambda entrypoint (see infra/serverless.yml). API Gateway HTTP API
 * invokes this handler for every request; serverless-http adapts the
 * Lambda event/response shape to/from the plain Express app used
 * everywhere else, so route code never needs to know which environment
 * it's running in.
 *
 * Note on the Postgres pool (src/db/pool.ts): Lambda can run many
 * concurrent execution environments, each holding its own `pg.Pool`. Point
 * DATABASE_URL at a pooled connection string (Supabase's connection
 * pooler / pgbouncer, or RDS Proxy) in production rather than a direct
 * Postgres connection, or you will exhaust the database's connection
 * limit under load.
 */
export const handler = serverlessHttp(createApp());
