# 0004: Local dev/test on Docker Postgres, replacing PGlite

- **Status:** Accepted
- **Date:** 2026-10-10

## Context

ADR 0002/0003 settled on PGlite (real Postgres compiled to WASM, embedded
in-process) for local dev and tests, specifically because the environment
those stories were built in had no Docker or local Postgres server
available. That constraint turned out not to be real — Docker is
available on the actual development machine, it just wasn't present in
the sandbox those earlier sessions ran in.

With that constraint lifted, PGlite's downside became the deciding
factor: verifying stories against it surfaced friction attributable to
its relative immaturity compared to a real Postgres server process —
exactly the kind of local/production mismatch ADR 0002's "Postgres
(Neon)" decision was meant to avoid. PGlite is real Postgres, but running
it compiled to WASM in-process is a meaningfully different runtime
environment than the server process both this app's tests and production
actually run against.

## Decision

Local dev and tests run against Postgres in Docker
(`docker-compose.yml`, official `postgres` image) instead of PGlite.
`@electric-sql/pglite` is removed as a dependency.

`src/server/db/index.ts` picks a driver by `DATABASE_URL`'s hostname:
a Neon hostname (`*.neon.tech`) uses `drizzle-orm/neon-serverless` per
ADR 0003; anything else (the local Docker container) uses
`drizzle-orm/node-postgres` (the `pg` package) — a real TCP connection to
a real `postgres` server process, with full transaction support, the
same engine production runs.

Tests (`*.test.ts`) connect to that same Docker Postgres instance, each
creating its own Postgres schema (via `CREATE SCHEMA`, a random name) to
run its migrations and fixtures in isolation, then drop that schema on
completion — so test files remain independent of each other without
needing a dedicated database per file.

## Alternatives considered

- **Neon dev branch for local dev** (point `DATABASE_URL` at a branch of
  the same Neon project instead of running anything locally). Avoids
  local infrastructure entirely and uses the same driver as production
  everywhere, but makes local dev and tests depend on network access to
  a cloud resource — a worse fit for a project meant to run and verify
  entirely offline. Declined; Docker Postgres is self-contained and
  deterministic, which matters more here.
- **Plain user-space Postgres binary** (no Docker, run `postgres`/`initdb`
  from a downloaded build in a local data directory). Avoids a Docker
  dependency, but is more manual to set up and tear down than
  `docker compose up -d`/`down`, and Docker is the more widely
  understood, standard way to run a disposable local Postgres. Declined
  once Docker was confirmed available.
- **Keep PGlite, work around its rough edges as they come up.** Declined
  — the whole point of this decision is to stop debugging
  environment-specific PGlite behavior that doesn't reproduce against
  real Postgres, now that there's no constraint forcing that tradeoff.

## Consequences

- Local dev and `npm test` now require Docker running
  (`docker compose up -d`) — there is no longer a zero-dependency,
  always-available local database. Documented in README "Local
  development".
- `DATABASE_URL` is now required in every environment; there's no longer
  an implicit embedded-database fallback when it's unset.
- `src/server/db/index.ts` still branches on two drivers (Neon vs. local
  Postgres), same shape as before — but now both sides are a real
  Postgres server process reached over a real wire protocol, not one
  WASM-embedded engine and one networked one. The ADR 0003 rationale for
  keeping Neon's pooled driver in production is unaffected by this
  change.
- Test isolation is per-schema rather than per-process, since all test
  files now share one running Postgres container. If test files ever
  need true isolation at the data level too (e.g. different Postgres
  versions or extensions), that would need to be revisited — not a need
  today.
