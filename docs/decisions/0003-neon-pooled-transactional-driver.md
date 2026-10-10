# 0003: Use Neon's pooled, transactional driver for all queries

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

ADR 0002 picked Postgres (Neon) and said capacity-safe RSVP writes would
be enforced "at the database layer (a single atomic statement/transaction
that only succeeds if capacity isn't exceeded)." Implementing P3 (RSVP
with a hard capacity limit) surfaced a problem that ADR 0002 didn't
anticipate: the app was wired to `drizzle-orm/neon-http`, which talks to
Neon over one-shot HTTP requests and **does not support transactions at
all** (`db.transaction()` throws `"No transactions support in neon-http
driver"` — verified directly against the installed driver).

Without a real transaction, a capacity check and the RSVP insert can't be
combined into one race-safe operation. A naive single
`INSERT ... SELECT ... WHERE count(*) < capacity` statement is not
sufficient: Postgres's MVCC means two concurrent sessions running that
statement can each see the pre-insert count and both pass the check
before either commits, overbooking the event — exactly the one invariant
this app must never violate.

Neon supports more than the HTTP driver: it also offers a pooled
connection (their own PgBouncer-style pooler, the connection mode Neon
itself recommends for serverless/concurrent-write workloads) reachable
through a session-based driver that holds a real connection for the
duration of a request and supports `BEGIN`/`COMMIT`.

## Decision

Use `drizzle-orm/neon-serverless` (backed by `@neondatabase/serverless`'s
`Pool`, already a dependency — no new package) for **all** Neon queries,
reads and writes alike, instead of `drizzle-orm/neon-http`. `DATABASE_URL`
in production must be Neon's pooled connection string.

RSVP writes run inside a real transaction: `SELECT ... FOR UPDATE` on the
target event row (serializing concurrent RSVPs for that event), then a
fresh `COUNT` of existing RSVPs (read after the lock is held, so it's
guaranteed current), then the insert only if under capacity. This keeps
`attendeeCount` as a value derived live from `rsvps` rows for display
(per ADR 0002/`listEvents.ts`) — no cached counter column — while making
the capacity check itself race-safe.

PGlite (local dev/test) is unaffected; it already supports real
transactions.

## Alternatives considered

- **Keep `neon-http`, add a `seats_taken` counter column on `events`,
  gate it with a single `UPDATE ... WHERE seats_taken < capacity`
  statement combined with the RSVP insert in one CTE.** Would work
  without transactions and without changing the driver, but introduces a
  second, cache-like source of truth for capacity alongside the
  "always derive attendeeCount live from `rsvps`" decision already in
  `listEvents.ts` — a more surprising data model for a problem that a
  driver swap solves more directly. Declined in favor of keeping one
  source of truth.
- **Keep two drivers**: `neon-http` for the existing read-only
  queries (lower per-request latency, no connection setup) and
  `neon-serverless` only for the RSVP write. Declined for now — two
  Neon clients to configure and reason about is more moving parts than
  this app's read volume currently justifies. The HTTP driver remains a
  reasonable optimization to reintroduce for reads specifically if
  metrics ever show read latency/connection overhead that matters —
  tracked in `TODO.md`, not built speculatively now.
- **Advisory locks** (`pg_advisory_xact_lock`) instead of `SELECT ... FOR
  UPDATE` on the events row. Equivalent in effect for this schema (one
  lockable thing per event); declined only because locking the row
  Postgres is already scanning is more legible than coordinating an
  out-of-band lock key.

## Consequences

- One Neon client (pooled, transactional) for the whole app instead of
  one-per-workload. Simpler to reason about than mixing drivers, at the
  cost of giving up the HTTP driver's lower per-request overhead for the
  read-only browse/detail queries — acceptable at this app's scale; see
  `TODO.md` for revisiting if metrics justify splitting reads back out.
- `DATABASE_URL` must be Neon's **pooled** connection string in
  production, not the direct one — otherwise many serverless function
  instances can exhaust Postgres's connection limit. Documented in
  `.env.example`.
- The pattern for any future capacity- or uniqueness-sensitive write
  (e.g. an organizer-side feature) is: lock the contended row with
  `SELECT ... FOR UPDATE` inside a transaction, re-read whatever the
  check depends on *after* the lock is held, then write. Don't
  reach for a naive read-then-write check outside a transaction.
