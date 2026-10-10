import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool as PgPool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Local dev/test runs against Postgres in Docker (see docker-compose.yml);
 * production runs against Neon through its pooled, session-based driver
 * because RSVP writes need real transactions — see
 * docs/decisions/0003-neon-pooled-transactional-driver.md and
 * docs/decisions/0004-docker-postgres-local-dev.md. Both sides are a real
 * Postgres server process with full transaction support; the branch below
 * is only about which wire protocol reaches each host.
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is required. For local dev, run `docker compose up -d` and set it to the local Postgres connection string — see .env.example and README "Local development".',
    );
  }

  if (new URL(url).hostname.endsWith(".neon.tech")) {
    const pool = new NeonPool({ connectionString: url });
    return { kind: "neon" as const, db: drizzleNeon(pool, { schema }) };
  }

  const pool = new PgPool({ connectionString: url });
  return { kind: "postgres" as const, db: drizzlePg(pool, { schema }) };
}

export const dbResult = createDb();
export const db = dbResult.db;
export const dbKind = dbResult.kind;
