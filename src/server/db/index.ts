import { mkdirSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

/**
 * Local dev/test has no Postgres server or Docker available, so we run
 * against PGlite (real Postgres compiled to WASM, embedded in-process).
 * Production talks to Neon through its pooled, session-based driver (not
 * the stateless HTTP one) because RSVP writes need real transactions —
 * see docs/decisions/0003-neon-pooled-transactional-driver.md. DATABASE_URL
 * should be Neon's pooled connection string (see .env.example).
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const pool = new Pool({ connectionString: url });
    return { kind: "neon" as const, db: drizzleNeon(pool, { schema }) };
  }

  const dataDir =
    process.env.NODE_ENV === "test" ? undefined : "./.pglite/dev";
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  return { kind: "pglite" as const, db: drizzlePglite(client, { schema }) };
}

export const dbResult = createDb();
export const db = dbResult.db;
export const dbKind = dbResult.kind;
