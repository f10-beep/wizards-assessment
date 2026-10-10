import { mkdirSync } from "node:fs";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

/**
 * Local dev/test has no Postgres server or Docker available, so we run
 * against PGlite (real Postgres compiled to WASM, embedded in-process) and
 * only talk to Neon's HTTP driver when DATABASE_URL points at one. See
 * docs/decisions/0002-mvp-stack.md and README "Local development".
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (url) {
    return { kind: "neon" as const, db: drizzleNeon(url, { schema }) };
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
