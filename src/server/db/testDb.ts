import { randomUUID } from "node:crypto";
import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "./schema";

/**
 * Each test suite gets its own Postgres schema on the same Docker
 * Postgres instance tests already require — cheap to create/drop, and
 * isolates suites that run concurrently. Using a real Pool (rather than
 * PGlite's single embedded connection) means tests exercising concurrent
 * RSVP attempts go through genuinely separate connections, matching how
 * production actually serializes writes. See
 * docs/decisions/0004-docker-postgres-local-dev.md.
 */
export async function createTestDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL must point at the local Postgres container — run `docker compose up -d` (see README "Local development").',
    );
  }

  const schemaName = `test_${randomUUID().replaceAll("-", "")}`;

  const setup = new Client({ connectionString: url });
  await setup.connect();
  await setup.query(`CREATE SCHEMA "${schemaName}"`);
  await setup.end();

  // Set via the connection's startup options, not a query issued after
  // connecting — a post-connect query would race the pool handing that
  // connection out for the first real query.
  const pool = new Pool({
    connectionString: url,
    options: `-c search_path=${schemaName}`,
  });

  const db = drizzle(pool, { schema });
  // migrationsSchema matters here: drizzle's migration-tracking table
  // defaults to a fixed "drizzle" schema shared by the whole database,
  // not scoped by search_path. Without this, the first test file to run
  // marks the migration "already applied" for every later test schema,
  // which then silently gets no tables.
  await migrate(db, { migrationsFolder: "./drizzle", migrationsSchema: schemaName });

  async function cleanup() {
    await pool.end();
    const teardown = new Client({ connectionString: url });
    await teardown.connect();
    await teardown.query(`DROP SCHEMA "${schemaName}" CASCADE`);
    await teardown.end();
  }

  return { db, cleanup };
}
